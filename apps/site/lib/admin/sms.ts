import { one } from "@/lib/admin/db";

/* The admin's view of the sign-in SMS (apps/web/src/lib/sms.ts sends them; both processes read apps/web/.env). */

const env = (name: string) => process.env[name]?.trim() || "";

export function smsSetup(): { provider: "smsru" | "smsc" | null; sender: string } {
  const p = env("FOX_SMS_PROVIDER").toLowerCase();
  const provider = p === "smsru" && env("FOX_SMSRU_API_ID") ? "smsru" : p === "smsc" && env("FOX_SMSC_LOGIN") && env("FOX_SMSC_PASSWORD") ? "smsc" : null;
  return { provider, sender: env("FOX_SMS_SENDER") };
}

export const SMS_PROVIDERS = { smsru: "SMS.ru", smsc: "SMSC.ru" } as const;

export async function smsBalance(): Promise<number | null> {
  const { provider } = smsSetup();
  try {
    if (provider === "smsru") {
      const res = await fetch("https://sms.ru/my/balance", {
        method: "POST", body: new URLSearchParams({ api_id: env("FOX_SMSRU_API_ID"), json: "1" }), signal: AbortSignal.timeout(8_000), cache: "no-store",
      });
      const data = (await res.json()) as { status?: string; balance?: number };
      return data.status === "OK" && data.balance != null ? Number(data.balance) : null;
    }
    if (provider === "smsc") {
      const res = await fetch("https://smsc.ru/sys/balance.php", {
        method: "POST", body: new URLSearchParams({ login: env("FOX_SMSC_LOGIN"), psw: env("FOX_SMSC_PASSWORD"), fmt: "3" }), signal: AbortSignal.timeout(8_000), cache: "no-store",
      });
      const data = (await res.json()) as { balance?: string };
      return data.balance != null ? Number(data.balance) : null;
    }
  } catch {
    /* the card says «не удалось узнать» */
  }
  return null;
}

export type SmsStats = { sent: number; failed: number; cost: number; last_error: string | null; last_error_at: Date | null };

export async function smsStats(): Promise<SmsStats | null> {
  return one<SmsStats>(
    `SELECT count(*) FILTER (WHERE ok)::int AS sent, count(*) FILTER (WHERE NOT ok)::int AS failed,
            coalesce(sum(cost), 0)::float AS cost,
            (SELECT error FROM sms_log WHERE NOT ok ORDER BY id DESC LIMIT 1) AS last_error,
            (SELECT created_at FROM sms_log WHERE NOT ok ORDER BY id DESC LIMIT 1) AS last_error_at
       FROM sms_log WHERE created_at > now() - interval '1 day'`,
  ).catch(() => null);
}
