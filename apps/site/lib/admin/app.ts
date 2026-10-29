import { createHmac } from "crypto";
import type { Staff } from "./auth";
import { one, q } from "./db";

/* The mobile app's data: users / clients / reports / test_results / nutrition_plans of apps/web, same Postgres.
   The admin reads these tables directly (the site connects as their owner, so RLS does not apply) and goes through
   apps/web only where the app's own code must run: re-parsing a PDF and reading the stored file. */

export const REPORT_STATUSES = {
  pending: "В очереди",
  parsing: "Обрабатывается",
  review: "На проверке",
  failed: "Ошибка",
  ready: "Готов",
} as const;
export type ReportStatus = keyof typeof REPORT_STATUSES;
export const isReportStatus = (v: string): v is ReportStatus => v in REPORT_STATUSES;

export const ZONES = { red: "Красная", yellow: "Жёлтая", green: "Зелёная" } as const;
export type Zone = keyof typeof ZONES;
export const isZone = (v: string): v is Zone => v in ZONES;

/** Parser confidence below this goes to the moderation queue even when the status says ready. */
export const LOW_CONFIDENCE = 0.75;

/** +7 925 ***-**-11: enough to match a caller, not enough to copy. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  return phone.length === 11 ? `+7 ${phone.slice(1, 4)} ***-**-${phone.slice(9)}` : `***${phone.slice(-2)}`;
}

export function fullPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  return phone.length === 11 ? `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}` : phone;
}

/** The app names every new client "Клиент"; tell them apart by the last digits of the phone. */
export function clientTitle(name: string | null | undefined, phone: string | null | undefined): string {
  const n = name?.trim();
  if (n && n !== "Клиент") return n;
  return phone ? `Клиент ···${phone.slice(-4)}` : "Клиент";
}

/** True once apps/web has created its tables and 011_app_admin.sql has added the admin columns. */
export async function appReady(): Promise<boolean> {
  const row = await one<{ ok: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'blocked_at') AS ok`,
  ).catch(() => null);
  return Boolean(row?.ok);
}

// ---------- Medical data access ----------

export const MEDICAL_REASONS = [
  "Модерация отчёта",
  "Обращение клиента в поддержку",
  "Проверка качества распознавания",
  "Запрос клиента на выгрузку данных",
] as const;
export const GRANT_MINUTES = 30;

/** When this staff member's access to the client's medical data runs out, or null if there is none. */
export async function medicalGrant(staff: Staff, clientId: string): Promise<Date | null> {
  const row = await one<{ expires_at: Date }>(
    `SELECT expires_at FROM admin_medical_grants WHERE staff_id = $1 AND client_id = $2 AND expires_at > now()
      ORDER BY expires_at DESC LIMIT 1`,
    [staff.id, clientId],
  );
  return row ? new Date(row.expires_at) : null;
}

// ---------- apps/web internal API ----------

/* Shared secret for the internal routes of apps/web. Both processes load apps/web/.env, so without an explicit
   FOX_INTERNAL_TOKEN it is derived from SESSION_SECRET and nobody has to set a new key. */
export function internalToken(): string | null {
  const explicit = process.env.FOX_INTERNAL_TOKEN?.trim();
  if (explicit) return explicit;
  const secret = process.env.SESSION_SECRET ?? process.env.FOX_SESSION_SECRET;
  return secret ? createHmac("sha256", secret).update("fox-internal-api").digest("base64url") : null;
}

const webUrl = () => (process.env.FOX_WEB_INTERNAL_URL || `http://127.0.0.1:${process.env.WEB_PORT || 3030}`).replace(/\/$/, "");

export async function callWeb(path: string, init: RequestInit = {}): Promise<Response> {
  const token = internalToken();
  if (!token) throw new Error("Не задан SESSION_SECRET: связь с сервером приложения не настроена");
  return fetch(`${webUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...(init.headers ?? {}), "x-fox-internal": token },
    signal: init.signal ?? AbortSignal.timeout(60_000),
  });
}

/** Reports a moderator still has to look at: failed, flagged by the parser, or "ready" with low confidence. */
export function queueWhere(alias = ""): string {
  const t = alias ? `${alias}.` : "";
  return `${t}reviewed_at IS NULL AND (${t}status IN ('review', 'failed') OR (${t}status = 'ready' AND ${t}parse_confidence < ${LOW_CONFIDENCE}))`;
}

export type AppCounts = { users: number; users_week: number; blocked: number; reports_week: number; queue: number; failed_week: number; plans: number };

export async function appCounts(): Promise<AppCounts | null> {
  const rows = await q<AppCounts>(`
    SELECT (SELECT count(*)::int FROM users WHERE role = 'client') AS users,
           (SELECT count(*)::int FROM users WHERE role = 'client' AND created_at > now() - interval '7 days') AS users_week,
           (SELECT count(*)::int FROM users WHERE blocked_at IS NOT NULL) AS blocked,
           (SELECT count(*)::int FROM reports WHERE created_at > now() - interval '7 days') AS reports_week,
           (SELECT count(*)::int FROM reports WHERE ${queueWhere()}) AS queue,
           (SELECT count(*)::int FROM reports WHERE status = 'failed' AND created_at > now() - interval '7 days') AS failed_week,
           (SELECT count(*)::int FROM nutrition_plans WHERE status = 'active') AS plans`).catch(() => []);
  return rows[0] ?? null;
}
