import type { Pool } from "pg";
import { inTx, queueEvent, requirePartnerPool } from "./db";
import { openJson, pdEnabled, storeSealedFile } from "./seal";
import { readUpload } from "./onboarding";
import { actNumber, monthLabel, type Statement } from "./shared";

export type { Statement };

/* БПИТ10.1.1 on the partner's side: send an analysis (photo + id code), answer the monthly report, send the signed
   act. Staff confirm the code (Raptor later), the accountant takes the act and pays (apps/site /admin/partners). */

const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow" }).format(new Date(d)) : null);

/** Closes finished months for this partner (SQL function from migration 006) and lists the statements. */
export async function loadStatements(p: Pool, partnerId: string): Promise<Statement[]> {
  const created = await p.query<{ n: number }>(`SELECT partner_close_months($1) AS n`, [partnerId]);
  if (created.rows[0]?.n) await queueEvent(p, partnerId, "notify.statement_ready", { count: created.rows[0].n });
  // The period as text: a DATE parsed into a JS Date shifts by the server's time zone.
  const { rows } = await p.query(`SELECT *, period::text AS period FROM partner_statements WHERE partner_id = $1 ORDER BY partner_statements.period DESC`, [partnerId]);
  return rows.map((r) => ({
    id: String(r.id),
    period: r.period,
    periodLabel: monthLabel(r.period),
    reports: r.reports,
    amount: r.amount,
    status: r.status,
    disputeNote: r.dispute_note,
    actNo: actNumber(r.id, r.period),
    scanSent: Boolean(r.scan_doc_id),
    scanReceived: Boolean(r.scan_received_at),
    originalSentAt: day(r.original_sent_at),
    originalTrack: r.original_track,
    originalReceived: Boolean(r.original_received_at),
    paidAt: day(r.paid_at),
    actReturned: Boolean(r.act_returned_at),
  }));
}

const CODE = /^[A-Za-zА-Яа-я0-9-]{4,40}$/;

/** A partner sends an analysis: photo (or scan) of the result and the id code. Status «На проверке». */
export async function submitAnalysis(partnerId: string, form: FormData): Promise<{ number: string }> {
  if (!pdEnabled()) throw new Error("Приём файлов временно выключен");
  const raw = typeof form.get("code") === "string" ? String(form.get("code")).trim().replace(/\s+/g, "") : "";
  if (!CODE.test(raw)) throw new Error("Укажите id кода анализа — буквы, цифры и дефис, как на бланке");
  const number = raw.toUpperCase();
  const client = typeof form.get("client") === "string" ? String(form.get("client")).trim().slice(0, 120) : "";
  const photo = await readUpload(form, "photo", "Фото или скан результата");
  const p = await requirePartnerPool();
  await inTx(p, async (c) => {
    const { rows } = await c.query(`SELECT id, partner_id, status FROM partner_reports WHERE upper(report_number) = $1 FOR UPDATE`, [number]);
    const found = rows[0];
    // One code belongs to one partner. A partner may resend their own code that was not found.
    if (found && (found.partner_id !== partnerId || found.status !== "missing")) {
      throw new Error(found.partner_id === partnerId ? "Этот анализ уже у вас в списке" : "Этот код уже передан другим партнёром");
    }
    const path = await storeSealedFile(partnerId, photo.data);
    const doc = await c.query(
      `INSERT INTO partner_documents (partner_id, kind, mime, size, path) VALUES ($1, 'analysis', $2, $3, $4) RETURNING id`,
      [partnerId, photo.mime, photo.data.length, path],
    );
    if (found) {
      await c.query(
        `UPDATE partner_reports SET status = 'review', photo_doc_id = $2, client_name = coalesce(nullif($3, ''), client_name), verify_note = '', created_at = now() WHERE id = $1`,
        [found.id, doc.rows[0].id, client],
      );
    } else {
      await c.query(
        `INSERT INTO partner_reports (partner_id, report_number, client_name, status, fee, source, photo_doc_id) VALUES ($1, $2, $3, 'review', 0, 'partner', $4)`,
        [partnerId, number, client, doc.rows[0].id],
      );
    }
    // Raptor checks the code once its access is set; until then a staff member does it in /admin/partners.
    await queueEvent(c, partnerId, "raptor.verify_code", { number });
  });
  return { number };
}

/** «Подтверждаю» / «Не подтверждаю» on the monthly report, the signed act scan and the paper original. */
export async function statementAction(partnerId: string, id: string, action: string, input: { note?: string; track?: string }) {
  if (!/^\d{1,12}$/.test(id)) throw new Error("Отчёт не найден");
  const p = await requirePartnerPool();
  const { rows } = await p.query(`SELECT * FROM partner_statements WHERE id = $1 AND partner_id = $2`, [id, partnerId]);
  const s = rows[0];
  if (!s) throw new Error("Отчёт не найден");
  if (action === "confirm") {
    if (s.status !== "sent") throw new Error("Отчёт уже подтверждён или ждёт сверки");
    await p.query(`UPDATE partner_statements SET status = 'confirmed', confirmed_at = now(), updated_at = now() WHERE id = $1`, [id]);
    await queueEvent(p, partnerId, "mail.act_to_partner_and_service", { statementId: id });
  } else if (action === "dispute") {
    if (s.status !== "sent") throw new Error("Отчёт уже подтверждён или ждёт сверки");
    const note = (input.note ?? "").trim().slice(0, 2000);
    if (note.length < 5) throw new Error("Опишите, что не сходится: какие анализы или суммы");
    await p.query(`UPDATE partner_statements SET status = 'disputed', dispute_note = $2, updated_at = now() WHERE id = $1`, [id, note]);
    await queueEvent(p, partnerId, "service.statement_disputed", { statementId: id, note });
  } else if (action === "original") {
    if (s.status !== "confirmed" && s.status !== "paid") throw new Error("Сначала подтвердите отчёт");
    const track = (input.track ?? "").replace(/\s+/g, "").slice(0, 40);
    await p.query(`UPDATE partner_statements SET original_sent_at = now(), original_track = $2, updated_at = now() WHERE id = $1`, [id, track]);
  } else {
    throw new Error("Неизвестное действие");
  }
}

export async function uploadActScan(partnerId: string, id: string, form: FormData) {
  if (!pdEnabled()) throw new Error("Приём файлов временно выключен");
  if (!/^\d{1,12}$/.test(id)) throw new Error("Отчёт не найден");
  const p = await requirePartnerPool();
  const { rows } = await p.query(`SELECT status FROM partner_statements WHERE id = $1 AND partner_id = $2`, [id, partnerId]);
  if (!rows[0]) throw new Error("Отчёт не найден");
  if (rows[0].status !== "confirmed" && rows[0].status !== "paid") throw new Error("Сначала подтвердите отчёт");
  const scan = await readUpload(form, "scan", "Скан подписанного акта");
  await inTx(p, async (c) => {
    const path = await storeSealedFile(partnerId, scan.data);
    const doc = await c.query(
      `INSERT INTO partner_documents (partner_id, kind, mime, size, path) VALUES ($1, 'act_scan', $2, $3, $4) RETURNING id`,
      [partnerId, scan.mime, scan.data.length, path],
    );
    await c.query(`UPDATE partner_statements SET scan_doc_id = $2, updated_at = now() WHERE id = $1`, [id, doc.rows[0].id]);
    await queueEvent(c, partnerId, "mail.act_scan_to_accountant", { statementId: id });
  });
}

export type ActData = {
  actNo: string;
  periodLabel: string;
  periodFrom: string;
  periodTo: string;
  status: Statement["status"];
  amount: number;
  rows: { number: string; date: string; fee: number }[];
  partner: { fullName: string; legalForm: string; inn: string; passport: string; postal: string; bank: { recipient: string; bik: string; account: string; name: string } | null };
};

/** Everything the printable act needs. The partner's own personal data is opened only for this page. */
export async function loadAct(partnerId: string, id: string): Promise<ActData | null> {
  if (!/^\d{1,12}$/.test(id)) return null;
  const p = await requirePartnerPool();
  const s = (await p.query(`SELECT *, period::text AS period FROM partner_statements WHERE id = $1 AND partner_id = $2`, [id, partnerId])).rows[0];
  if (!s || s.status === "sent" || s.status === "disputed") return null;
  const partner = (await p.query(`SELECT full_name, legal_form FROM partners WHERE id = $1`, [partnerId])).rows[0];
  const sealed = (await p.query(`SELECT sealed FROM partner_pd WHERE partner_id = $1`, [partnerId])).rows[0]?.sealed as string | undefined;
  const pd = sealed ? openJson<{ passport: string; inn: string; postal: string; bank: ActData["partner"]["bank"] }>(sealed) : null;
  const rows = await p.query(
    `SELECT report_number, to_char(coalesce(test_date, verified_at::date, created_at::date), 'DD.MM.YYYY') AS date, fee
       FROM partner_reports WHERE statement_id = $1 ORDER BY coalesce(verified_at, created_at), id`,
    [id],
  );
  const from = new Date(s.period);
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0));
  const fmt = (d: Date) => new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC" }).format(d);
  return {
    actNo: actNumber(s.id, s.period),
    periodLabel: monthLabel(s.period),
    periodFrom: fmt(from),
    periodTo: fmt(to),
    status: s.status,
    amount: s.amount,
    rows: rows.rows.map((r) => ({ number: r.report_number, date: r.date, fee: r.fee })),
    partner: {
      fullName: partner.full_name,
      legalForm: partner.legal_form ?? "",
      inn: pd?.inn ?? "",
      passport: pd?.passport ?? "",
      postal: pd?.postal ?? "",
      bank: pd?.bank ?? null,
    },
  };
}
