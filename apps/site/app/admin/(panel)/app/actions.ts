"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { callWeb, clientTitle, GRANT_MINUTES, MEDICAL_REASONS } from "@/lib/admin/app";
import { one, q, tx } from "@/lib/admin/db";

export type AppResult = { ok: boolean; message?: string };

type AppUser = { id: string; phone: string | null; display_name: string | null; client_id: string | null; blocked_at: Date | null };

async function appUser(id: string): Promise<AppUser | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return one<AppUser>(
    `SELECT u.id, u.phone, c.display_name, c.id AS client_id, u.blocked_at
       FROM users u LEFT JOIN clients c ON c.user_id = u.id WHERE u.id = $1`,
    [id],
  );
}
const who = (u: AppUser) => clientTitle(u.display_name, u.phone);

/* The app server caches "is this account blocked" for 30 s; this drops it so the change applies on the next request.
   Best effort: without it the change still applies within those 30 s. */
async function refreshGuard(id: string) {
  await callWeb(`/internal/users/${id}/guard`, { method: "POST", signal: AbortSignal.timeout(5_000) }).catch((error) => {
    console.warn("[admin] app guard reset failed", error instanceof Error ? error.message : error);
  });
}

/** Blocks sign-in and every app request; the phone stays taken so the person cannot register again under it. */
export async function blockAppUser(id: string, input: { reason: string; days: number | null }): Promise<AppResult> {
  const staff = await assertStaff("app_block");
  const user = await appUser(id);
  if (!user) return { ok: false, message: "Клиент не найден" };
  const reason = input.reason.trim().slice(0, 500);
  if (reason.length < 3) return { ok: false, message: "Укажите причину блокировки" };
  const days = input.days && input.days > 0 ? Math.min(Math.round(input.days), 3650) : null;
  await tx(async (c) => {
    await c.query(
      `UPDATE users SET blocked_at = now(), blocked_reason = $2, sessions_revoked_at = now(), updated_at = now(),
              blocked_until = CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(days => $3::int) END
        WHERE id = $1`,
      [id, reason, days],
    );
    await c.query("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [id]);
    await audit(staff, {
      action: "block", entity: "app_user", entityId: id,
      summary: `Заблокирован ${who(user)}${days ? ` на ${days} дн.` : " бессрочно"}: ${reason}`,
      after: { reason, days },
    }, c);
  });
  await refreshGuard(id);
  revalidatePath(`/admin/app/users/${id}`);
  return { ok: true, message: "Клиент заблокирован и выведен со всех устройств" };
}

export async function unblockAppUser(id: string): Promise<AppResult> {
  const staff = await assertStaff("app_block");
  const user = await appUser(id);
  if (!user) return { ok: false, message: "Клиент не найден" };
  await q("UPDATE users SET blocked_at = NULL, blocked_until = NULL, blocked_reason = NULL, updated_at = now() WHERE id = $1", [id]);
  await audit(staff, { action: "unblock", entity: "app_user", entityId: id, summary: `Разблокирован ${who(user)}` });
  await refreshGuard(id);
  revalidatePath(`/admin/app/users/${id}`);
  return { ok: true, message: "Клиент разблокирован" };
}

/** Lost phone or a shared account: every token issued so far stops working, the client signs in again by SMS. */
export async function signOutAppUser(id: string): Promise<AppResult> {
  const staff = await assertStaff("app_block");
  const user = await appUser(id);
  if (!user) return { ok: false, message: "Клиент не найден" };
  const rows = await tx(async (c) => {
    await c.query("UPDATE users SET sessions_revoked_at = now() WHERE id = $1", [id]);
    const r = await c.query("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL RETURNING id", [id]);
    await audit(staff, { action: "end_sessions", entity: "app_user", entityId: id, summary: `${who(user)} выведен со всех устройств (${r.rowCount ?? 0})` }, c);
    return r.rowCount ?? 0;
  });
  await refreshGuard(id);
  revalidatePath(`/admin/app/users/${id}`);
  return { ok: true, message: rows ? `Завершено входов: ${rows}` : "Все входы завершены" };
}

/** Opens this client's PDF, values and zones to the caller for GRANT_MINUTES, with the reason in the log. */
export async function openMedical(userId: string, reason: string): Promise<AppResult> {
  const staff = await assertStaff("medical");
  const user = await appUser(userId);
  if (!user?.client_id) return { ok: false, message: "Клиент не найден" };
  const clean = reason.trim().slice(0, 300);
  if (!(MEDICAL_REASONS as readonly string[]).includes(clean) && clean.length < 10) {
    return { ok: false, message: "Опишите причину подробнее, хотя бы 10 символов" };
  }
  await q(
    `INSERT INTO admin_medical_grants (staff_id, client_id, reason, expires_at) VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
    [staff.id, user.client_id, clean, GRANT_MINUTES],
  );
  await audit(staff, { action: "open", entity: "medical", entityId: userId, summary: `Открыл медданные: ${who(user)}, на ${GRANT_MINUTES} мин: ${clean}` });
  revalidatePath("/admin/app", "layout");
  return { ok: true };
}

export async function closeMedical(userId: string): Promise<AppResult> {
  const staff = await assertStaff();
  const user = await appUser(userId);
  if (!user?.client_id) return { ok: false };
  await q("UPDATE admin_medical_grants SET expires_at = now() WHERE staff_id = $1 AND client_id = $2 AND expires_at > now()", [staff.id, user.client_id]);
  revalidatePath("/admin/app", "layout");
  return { ok: true };
}
