"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit, diff } from "@/lib/admin/audit";
import { one, q } from "@/lib/admin/db";
import { isPartnerStatus, normalizePhone, PARTNER_STATUSES, promoFrom, REPORT_STATUSES, type Partner } from "@/lib/admin/partners";
import { DEFAULTS } from "@/lib/cms/registry";

type Result = { ok: boolean; message?: string; id?: string };
export type PartnerInput = { full_name: string; phone: string; email: string; specialty: string; city: string; status: string; promo_code: string; certificate_no: string; payout_method: string; fee: string; notes: string };

const t = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function clean(input: PartnerInput) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Телефон: 10 цифр после +7 — по нему партнёр входит в кабинет");
  const full_name = t(input.full_name, 160);
  if (!full_name) throw new Error("Укажите фамилию и имя");
  if (!isPartnerStatus(input.status)) throw new Error("Неизвестный статус");
  const promo = t(input.promo_code, 30).toUpperCase();
  if (promo && !/^[A-Z0-9-]{3,30}$/.test(promo)) throw new Error("Промокод: латиница, цифры и дефис");
  const fee = input.fee.trim() === "" ? null : Number(input.fee);
  if (fee !== null && (!Number.isInteger(fee) || fee < 0)) throw new Error("Вознаграждение — целое число рублей");
  return {
    full_name, phone, email: t(input.email, 200), specialty: t(input.specialty, 120), city: t(input.city, 120), status: input.status,
    promo_code: promo || null, certificate_no: t(input.certificate_no, 60), payout_method: t(input.payout_method, 200), fee, notes: t(input.notes, 4000),
  };
}

async function uniqueError(error: unknown): Promise<string | null> {
  const msg = error instanceof Error ? error.message : "";
  if (msg.includes("partners_phone_unique")) return "Партнёр с таким телефоном уже есть";
  if (msg.includes("partners_code_unique")) return "Такой промокод уже занят";
  return null;
}

export async function savePartner(id: string | null, input: PartnerInput): Promise<Result> {
  const staff = await assertStaff("partners");
  let data;
  try { data = clean(input); } catch (error) { return { ok: false, message: (error as Error).message }; }
  if (!data.promo_code && data.status !== "applied" && data.status !== "rejected") data.promo_code = promoFrom(data.full_name);
  try {
    if (!id) {
      const [row] = await q<{ id: string }>(
        `INSERT INTO partners (full_name, phone, email, specialty, city, status, promo_code, certificate_no, payout_method, fee, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [data.full_name, data.phone, data.email, data.specialty, data.city, data.status, data.promo_code, data.certificate_no, data.payout_method, data.fee, data.notes],
      );
      await audit(staff, { action: "create", entity: "partner", entityId: row.id, summary: `Добавлен партнёр ${data.full_name}`, after: data });
      revalidatePath("/admin/partners");
      return { ok: true, id: row.id, message: "Партнёр добавлен" };
    }
    const before = await one<Partner>("SELECT * FROM partners WHERE id = $1", [id]);
    if (!before) return { ok: false, message: "Партнёр не найден" };
    const d = diff(before as unknown as Record<string, unknown>, data);
    if (!d.changed) return { ok: true, message: "Изменений нет" };
    await q(
      `UPDATE partners SET full_name=$2, phone=$3, email=$4, specialty=$5, city=$6, status=$7, promo_code=$8, certificate_no=$9,
              payout_method=$10, fee=$11, notes=$12, updated_at=now() WHERE id=$1`,
      [id, data.full_name, data.phone, data.email, data.specialty, data.city, data.status, data.promo_code, data.certificate_no, data.payout_method, data.fee, data.notes],
    );
    const statusNote = before.status !== data.status ? `: ${PARTNER_STATUSES[before.status]} → ${PARTNER_STATUSES[data.status]}` : "";
    await audit(staff, { action: "update", entity: "partner", entityId: id, summary: `Партнёр ${data.full_name}${statusNote}`, before: d.before, after: d.after });
    revalidatePath(`/admin/partners/${id}`);
    return { ok: true, id, message: "Сохранено" };
  } catch (error) {
    const known = await uniqueError(error);
    if (known) return { ok: false, message: known };
    throw error;
  }
}

/** An application from /partner/apply (lead of kind «partner») becomes a partner card. */
export async function partnerFromLead(leadId: string, status: "approved" | "rejected"): Promise<Result> {
  const staff = await assertStaff("partners");
  const lead = await one<{ id: string; name: string; email: string; phone: string; city: string; payload: Record<string, unknown> }>("SELECT * FROM leads WHERE id = $1 AND kind = 'partner'", [leadId]);
  if (!lead) return { ok: false, message: "Анкета не найдена" };
  if (status === "rejected") {
    await q("UPDATE leads SET status = 'done', closed_at = now(), updated_at = now() WHERE id = $1", [leadId]);
    await q("INSERT INTO lead_notes (lead_id, author_id, author_name, text) VALUES ($1, $2, $3, 'Анкета партнёра отклонена')", [leadId, staff.id, staff.name || staff.email]);
    await audit(staff, { action: "reject", entity: "partner", entityId: leadId, summary: `Анкета партнёра ${lead.name} отклонена` });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Анкета отклонена" };
  }
  const result = await savePartner(null, {
    full_name: lead.name, phone: lead.phone, email: lead.email, specialty: String(lead.payload.specialty ?? ""), city: lead.city,
    status: "approved", promo_code: "", certificate_no: String(lead.payload.certificate ?? ""), payout_method: "", fee: "", notes: "",
  });
  if (!result.ok || !result.id) return result;
  await q("UPDATE partners SET lead_id = $2 WHERE id = $1", [result.id, leadId]);
  await q("UPDATE leads SET status = 'done', closed_at = now(), updated_at = now() WHERE id = $1", [leadId]);
  await q("INSERT INTO lead_notes (lead_id, author_id, author_name, text) VALUES ($1, $2, $3, 'Партнёр одобрен, карточка создана')", [leadId, staff.id, staff.name || staff.email]);
  revalidatePath("/admin", "layout");
  return { ok: true, id: result.id, message: "Партнёр одобрен" };
}

async function defaultFee(partnerId: string): Promise<number> {
  const p = await one<{ fee: number | null }>("SELECT fee FROM partners WHERE id = $1", [partnerId]);
  if (p?.fee != null) return p.fee;
  const row = await one<{ value: number }>("SELECT value FROM site_content WHERE key = 'prices.partnerFee'");
  return Number(row?.value ?? DEFAULTS["prices.partnerFee"]);
}

export async function addReport(partnerId: string, input: { number: string; client: string; lab: string; date: string; status: string }): Promise<Result> {
  const staff = await assertStaff("partners");
  const number = t(input.number, 40).toUpperCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(number)) return { ok: false, message: "Номер отчёта: например FOX-2026-004182" };
  if (!(input.status in REPORT_STATUSES)) return { ok: false, message: "Неизвестный статус" };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null;
  const fee = input.status === "credited" ? await defaultFee(partnerId) : 0;
  try {
    await q(
      "INSERT INTO partner_reports (partner_id, report_number, client_name, lab, test_date, status, fee) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [partnerId, number, t(input.client, 120), t(input.lab, 80), date, input.status, fee],
    );
  } catch (error) {
    if ((error as Error).message.includes("partner_reports_number_unique")) return { ok: false, message: "Этот отчёт уже привязан к партнёру" };
    throw error;
  }
  await audit(staff, { action: "report", entity: "partner", entityId: partnerId, summary: `Отчёт ${number} привязан к партнёру`, after: { ...input, fee } });
  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true, message: "Отчёт добавлен" };
}

export async function setReportStatus(reportId: string, status: string): Promise<Result> {
  const staff = await assertStaff("partners");
  if (!(status in REPORT_STATUSES)) return { ok: false, message: "Неизвестный статус" };
  const r = await one<{ partner_id: string; report_number: string; status: string; fee: number }>("SELECT partner_id, report_number, status, fee FROM partner_reports WHERE id = $1", [reportId]);
  if (!r) return { ok: false, message: "Отчёт не найден" };
  const fee = status === "credited" ? (r.fee || (await defaultFee(r.partner_id))) : 0;
  await q("UPDATE partner_reports SET status = $2, fee = $3 WHERE id = $1", [reportId, status, fee]);
  await audit(staff, { action: "report_status", entity: "partner", entityId: r.partner_id, summary: `Отчёт ${r.report_number}: ${REPORT_STATUSES[r.status as keyof typeof REPORT_STATUSES]} → ${REPORT_STATUSES[status as keyof typeof REPORT_STATUSES]}`, before: { status: r.status, fee: r.fee }, after: { status, fee } });
  revalidatePath(`/admin/partners/${r.partner_id}`);
  return { ok: true };
}

export async function deleteReport(reportId: string): Promise<Result> {
  const staff = await assertStaff("partners");
  const r = await one<{ partner_id: string; report_number: string }>("DELETE FROM partner_reports WHERE id = $1 RETURNING partner_id, report_number", [reportId]);
  if (!r) return { ok: false, message: "Отчёт не найден" };
  await audit(staff, { action: "report_delete", entity: "partner", entityId: r.partner_id, summary: `Отчёт ${r.report_number} отвязан от партнёра` });
  revalidatePath(`/admin/partners/${r.partner_id}`);
  return { ok: true };
}

export async function addPayout(partnerId: string, input: { period: string; amount: number; reports: number }): Promise<Result> {
  const staff = await assertStaff("partners");
  const period = t(input.period, 60);
  if (!period) return { ok: false, message: "Укажите период, например «сентябрь 2026»" };
  if (!Number.isInteger(input.amount) || input.amount <= 0) return { ok: false, message: "Сумма — целое число рублей больше нуля" };
  await q("INSERT INTO partner_payouts (partner_id, period, amount, reports) VALUES ($1,$2,$3,$4)", [partnerId, period, input.amount, Math.max(0, input.reports | 0)]);
  await audit(staff, { action: "payout", entity: "partner", entityId: partnerId, summary: `Выплата ${input.amount} ₽ за ${period} — в обработке` });
  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true, message: "Выплата создана" };
}

export async function markPaid(payoutId: string): Promise<Result> {
  const staff = await assertStaff("partners");
  const r = await one<{ partner_id: string; amount: number; period: string }>(
    "UPDATE partner_payouts SET status = 'paid', paid_at = now() WHERE id = $1 AND status = 'pending' RETURNING partner_id, amount, period", [payoutId],
  );
  if (!r) return { ok: false, message: "Выплата уже отмечена" };
  await audit(staff, { action: "payout_paid", entity: "partner", entityId: r.partner_id, summary: `Выплата ${r.amount} ₽ за ${r.period} — выплачено` });
  revalidatePath(`/admin/partners/${r.partner_id}`);
  return { ok: true, message: "Отмечено как выплачено" };
}
