import { readFileSync } from "fs";
import { join } from "path";
import type { Pool, PoolClient } from "pg";
import { ensureSchema, sharedPool } from "@/lib/db";

/* The partner tables belong to the site admin (migrations 005 and 006). The cabinet may get a request before the site
   process has started, so it applies them too, under the same advisory lock apps/site/lib/admin/db.ts takes. */

let ready: Promise<void> | null = null;

async function migrate(p: Pool) {
  await ensureSchema();
  const client = await p.connect();
  try {
    await client.query("SELECT pg_advisory_lock(7400501)");
    for (const name of ["005_site_admin.sql", "006_partner_program.sql"]) {
      await client.query(readFileSync(join(process.cwd(), "../../packages/database/migrations", name), "utf-8"));
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(7400501)").catch(() => {});
    client.release();
  }
}

/** The pool with the partner program tables in place, or null without a database (demo). */
export async function partnerPool(): Promise<Pool | null> {
  const p = sharedPool();
  if (!p) return null;
  if (!ready) ready = migrate(p).catch((error) => { ready = null; throw error; });
  await ready;
  return p;
}

export async function requirePartnerPool(): Promise<Pool> {
  const p = await partnerPool();
  if (!p) throw new Error("База данных недоступна");
  return p;
}

export async function inTx<T>(p: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await p.connect();
  try {
    await c.query("BEGIN");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (error) {
    await c.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    c.release();
  }
}

/** The confirmed phone behind a session (users.phone, 7XXXXXXXXXX). */
export async function sessionPhone(p: Pool, userId: string): Promise<string | null> {
  const { rows } = await p.query(`SELECT phone FROM users WHERE id = $1`, [userId]);
  return (rows[0]?.phone as string | undefined) ?? null;
}

/** The partner card a cabinet session works with: approved or certified, found by the phone. */
export async function activePartnerId(p: Pool, userId: string): Promise<string | null> {
  const phone = await sessionPhone(p, userId);
  if (!phone) return null;
  const { rows } = await p.query(`SELECT id FROM partners WHERE phone = $1 AND status IN ('approved', 'certified')`, [phone]);
  return (rows[0]?.id as string | undefined) ?? null;
}

/** Queues a step for an outside system (Bitrix24, 1С, e-mail, Raptor); see partner_events in migration 006. */
export async function queueEvent(c: Pool | PoolClient, partnerId: string | null, kind: string, payload: Record<string, unknown> = {}) {
  await c.query(`INSERT INTO partner_events (partner_id, kind, payload) VALUES ($1, $2, $3)`, [partnerId, kind, JSON.stringify(payload)]);
}
