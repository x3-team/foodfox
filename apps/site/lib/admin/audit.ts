import type { PoolClient } from "pg";
import { clientIp, type Staff } from "./auth";
import { q } from "./db";

export type AuditEntry = {
  action: string;
  entity: string;
  entityId?: string | number | null;
  summary: string;
  before?: unknown;
  after?: unknown;
};

/** Writes one line to the audit log. Pass `client` inside a transaction so the log rolls back with the change. */
export async function audit(staff: Staff, entry: AuditEntry, client?: PoolClient): Promise<void> {
  const params = [
    staff.id,
    staff.name || staff.email,
    staff.role,
    entry.action,
    entry.entity,
    entry.entityId == null ? null : String(entry.entityId),
    entry.summary,
    entry.before === undefined ? null : JSON.stringify(entry.before),
    entry.after === undefined ? null : JSON.stringify(entry.after),
    await clientIp(),
  ];
  const sql = `INSERT INTO audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, summary, before, after, ip)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
  if (client) await client.query(sql, params);
  else await q(sql, params);
}

/** Only the fields that changed, as {before, after}, so the log shows a short diff instead of whole rows. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key] = before[key];
      a[key] = after[key];
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 };
}
