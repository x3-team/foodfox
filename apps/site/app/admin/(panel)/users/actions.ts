"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { assertStaff, isRole, ROLE_LABEL as ROLE_TITLE, type Role } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, q } from "@/lib/admin/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/admin/password";

export type UserResult = { ok: boolean; message?: string; password?: string };

const ROLE_LABEL = Object.fromEntries(Object.entries(ROLE_TITLE).map(([k, v]) => [k, v.toLowerCase()])) as Record<Role, string>;

/** Readable one-time password: no 0/O/1/l, letters and digits guaranteed. */
function tempPassword(): string {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (const b of bytes) out += abc[b % abc.length];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 10)}${(bytes[0] % 8) + 2}`;
}

async function otherActiveAdmins(exceptId: string) {
  const row = await one<{ n: number }>("SELECT count(*)::int AS n FROM admin_users WHERE role = 'admin' AND is_active AND id <> $1", [exceptId]);
  return row?.n ?? 0;
}

export async function createUser(input: { email: string; name: string; role: string }): Promise<UserResult> {
  const staff = await assertStaff("users");
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Проверьте почту" };
  if (!isRole(input.role)) return { ok: false, message: "Выберите роль" };
  const exists = await one("SELECT 1 FROM admin_users WHERE lower(email) = $1", [email]);
  if (exists) return { ok: false, message: "Такая почта уже есть" };
  const password = tempPassword();
  const [row] = await q<{ id: string }>(
    "INSERT INTO admin_users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
    [email, name, input.role, hashPassword(password)],
  );
  await audit(staff, { action: "create", entity: "user", entityId: row.id, summary: `Добавлен ${ROLE_LABEL[input.role]} ${name || email}`, after: { email, name, role: input.role } });
  revalidatePath("/admin/users");
  return { ok: true, password };
}

export async function updateUser(id: string, patch: { role?: string; is_active?: boolean; name?: string }): Promise<UserResult> {
  const staff = await assertStaff("users");
  const user = await one<{ id: string; email: string; name: string; role: Role; is_active: boolean }>("SELECT id, email, name, role, is_active FROM admin_users WHERE id = $1", [id]);
  if (!user) return { ok: false, message: "Пользователь не найден" };
  const losesAdmin = (patch.role && patch.role !== "admin") || patch.is_active === false;
  if (user.role === "admin" && losesAdmin && (await otherActiveAdmins(id)) === 0) {
    return { ok: false, message: "Нельзя оставить админку без администратора" };
  }
  if (patch.role !== undefined) {
    if (!isRole(patch.role)) return { ok: false, message: "Неизвестная роль" };
    if (patch.role !== user.role) {
      await q("UPDATE admin_users SET role = $2, updated_at = now() WHERE id = $1", [id, patch.role]);
      await audit(staff, { action: "role", entity: "user", entityId: id, summary: `${user.name || user.email}: роль ${ROLE_LABEL[user.role]} → ${ROLE_LABEL[patch.role]}`, before: { role: user.role }, after: { role: patch.role } });
    }
  }
  if (patch.is_active !== undefined && patch.is_active !== user.is_active) {
    await q("UPDATE admin_users SET is_active = $2, updated_at = now() WHERE id = $1", [id, patch.is_active]);
    if (!patch.is_active) await q("DELETE FROM admin_sessions WHERE user_id = $1", [id]);
    await audit(staff, { action: patch.is_active ? "unblock" : "block", entity: "user", entityId: id, summary: `${user.name || user.email} ${patch.is_active ? "разблокирован" : "заблокирован"}` });
  }
  if (patch.name !== undefined && patch.name.trim() !== user.name) {
    await q("UPDATE admin_users SET name = $2, updated_at = now() WHERE id = $1", [id, patch.name.trim().slice(0, 120)]);
    await audit(staff, { action: "update", entity: "user", entityId: id, summary: `Имя: ${user.name || "—"} → ${patch.name.trim()}` });
  }
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetPassword(id: string): Promise<UserResult> {
  const staff = await assertStaff("users");
  const user = await one<{ email: string; name: string }>("SELECT email, name FROM admin_users WHERE id = $1", [id]);
  if (!user) return { ok: false, message: "Пользователь не найден" };
  const password = tempPassword();
  await q("UPDATE admin_users SET password_hash = $2, updated_at = now() WHERE id = $1", [id, hashPassword(password)]);
  await q("DELETE FROM admin_sessions WHERE user_id = $1", [id]);
  await audit(staff, { action: "reset_password", entity: "user", entityId: id, summary: `Сброшен пароль: ${user.name || user.email}` });
  return { ok: true, password };
}

/** For a staff member who lost the phone: 2FA off, all sessions closed; they enrol again from the profile. */
export async function resetMfa(id: string): Promise<UserResult> {
  const staff = await assertStaff("users");
  const user = await one<{ email: string; name: string }>("SELECT email, name FROM admin_users WHERE id = $1 AND totp_enabled_at IS NOT NULL", [id]);
  if (!user) return { ok: false, message: "Двухфакторный вход у сотрудника не включён" };
  await q("UPDATE admin_users SET totp_secret = NULL, totp_enabled_at = NULL, totp_last_step = 0, updated_at = now() WHERE id = $1", [id]);
  await q("DELETE FROM admin_sessions WHERE user_id = $1 AND id <> $2", [id, staff.sessionId]);
  await audit(staff, { action: "mfa_reset", entity: "user", entityId: id, summary: `Сброшен двухфакторный вход: ${user.name || user.email}` });
  revalidatePath("/admin/users");
  return { ok: true, message: "Двухфакторный вход сброшен" };
}

export async function endSessions(id: string): Promise<UserResult> {
  const staff = await assertStaff("users");
  const rows = await q("DELETE FROM admin_sessions WHERE user_id = $1 AND id <> $2 RETURNING id", [id, staff.sessionId]);
  await audit(staff, { action: "end_sessions", entity: "user", entityId: id, summary: `Завершено сессий: ${rows.length}` });
  revalidatePath("/admin/users");
  return { ok: true, message: `Завершено сессий: ${rows.length}` };
}

/* Own account: any role. */
export async function updateMe(input: { name: string; current?: string; next?: string }): Promise<UserResult> {
  const staff = await assertStaff();
  const name = input.name.trim().slice(0, 120);
  if (name !== staff.name) {
    await q("UPDATE admin_users SET name = $2, updated_at = now() WHERE id = $1", [staff.id, name]);
    await audit(staff, { action: "update", entity: "user", entityId: staff.id, summary: `Изменил своё имя на «${name}»` });
  }
  if (input.next) {
    const row = await one<{ password_hash: string }>("SELECT password_hash FROM admin_users WHERE id = $1", [staff.id]);
    if (!row || !verifyPassword(input.current ?? "", row.password_hash)) return { ok: false, message: "Текущий пароль не подходит" };
    const problem = passwordProblem(input.next);
    if (problem) return { ok: false, message: problem };
    await q("UPDATE admin_users SET password_hash = $2, updated_at = now() WHERE id = $1", [staff.id, hashPassword(input.next)]);
    await q("DELETE FROM admin_sessions WHERE user_id = $1 AND id <> $2", [staff.id, staff.sessionId]);
    await audit(staff, { action: "password", entity: "user", entityId: staff.id, summary: "Сменил свой пароль, другие сессии завершены" });
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Сохранено" };
}

export async function endMySession(sessionId: string): Promise<UserResult> {
  const staff = await assertStaff();
  await q("DELETE FROM admin_sessions WHERE id = $1 AND user_id = $2 AND id <> $3", [sessionId, staff.id, staff.sessionId]);
  revalidatePath("/admin/account");
  return { ok: true };
}
