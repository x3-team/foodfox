import { one, q } from "@/lib/admin/db";

/* Legal documents and the consent register (migrations/013_legal_consents.sql). apps/web writes app and partner
   consents with the same columns (apps/web/src/lib/consents.ts); this file is the site side: leads, the admin pages. */

export const DOC_KINDS = {
  privacy: "Политика обработки ПД",
  pd_consent: "Согласие на обработку ПД",
  offer: "Оферта",
  marketing: "Согласие на рассылки",
} as const;
export type DocKind = keyof typeof DOC_KINDS;
export const isDocKind = (value: string): value is DocKind => value in DOC_KINDS;

export const CONSENT_KINDS: Record<string, string> = { ...DOC_KINDS, partner_contract: "Договор партнёра" };
export const SUBJECTS = { client: "Клиент приложения", lead: "Заявка с сайта", partner: "Партнёр" } as const;
export const SOURCES = { app: "Приложение", site: "Сайт", partner: "Кабинет партнёра", admin: "Админка", import: "Перенос" } as const;
export type Subject = keyof typeof SUBJECTS;

/** Days the law gives to stop processing after a withdrawal (152-ФЗ ст. 21 ч. 5). */
export const STOP_DAYS = 30;

export type LegalDocument = {
  id: string; kind: DocKind; version: string; title: string; url: string | null; note: string | null;
  effective_from: Date; is_current: boolean; created_at: Date; accepted?: number;
};

export type Consent = {
  id: string; subject_type: Subject; subject_id: string | null; contact: string | null; kind: string; version: string;
  source: keyof typeof SOURCES; ip: string | null; accepted_at: Date; withdrawn_at: Date | null; withdraw_source: string | null;
  withdraw_reason: string | null; stop_by: Date | null;
};

export async function listDocuments(): Promise<LegalDocument[]> {
  return q<LegalDocument>(
    `SELECT d.*, (SELECT count(*)::int FROM consents c WHERE c.document_id = d.id) AS accepted
       FROM legal_documents d ORDER BY d.kind, d.is_current DESC, d.effective_from DESC, d.created_at DESC`,
  );
}

/** Records consent to the documents in force now; nothing is written when the register is not migrated yet. */
export async function recordCurrentConsents(input: {
  subject: Subject; subjectId: string | null; contact: string | null; source: keyof typeof SOURCES;
  ip?: string | null; userAgent?: string | null; kinds?: DocKind[];
}): Promise<void> {
  const kinds = input.kinds ?? ["privacy", "pd_consent"];
  await q(
    `INSERT INTO consents (subject_type, subject_id, contact, kind, version, document_id, source, ip, user_agent)
     SELECT $1, $2, $3, d.kind, d.version, d.id, $4, $5, $6 FROM legal_documents d WHERE d.is_current AND d.kind = ANY($7)`,
    [input.subject, input.subjectId, input.contact, input.source, input.ip || null, (input.userAgent || "").slice(0, 300) || null, kinds],
  );
}

export type ConsentFilter = { q?: string; subject?: string; kind?: string; state?: string; subjectId?: string };

export function consentWhere(f: ConsentFilter): { where: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => { params.push(value); parts.push(sql.replace("$?", `$${params.length}`)); };
  const term = f.q?.trim().replace(/[%_]/g, "");
  if (term) add("(c.contact ILIKE $? OR c.subject_id::text = lower(trim(both '%' from $?)))".replaceAll("$?", `$${params.length + 1}`), `%${term}%`);
  // «+7 (925) 111-11-11» finds the phone stored as 79251111111.
  const digits = term?.replace(/\D/g, "") ?? "";
  if (digits.length >= 5 && digits !== term) parts[parts.length - 1] = parts[parts.length - 1].replace(/\)$/, ` OR c.contact LIKE '%${digits}%')`);
  if (f.subject && f.subject in SUBJECTS) add("c.subject_type = $?", f.subject);
  if (f.kind && f.kind in CONSENT_KINDS) add("c.kind = $?", f.kind);
  if (f.subjectId) add("c.subject_id::text = $?", f.subjectId);
  if (f.state === "active") parts.push("c.withdrawn_at IS NULL");
  if (f.state === "withdrawn") parts.push("c.withdrawn_at IS NOT NULL");
  if (f.state === "due") parts.push("c.withdrawn_at IS NOT NULL AND c.stop_by >= CURRENT_DATE");
  return { where: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}

export async function listConsents(f: ConsentFilter, limit = 50, offset = 0): Promise<{ rows: Consent[]; total: number }> {
  const { where, params } = consentWhere(f);
  const [rows, count] = await Promise.all([
    q<Consent>(`SELECT c.* FROM consents c ${where} ORDER BY c.accepted_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    one<{ n: number }>(`SELECT count(*)::int AS n FROM consents c ${where}`, params),
  ]);
  return { rows, total: count?.n ?? 0 };
}

/** Withdrawals still inside their 30 days: someone has to stop the processing (item 6 anonymizes the account). */
export async function openWithdrawals(): Promise<number> {
  const row = await one<{ n: number }>(
    `SELECT count(DISTINCT (subject_type, subject_id))::int AS n FROM consents WHERE withdrawn_at IS NOT NULL AND stop_by >= CURRENT_DATE`,
  ).catch(() => null);
  return row?.n ?? 0;
}
