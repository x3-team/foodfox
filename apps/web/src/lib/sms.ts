import { createHash } from "crypto";
import type { Pool } from "pg";

/*
 * SMS with the sign-in code. The provider and its keys come from .env, never from code:
 *   FOX_SMS_PROVIDER=smsru   FOX_SMSRU_API_ID=…                     (sms.ru, recommended)
 *   FOX_SMS_PROVIDER=smsc    FOX_SMSC_LOGIN=…  FOX_SMSC_PASSWORD=…  (smsc.ru, the spare one)
 *   FOX_SMS_SENDER=FoodFox   sender name, only once the provider has registered it with the operators
 * Without a provider nothing is sent: in development the code goes to the console (lib/db.ts requestPhoneOtp).
 *
 * Limits against SMS pumping (someone requesting codes to random numbers at our expense), counted in sms_log
 * (packages/database/migrations/017_sms_log.sql): per number and per IP per hour, and all numbers per day.
 */

export class SmsError extends Error {}

const env = (name: string) => process.env[name]?.trim() || "";
const num = (name: string, fallback: number) => Number(env(name)) || fallback;

export type SmsProvider = "smsru" | "smsc";

export function smsProvider(): SmsProvider | null {
  const p = env("FOX_SMS_PROVIDER").toLowerCase();
  if (p === "smsru" && env("FOX_SMSRU_API_ID")) return "smsru";
  if (p === "smsc" && env("FOX_SMSC_LOGIN") && env("FOX_SMSC_PASSWORD")) return "smsc";
  return null;
}

export const smsLimits = () => ({
  perPhoneHour: num("FOX_SMS_PER_PHONE_HOUR", 5),
  perIpHour: num("FOX_SMS_PER_IP_HOUR", 20),
  perDay: num("FOX_SMS_DAILY_LIMIT", 500),
});

const phoneHash = (phone: string) => createHash("sha256").update(`fox-sms:${phone}`).digest("hex");
const phoneMask = (phone: string) => `+${phone.slice(0, 1)} ··· ${phone.slice(-4)}`;

type Sent = { cost: number | null };

async function sendSmsRu(phone: string, text: string): Promise<Sent> {
  const body = new URLSearchParams({ api_id: env("FOX_SMSRU_API_ID"), to: phone, msg: text, json: "1" });
  if (env("FOX_SMS_SENDER")) body.set("from", env("FOX_SMS_SENDER"));
  const res = await fetch("https://sms.ru/sms/send", { method: "POST", body, signal: AbortSignal.timeout(15_000) });
  const data = (await res.json().catch(() => ({}))) as {
    status?: string; status_text?: string; sms?: Record<string, { status?: string; status_text?: string; cost?: string | number }>;
  };
  const one = data.sms?.[phone];
  if (data.status !== "OK" || one?.status !== "OK") throw new Error(one?.status_text || data.status_text || `sms.ru ${res.status}`);
  return { cost: one.cost == null ? null : Number(one.cost) };
}

async function sendSmsc(phone: string, text: string): Promise<Sent> {
  const body = new URLSearchParams({
    login: env("FOX_SMSC_LOGIN"), psw: env("FOX_SMSC_PASSWORD"), phones: phone, mes: text, fmt: "3", charset: "utf-8", cost: "3",
  });
  if (env("FOX_SMS_SENDER")) body.set("sender", env("FOX_SMS_SENDER"));
  const res = await fetch("https://smsc.ru/sys/send.php", { method: "POST", body, signal: AbortSignal.timeout(15_000) });
  const data = (await res.json().catch(() => ({}))) as { error?: string; id?: number; cost?: string };
  if (data.error || !data.id) throw new Error(data.error || `smsc.ru ${res.status}`);
  return { cost: data.cost == null ? null : Number(data.cost) };
}

/** The provider's balance in rubles, for the admin; null when unknown. */
export async function smsBalance(): Promise<number | null> {
  const provider = smsProvider();
  try {
    if (provider === "smsru") {
      const res = await fetch("https://sms.ru/my/balance", {
        method: "POST", body: new URLSearchParams({ api_id: env("FOX_SMSRU_API_ID"), json: "1" }), signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json()) as { status?: string; balance?: number };
      return data.status === "OK" && data.balance != null ? Number(data.balance) : null;
    }
    if (provider === "smsc") {
      const res = await fetch("https://smsc.ru/sys/balance.php", {
        method: "POST", body: new URLSearchParams({ login: env("FOX_SMSC_LOGIN"), psw: env("FOX_SMSC_PASSWORD"), fmt: "3" }), signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json()) as { balance?: string };
      return data.balance != null ? Number(data.balance) : null;
    }
  } catch {
    /* unknown */
  }
  return null;
}

/** Throws SmsError with a message for the client when a limit is reached. A missing sms_log never blocks a sign-in. */
export async function checkSmsLimits(pool: Pool, phone: string, ip: string | null): Promise<void> {
  const limits = smsLimits();
  try {
    const { rows } = await pool.query(
      `SELECT count(*) FILTER (WHERE phone_hash = $1 AND created_at > now() - interval '1 hour')::int AS phone,
              count(*) FILTER (WHERE $2::text IS NOT NULL AND ip = $2 AND created_at > now() - interval '1 hour')::int AS ip,
              count(*) FILTER (WHERE ok AND created_at > now() - interval '1 day')::int AS day
         FROM sms_log WHERE created_at > now() - interval '1 day'`,
      [phoneHash(phone), ip],
    );
    const c = rows[0];
    if (c.phone >= limits.perPhoneHour) throw new SmsError("Слишком много кодов на этот номер. Попробуйте через час");
    if (c.ip >= limits.perIpHour) throw new SmsError("Слишком много запросов. Попробуйте через час");
    if (c.day >= limits.perDay) {
      console.error("[sms] daily limit reached", limits.perDay);
      throw new SmsError("Вход по SMS временно недоступен. Напишите в поддержку FOX");
    }
  } catch (e) {
    if (e instanceof SmsError) throw e;
    if ((e as { code?: string }).code !== "42P01") console.error("[sms] limits", e);
  }
}

/** Sends the code. Throws SmsError (shown to the client) when the provider refuses. */
export async function sendCodeSms(pool: Pool, phone: string, code: string, ip: string | null): Promise<void> {
  const provider = smsProvider();
  if (!provider) throw new SmsError("Вход по SMS пока не подключён");
  const text = `Код FoodFox: ${code}. Никому его не сообщайте.`;
  let result: Sent | null = null;
  let error: string | null = null;
  try {
    result = provider === "smsru" ? await sendSmsRu(phone, text) : await sendSmsc(phone, text);
  } catch (e) {
    error = String((e as Error).message ?? e).slice(0, 300);
  }
  await pool
    .query(
      `INSERT INTO sms_log (phone_hash, phone_mask, ip, provider, ok, error, cost) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [phoneHash(phone), phoneMask(phone), ip, provider, !error, error, result?.cost ?? null],
    )
    .catch((e) => {
      if ((e as { code?: string }).code !== "42P01") console.error("[sms] log", e);
    });
  if (error) {
    console.error(`[sms] ${provider} failed for ${phoneMask(phone)}: ${error}`);
    throw new SmsError("Не получилось отправить SMS. Попробуйте ещё раз через минуту");
  }
}
