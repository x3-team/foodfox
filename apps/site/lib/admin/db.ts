import { readFileSync } from "fs";
import { join } from "path";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { hashPassword } from "./password";

/* The site shares the Postgres of apps/web (DATABASE_URL from apps/web/.env, which deploy/vps/update.sh exports
   before it starts the site). Admin tables come from packages/database/migrations/005_site_admin.sql and 011_app_admin.sql and are applied
   once per process on first use. Without DATABASE_URL the site still renders; the admin says the database is off. */

type State = { pool: Pool | null; ready: Promise<void> | null };
const g = globalThis as unknown as { __foxAdminDb?: State };
const state: State = (g.__foxAdminDb ??= { pool: null, ready: null });

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function pool(): Pool {
  if (!state.pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    state.pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30_000 });
  }
  return state.pool;
}

const MIGRATIONS = ["005_site_admin.sql", "006_partner_program.sql", "011_app_admin.sql", "012_partner_tariffs.sql"];

async function migrate(): Promise<void> {
  const client = await pool().connect();
  try {
    // apps/web and a second site process may start at the same moment.
    await client.query("SELECT pg_advisory_lock(7400501)");
    for (const name of MIGRATIONS) {
      const sql = readFileSync(join(process.cwd(), "../../packages/database/migrations", name), "utf-8");
      await client.query(sql);
    }
    await bootstrapAdmin(client);
  } finally {
    await client.query("SELECT pg_advisory_unlock(7400501)").catch(() => {});
    client.release();
  }
}

/* The first admin comes from FOX_ADMIN_EMAIL / FOX_ADMIN_PASSWORD, only while there is no admin at all, so changing
   the env later never resets a password set in the admin. */
async function bootstrapAdmin(client: PoolClient) {
  const email = process.env.FOX_ADMIN_EMAIL?.trim();
  const password = process.env.FOX_ADMIN_PASSWORD;
  if (!email || !password) return;
  const { rows } = await client.query("SELECT 1 FROM admin_users WHERE role = 'admin' LIMIT 1");
  if (rows.length) return;
  await client.query(
    `INSERT INTO admin_users (email, name, role, password_hash) VALUES ($1, $2, 'admin', $3)
     ON CONFLICT (lower(email)) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash, is_active = true`,
    [email, "Администратор", hashPassword(password)],
  );
  await client.query(
    `INSERT INTO audit_log (actor_name, action, entity, entity_id, summary) VALUES ('система', 'create', 'user', $1, $2)`,
    [email, `Первый администратор ${email} создан из FOX_ADMIN_EMAIL`],
  );
}

export async function ready(): Promise<void> {
  if (!state.ready) {
    state.ready = migrate().catch((error) => {
      state.ready = null;
      throw error;
    });
  }
  return state.ready;
}

export async function q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const result = await pool().query<T>(text, params);
  return result.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
