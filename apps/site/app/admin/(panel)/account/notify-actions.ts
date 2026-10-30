"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { one, q } from "@/lib/admin/db";
import { channels, kindsFor, render, sendEmail, sendTelegram, telegramLinkCode } from "@/lib/admin/notify";

type Result = { ok: boolean; message?: string; link?: string };

export async function saveNotifyPrefs(input: { email: boolean; telegram: boolean; kinds: string[] }): Promise<Result> {
  const staff = await assertStaff();
  const allowed = kindsFor(staff.role);
  const kinds = input.kinds.filter((k) => (allowed as string[]).includes(k));
  // All of the role's events stored as NULL, so an event added later reaches the person by default.
  const stored = kinds.length === allowed.length ? null : kinds;
  await q("UPDATE admin_users SET notify_email = $2, notify_telegram = $3, notify_kinds = $4 WHERE id = $1", [staff.id, input.email, input.telegram, stored]);
  revalidatePath("/admin/account");
  return { ok: true, message: "Сохранено" };
}

export async function connectTelegram(): Promise<Result> {
  const staff = await assertStaff();
  const ch = channels();
  if (!ch.telegram || !ch.botName) return { ok: false, message: "Бот не настроен: нужны FOX_TELEGRAM_BOT_TOKEN и FOX_TELEGRAM_BOT_NAME" };
  const code = await telegramLinkCode(staff.id);
  return { ok: true, link: `https://t.me/${ch.botName}?start=${code}`, message: "Откройте ссылку и нажмите «Старт» в Telegram. Привязка займёт до минуты." };
}

export async function disconnectTelegram(): Promise<Result> {
  const staff = await assertStaff();
  await q("UPDATE admin_users SET telegram_chat_id = NULL, telegram_link_code = NULL WHERE id = $1", [staff.id]);
  revalidatePath("/admin/account");
  return { ok: true, message: "Telegram отключён" };
}

/** A sample notification to the signed-in staff member through every channel they have. */
export async function sendTest(): Promise<Result> {
  const staff = await assertStaff();
  const me = await one<{ email: string; telegram_chat_id: string | null }>("SELECT email, telegram_chat_id FROM admin_users WHERE id = $1", [staff.id]);
  const ch = channels();
  const { subject, text } = render("lead", "0", { kind: "contact", name: "Проверка уведомлений" });
  const done: string[] = [];
  const errors: string[] = [];
  if (ch.email && me?.email) await sendEmail(me.email, subject, text).then(() => done.push("почту"), (e) => errors.push(`почта: ${(e as Error).message}`));
  if (ch.telegram && me?.telegram_chat_id) await sendTelegram(me.telegram_chat_id, text).then(() => done.push("Telegram"), (e) => errors.push(`Telegram: ${(e as Error).message}`));
  if (errors.length) return { ok: false, message: errors.join("; ") };
  if (!done.length) return { ok: false, message: "Некуда отправить: каналы не настроены или Telegram не подключён" };
  return { ok: true, message: `Отправлено в ${done.join(" и ")}` };
}
