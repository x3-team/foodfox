import type { Pool, PoolClient } from "pg";

/* The consent register (packages/database/migrations/013_legal_consents.sql, applied by the site admin).
   Writes are best effort: a register that is not migrated yet must never break a sign-in. */

type Db = Pool | PoolClient;
export type ConsentMeta = { ip?: string | null; userAgent?: string | null };

/** Consent to the privacy policy and the processing consent in force now. */
export async function recordCurrentConsents(
  db: Db,
  input: { subject: "client" | "partner"; subjectId: string; contact: string | null; source: "app" | "partner" } & ConsentMeta,
): Promise<void> {
  await db
    .query(
      `INSERT INTO consents (subject_type, subject_id, contact, kind, version, document_id, source, ip, user_agent)
       SELECT $1, $2, $3, d.kind, d.version, d.id, $4, $5, $6 FROM legal_documents d
        WHERE d.is_current AND d.kind IN ('privacy', 'pd_consent')`,
      [input.subject, input.subjectId, input.contact, input.source, input.ip || null, (input.userAgent || "").slice(0, 300) || null],
    )
    .catch((error) => console.error("[consents] not recorded", error));
}

/** A consent that has no document row of its own, such as the partner agreement version. */
export async function recordConsent(
  db: Db,
  input: { subject: "client" | "partner"; subjectId: string; contact: string | null; kind: string; version: string; source: "app" | "partner"; acceptedAt?: Date | null } & ConsentMeta,
): Promise<void> {
  await db
    .query(
      `INSERT INTO consents (subject_type, subject_id, contact, kind, version, source, ip, user_agent, accepted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, now()))`,
      [input.subject, input.subjectId, input.contact, input.kind, input.version, input.source, input.ip || null, (input.userAgent || "").slice(0, 300) || null, input.acceptedAt ?? null],
    )
    .catch((error) => console.error("[consents] not recorded", error));
}

/** The client withdraws every active consent from the app (152-ФЗ ст. 9 ч. 2). Returns the stop-by date. */
export async function withdrawClientConsents(db: Db, userId: string, reason: string | null): Promise<{ withdrawn: number; stopBy: string | null }> {
  const { rows } = await db.query(
    `UPDATE consents SET withdrawn_at = now(), withdraw_source = 'app', withdraw_reason = $2, stop_by = CURRENT_DATE + 30
      WHERE subject_type = 'client' AND subject_id = $1 AND withdrawn_at IS NULL RETURNING stop_by::text`,
    [userId, reason],
  );
  return { withdrawn: rows.length, stopBy: rows[0]?.stop_by ?? null };
}

export function requestMeta(headers: Headers): ConsentMeta {
  return {
    ip: (headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0] || "").trim() || null,
    userAgent: headers.get("user-agent"),
  };
}
