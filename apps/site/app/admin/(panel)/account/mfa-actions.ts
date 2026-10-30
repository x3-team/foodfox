"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, q } from "@/lib/admin/db";
import { groupSecret, newSecret, otpauthUri, verifyCode } from "@/lib/admin/totp";

export type MfaResult = { ok: boolean; message?: string; qr?: string; secret?: string };

/** Starts enrolment: a fresh secret, not active until confirmCode accepts a code made from it. */
export async function startMfa(): Promise<MfaResult> {
  const staff = await assertStaff();
  if (staff.mfa) return { ok: false, message: "Двухфакторный вход уже включён" };
  const secret = newSecret();
  await q("UPDATE admin_users SET totp_secret = $2, totp_last_step = 0 WHERE id = $1 AND totp_enabled_at IS NULL", [staff.id, secret]);
  const qr = await QRCode.toString(otpauthUri(secret, staff.email), { type: "svg", margin: 1, width: 200, color: { dark: "#101400", light: "#ffffff" } });
  return { ok: true, qr, secret: groupSecret(secret) };
}

export async function confirmMfa(code: string): Promise<MfaResult> {
  const staff = await assertStaff();
  const row = await one<{ totp_secret: string | null }>("SELECT totp_secret FROM admin_users WHERE id = $1 AND totp_enabled_at IS NULL", [staff.id]);
  if (!row?.totp_secret) return { ok: false, message: "Начните подключение заново" };
  const step = verifyCode(row.totp_secret, code);
  if (step === null) return { ok: false, message: "Код не подходит. Проверьте время на телефоне" };
  await q("UPDATE admin_users SET totp_enabled_at = now(), totp_last_step = $2, updated_at = now() WHERE id = $1", [staff.id, step]);
  // Other sessions were opened without the code: close them.
  await q("DELETE FROM admin_sessions WHERE user_id = $1 AND id <> $2", [staff.id, staff.sessionId]);
  await audit(staff, { action: "mfa_on", entity: "user", entityId: staff.id, summary: "Включил двухфакторный вход" });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Двухфакторный вход включён" };
}

export async function disableMfa(code: string): Promise<MfaResult> {
  const staff = await assertStaff();
  const row = await one<{ totp_secret: string | null; totp_last_step: string }>("SELECT totp_secret, totp_last_step FROM admin_users WHERE id = $1 AND totp_enabled_at IS NOT NULL", [staff.id]);
  if (!row?.totp_secret) return { ok: false, message: "Двухфакторный вход не включён" };
  if (verifyCode(row.totp_secret, code, Number(row.totp_last_step)) === null) return { ok: false, message: "Код не подходит" };
  await q("UPDATE admin_users SET totp_secret = NULL, totp_enabled_at = NULL, totp_last_step = 0, updated_at = now() WHERE id = $1", [staff.id]);
  await audit(staff, { action: "mfa_off", entity: "user", entityId: staff.id, summary: "Выключил двухфакторный вход" });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Двухфакторный вход выключен. Медданные клиентов закрыты до повторного включения" };
}
