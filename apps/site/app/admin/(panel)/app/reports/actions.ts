"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertStaff, type Staff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { callWeb, isZone, medicalGrant, type Zone } from "@/lib/admin/app";
import { one, q, tx } from "@/lib/admin/db";

export type ReportResult = { ok: boolean; message?: string };

const UUID = /^[0-9a-f-]{36}$/i;

type Report = { id: string; client_id: string; user_id: string | null; status: string };

async function report(id: string): Promise<Report | null> {
  if (!UUID.test(id)) return null;
  return one<Report>("SELECT r.id, r.client_id, c.user_id, r.status FROM reports r JOIN clients c ON c.id = r.client_id WHERE r.id = $1", [id]);
}

async function review(staff: Staff, reportId: string, action: string, note = "", before?: unknown, after?: unknown) {
  await q(
    "INSERT INTO report_reviews (report_id, staff_id, staff_name, action, note, before, after) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [reportId, staff.id, staff.name || staff.email, action, note, before === undefined ? null : JSON.stringify(before), after === undefined ? null : JSON.stringify(after)],
  );
}

type WebResult = { ok: boolean; error?: string; status?: string; parsed?: number; counts?: { green: number; yellow: number; red: number }; planRebuilt?: boolean };

async function web(id: string, mode: "parse" | "plan"): Promise<WebResult> {
  try {
    const res = await callWeb(`/internal/reports/${id}/reprocess`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) });
    if (res.status === 404) return { ok: false, error: "Сервер приложения не принял запрос: проверьте, что он обновлён и у сайта тот же SESSION_SECRET" };
    return (await res.json()) as WebResult;
  } catch (error) {
    console.error("[admin] reprocess call failed", error);
    return { ok: false, error: error instanceof Error && error.message.startsWith("Не задан") ? error.message : "Сервер приложения не отвечает" };
  }
}

export async function reprocessReport(id: string): Promise<ReportResult> {
  const staff = await assertStaff("app_reports");
  const r = await report(id);
  if (!r) return { ok: false, message: "Отчёт не найден" };
  const res = await web(id, "parse");
  await review(staff, id, "reprocess", res.ok ? `Распознано ${res.parsed}, статус ${res.status}` : res.error ?? "ошибка");
  await audit(staff, { action: "reprocess", entity: "report", entityId: id, summary: res.ok ? `Отчёт обработан заново: ${res.parsed} антигенов${res.planRebuilt ? ", план пересобран" : ""}` : `Повторная обработка не удалась: ${res.error}` });
  revalidatePath(`/admin/app/reports/${id}`);
  return res.ok
    ? { ok: true, message: `Готово: ${res.parsed} антигенов, красных ${res.counts?.red ?? 0}${res.planRebuilt ? ". План клиента пересобран" : ""}` }
    : { ok: false, message: res.error ?? "Не получилось" };
}

/** Bulk form on the list: the checked reports one by one, then back to the list. */
export async function reprocessMany(form: FormData): Promise<void> {
  const staff = await assertStaff("app_reports");
  const ids = form.getAll("ids").map(String).filter((id) => UUID.test(id)).slice(0, 50);
  let ok = 0;
  for (const id of ids) {
    const res = await web(id, "parse");
    await review(staff, id, "reprocess", res.ok ? `Распознано ${res.parsed}, статус ${res.status}` : res.error ?? "ошибка");
    if (res.ok) ok++;
  }
  if (ids.length) await audit(staff, { action: "reprocess", entity: "report", entityId: ids.join(","), summary: `Повторная обработка пачкой: ${ok} из ${ids.length}` });
  revalidatePath("/admin/app/reports");
  redirect("/admin/app/reports?queue=1");
}

export async function decideReport(id: string, decision: "approve" | "reject", note: string): Promise<ReportResult> {
  const staff = await assertStaff("app_reports");
  const r = await report(id);
  if (!r) return { ok: false, message: "Отчёт не найден" };
  const clean = note.trim().slice(0, 1000);
  if (decision === "reject" && clean.length < 3) return { ok: false, message: "Напишите, что не так с отчётом" };
  const status = decision === "approve" ? "ready" : "failed";
  await tx(async (c) => {
    await c.query("UPDATE reports SET status = $2, reviewed_at = now(), reviewed_by = $3, review_note = $4, updated_at = now() WHERE id = $1", [id, status, staff.id, clean || null]);
    await audit(staff, { action: decision, entity: "report", entityId: id, summary: decision === "approve" ? "Отчёт проверен и одобрен" : `Отчёт отклонён: ${clean}`, before: { status: r.status }, after: { status } }, c);
  });
  await review(staff, id, decision, clean);
  revalidatePath(`/admin/app/reports/${id}`);
  return { ok: true, message: decision === "approve" ? "Отчёт одобрен" : "Отчёт отклонён" };
}

export type ValueChange = { id: string; value: number | null; zone: Zone };

/** Hand corrections of values and zones. Needs the medical grant for this client; the plan can follow right away. */
export async function saveValues(id: string, changes: ValueChange[], rebuild: boolean): Promise<ReportResult> {
  const staff = await assertStaff("medical");
  const r = await report(id);
  if (!r) return { ok: false, message: "Отчёт не найден" };
  if (!(await medicalGrant(staff, r.client_id))) return { ok: false, message: "Доступ к медданным истёк, откройте его снова" };
  const clean = changes
    .filter((c) => UUID.test(c.id) && isZone(c.zone) && (c.value === null || (Number.isFinite(c.value) && c.value >= 0 && c.value < 10_000)))
    .slice(0, 400);
  if (!clean.length) return { ok: false, message: "Нечего сохранять" };
  const diff = await tx(async (c) => {
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const ch of clean) {
      const { rows } = await c.query(
        `SELECT t.value_ug_ml AS old_value, t.zone AS old_zone, f.fox_name
           FROM test_results t JOIN food_items f ON f.id = t.food_item_id WHERE t.id = $1 AND t.report_id = $2 FOR UPDATE OF t`,
        [ch.id, id],
      );
      if (rows[0]) await c.query("UPDATE test_results SET value_ug_ml = $2, zone = $3 WHERE id = $1", [ch.id, ch.value, ch.zone]);
      if (rows[0]) {
        before[rows[0].fox_name] = { value: rows[0].old_value == null ? null : Number(rows[0].old_value), zone: rows[0].old_zone };
        after[rows[0].fox_name] = { value: ch.value, zone: ch.zone };
      }
    }
    await c.query("UPDATE reports SET updated_at = now() WHERE id = $1", [id]);
    return { before, after };
  });
  const n = Object.keys(diff.after).length;
  await review(staff, id, "edit", `Исправлено значений: ${n}`, diff.before, diff.after);
  // The log keeps only the count: values are medical data and stay in report_reviews.
  await audit(staff, { action: "edit", entity: "report", entityId: id, summary: `Исправлено значений в отчёте: ${n}` });
  let planNote = "";
  if (rebuild) {
    const res = await web(id, "plan");
    planNote = res.ok ? (res.planRebuilt ? ". План клиента пересобран" : ". Активного плана по этому отчёту нет") : `. План не пересобран: ${res.error}`;
  }
  revalidatePath(`/admin/app/reports/${id}`);
  return { ok: true, message: `Сохранено: ${n}${planNote}` };
}

export async function addReportNote(id: string, note: string): Promise<ReportResult> {
  const staff = await assertStaff("app_reports");
  if (!(await report(id))) return { ok: false, message: "Отчёт не найден" };
  const clean = note.trim().slice(0, 1000);
  if (!clean) return { ok: false, message: "Пустая заметка" };
  await review(staff, id, "note", clean);
  revalidatePath(`/admin/app/reports/${id}`);
  return { ok: true };
}
