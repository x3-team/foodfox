import { getDbPool } from "./db";

/**
 * Blocking and "sign out everywhere" from the admin (apps/site, migration
 * 011_app_admin.sql). Access tokens are stateless, so every authenticated
 * request asks the database whether the account is blocked or its tokens
 * were revoked after this one was issued. Answers are cached for 30 s per
 * user to keep that to one cheap query per user per half-minute.
 */

interface GuardState {
  blockedUntil: number | null; // ms; Infinity when blocked without a term
  revokedAt: number | null; // ms
  checkedAt: number;
}

const TTL_MS = 30_000;
const cache = new Map<string, GuardState>();
let columnsMissing = false;

async function load(userId: string): Promise<GuardState | null> {
  const pool = getDbPool();
  if (!pool || columnsMissing) return null;
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.checkedAt < TTL_MS) return hit;
  try {
    const { rows } = await pool.query(
      `SELECT blocked_at, blocked_until, sessions_revoked_at FROM users WHERE id = $1`,
      [userId],
    );
    const row = rows[0];
    const state: GuardState = {
      // No row: the account was deleted (lib/account-deletion.ts), its tokens must stop working at once.
      blockedUntil: !row ? Infinity : row.blocked_at
        ? row.blocked_until
          ? new Date(row.blocked_until).getTime()
          : Infinity
        : null,
      revokedAt: row?.sessions_revoked_at ? new Date(row.sessions_revoked_at).getTime() : null,
      checkedAt: Date.now(),
    };
    if (cache.size > 5000) cache.clear();
    cache.set(userId, state);
    return state;
  } catch (e) {
    // 42703: the admin migration has not run on this database yet; nothing can be blocked.
    if ((e as { code?: string }).code === "42703") columnsMissing = true;
    else console.error("account guard failed", e);
    return null;
  }
}

/** Drops the cached answer, so the next request of this user asks the database again. */
export function forgetGuard(userId: string): void {
  cache.delete(userId);
}

export async function isBlocked(userId: string): Promise<boolean> {
  const state = await load(userId);
  return Boolean(state?.blockedUntil && state.blockedUntil > Date.now());
}

/** False when the account is blocked or the token was issued before the last "sign out everywhere". */
export async function sessionAllowed(userId: string, issuedAtSec: number | undefined): Promise<boolean> {
  const state = await load(userId);
  if (!state) return true;
  if (state.blockedUntil && state.blockedUntil > Date.now()) return false;
  if (state.revokedAt && (issuedAtSec ?? 0) * 1000 < state.revokedAt) return false;
  return true;
}
