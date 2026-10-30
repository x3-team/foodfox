import { randomBytes } from "crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { ACCESS, type Area, type Role } from "@/lib/admin/auth";
import { hasDatabase, one, q, withClient } from "@/lib/admin/db";
import { SITE_URL } from "@/lib/cms/seo";

/* Staff notifications (migrations/016_staff_notifications.sql). Database triggers queue the events; processPending()
   sends each one by e-mail and Telegram to the active staff whose role opens the event's area and who did not switch
   that event off in their profile. It runs once a minute inside the site process (instrumentation.ts).

   Keys live in apps/web/.env, never in code:
     FOX_SMTP_HOST, FOX_SMTP_PORT (465 = TLS), FOX_SMTP_USER, FOX_SMTP_PASS, FOX_SMTP_FROM
     FOX_TELEGRAM_BOT_TOKEN, FOX_TELEGRAM_BOT_NAME (the bot's @username, for the «connect» link) */

type Payload = Record<string, unknown>;
type Kind = { label: string; area: Area; title: (p: Payload, ref: string) => string; link: (ref: string, p: Payload) => string };

const LEAD_KINDS: Record<string, string> = {
  contact: "обратная связь", course: "курс", review: "отзыв", partner: "партнёрство", "city-wait": "ждём в городе", "book-wait": "книга",
};

export const NOTIFY_KINDS = {
  lead: {
    label: "Новые заявки с сайта", area: "leads",
    title: (p, ref) => `Заявка #${ref}: ${LEAD_KINDS[String(p.kind)] ?? p.kind}${p.name ? `, ${p.name}` : ""}${p.city ? ` (${p.city})` : ""}`,
    link: (ref) => `/admin/leads/${ref}`,
  },
  partner_application: {
    label: "Анкеты партнёров", area: "partners",
    title: (p) => `Анкета партнёра: ${p.name || "без имени"}${p.city ? ` (${p.city})` : ""}`,
    link: (ref) => `/admin/partners/${ref}`,
  },
  report_unrecognized: {
    label: "Нераспознанные отчёты", area: "app_reports",
    title: (p) => (p.status === "failed" ? "Отчёт не распознан, нужна ручная проверка" : "Отчёт ждёт проверки модератора"),
    link: (ref) => `/admin/app/reports/${ref}`,
  },
  act_scan: {
    label: "Сканы актов от партнёров", area: "pd",
    title: (p) => `Партнёр прислал скан акта${p.period ? ` за ${String(p.period).slice(0, 7)}` : ""}${p.amount ? ` на ${p.amount} ₽` : ""}`,
    link: (_ref, p) => `/admin/partners/${p.partner_id}`,
  },
  ticket: {
    label: "Обращения клиентов", area: "tickets",
    title: (p, ref) => `Обращение #${ref}: ${String(p.preview ?? "").slice(0, 120)}`,
    link: (ref) => `/admin/support/${ref}`,
  },
} satisfies Record<string, Kind>;
export type NotifyKind = keyof typeof NOTIFY_KINDS;
export const isNotifyKind = (v: string): v is NotifyKind => v in NOTIFY_KINDS;

/** Events a role can receive: those whose area it opens. */
export function kindsFor(role: Role): NotifyKind[] {
  return (Object.keys(NOTIFY_KINDS) as NotifyKind[]).filter((k) => (ACCESS[NOTIFY_KINDS[k].area] as readonly Role[]).includes(role));
}

const env = (name: string) => process.env[name]?.trim() || "";

export function channels() {
  return {
    email: Boolean(env("FOX_SMTP_HOST") && env("FOX_SMTP_FROM")),
    telegram: Boolean(env("FOX_TELEGRAM_BOT_TOKEN")),
    botName: env("FOX_TELEGRAM_BOT_NAME").replace(/^@/, ""),
  };
}

let transport: Transporter | null = null;
function mailer(): Transporter {
  if (!transport) {
    const port = Number(env("FOX_SMTP_PORT")) || 465;
    transport = nodemailer.createTransport({
      host: env("FOX_SMTP_HOST"), port, secure: port === 465,
      auth: env("FOX_SMTP_USER") ? { user: env("FOX_SMTP_USER"), pass: env("FOX_SMTP_PASS") } : undefined,
    });
  }
  return transport;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  await mailer().sendMail({ from: env("FOX_SMTP_FROM"), to, subject, text });
}

async function telegram(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.telegram.org/bot${env("FOX_TELEGRAM_BOT_TOKEN")}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: unknown };
  if (!data.ok) throw new Error(data.description || `Telegram ${res.status}`);
  return { result: data.result };
}

export async function sendTelegram(chatId: string, text: string): Promise<void> {
  await telegram("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

/** A one-time code for t.me/<bot>?start=<code>; the next poll binds the chat that sends it. */
export async function telegramLinkCode(staffId: string): Promise<string> {
  const code = randomBytes(12).toString("base64url");
  await q("UPDATE admin_users SET telegram_link_code = $2 WHERE id = $1", [staffId, code]);
  return code;
}

let updateOffset = 0;
/** Reads «/start <code>» messages sent to the bot and stores the chat of the staff member with that code. */
async function bindTelegramChats(): Promise<void> {
  const { result } = await telegram("getUpdates", { offset: updateOffset, timeout: 0, allowed_updates: ["message"] });
  for (const u of (result as { update_id: number; message?: { chat?: { id: number }; text?: string } }[]) ?? []) {
    updateOffset = Math.max(updateOffset, u.update_id + 1);
    const code = u.message?.text?.match(/^\/start\s+([\w-]{8,})/)?.[1];
    const chat = u.message?.chat?.id;
    if (!code || !chat) continue;
    const staff = await one<{ name: string }>(
      "UPDATE admin_users SET telegram_chat_id = $2, telegram_link_code = NULL, notify_telegram = true WHERE telegram_link_code = $1 AND is_active RETURNING coalesce(nullif(name, ''), email) AS name",
      [code, String(chat)],
    );
    await sendTelegram(String(chat), staff ? `Готово, ${staff.name}: уведомления FoodFox будут приходить сюда.` : "Ссылка устарела. Откройте профиль в админке и подключите Telegram заново.").catch(() => {});
  }
}

type Pending = { id: string; kind: string; ref_id: string | null; payload: Payload; created_at: Date };
type Recipient = { id: string; email: string; role: Role; notify_email: boolean; notify_telegram: boolean; notify_kinds: string[] | null; telegram_chat_id: string | null };

/** The message for one event: a line of text and the admin link. */
export function render(kind: NotifyKind, ref: string, payload: Payload): { subject: string; text: string } {
  const k: Kind = NOTIFY_KINDS[kind];
  const title = k.title(payload, ref);
  return { subject: `FoodFox: ${title}`, text: `${title}\n\n${SITE_URL}${k.link(ref, payload)}` };
}

/** Events older than this are logged as skipped instead of sent, so switching a channel on does not flood anyone. */
const STALE_HOURS = 24;

export async function processPending(): Promise<{ processed: number }> {
  if (!hasDatabase()) return { processed: 0 };
  const ch = channels();
  return withClient(async (client) => {
    // One sender at a time, even if two processes run the timer.
    const { rows: [lock] } = await client.query<{ ok: boolean }>("SELECT pg_try_advisory_lock(hashtext('fox-staff-notify')) AS ok");
    if (!lock.ok) return { processed: 0 };
    try {
      if (ch.telegram) await bindTelegramChats().catch((e) => console.error("[notify] telegram updates", e));
      const { rows: pending } = await client.query<Pending>(
        "SELECT id, kind, ref_id, payload, created_at FROM staff_notifications WHERE processed_at IS NULL ORDER BY id LIMIT 50",
      );
      if (!pending.length) return { processed: 0 };
      const { rows: staff } = await client.query<Recipient>(
        "SELECT id, email, role, notify_email, notify_telegram, notify_kinds, telegram_chat_id FROM admin_users WHERE is_active",
      );
      for (const n of pending) {
        let result: Record<string, unknown>;
        if (!isNotifyKind(n.kind)) result = { skipped: "неизвестное событие" };
        else if (!ch.email && !ch.telegram) result = { skipped: "каналы не настроены" };
        else if (Date.now() - new Date(n.created_at).getTime() > STALE_HOURS * 3600_000) result = { skipped: "устарело" };
        else result = await deliver(client, n, n.kind, staff, ch);
        await client.query("UPDATE staff_notifications SET processed_at = now(), result = $2 WHERE id = $1", [n.id, JSON.stringify(result)]);
      }
      return { processed: pending.length };
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext('fox-staff-notify'))");
    }
  });
}

async function deliver(
  client: import("pg").PoolClient, n: Pending, kind: NotifyKind, staff: Recipient[], ch: ReturnType<typeof channels>,
): Promise<Record<string, unknown>> {
  const { subject, text } = render(kind, n.ref_id ?? "", n.payload);
  const to = staff.filter((s) => kindsFor(s.role).includes(kind) && (!s.notify_kinds || s.notify_kinds.includes(kind)));
  let sent = 0;
  let failed = 0;
  for (const s of to) {
    const jobs: [("email" | "telegram"), () => Promise<void>][] = [];
    if (ch.email && s.notify_email && s.email) jobs.push(["email", () => sendEmail(s.email, subject, text)]);
    if (ch.telegram && s.notify_telegram && s.telegram_chat_id) jobs.push(["telegram", () => sendTelegram(s.telegram_chat_id!, text)]);
    for (const [channel, send] of jobs) {
      try {
        await send();
        sent++;
        await client.query("INSERT INTO staff_notification_log (notification_id, staff_id, channel, ok) VALUES ($1, $2, $3, true)", [n.id, s.id, channel]);
      } catch (error) {
        failed++;
        await client.query(
          "INSERT INTO staff_notification_log (notification_id, staff_id, channel, ok, error) VALUES ($1, $2, $3, false, $4)",
          [n.id, s.id, channel, String((error as Error).message ?? error).slice(0, 300)],
        );
      }
    }
  }
  return to.length ? { sent, failed } : { skipped: "нет получателей" };
}
