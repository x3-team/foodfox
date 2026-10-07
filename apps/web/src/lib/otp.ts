import { createHash, randomInt } from "crypto";

export const OTP_LENGTH = 4;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MS = 42 * 1000;

/** Normalise any user input to 11 digits starting with 7. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return `7${digits.slice(1)}`;
  }
  if (digits.length === 10) return `7${digits}`;
  return null;
}

export function formatPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`;
}

export function generateOtp(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) code += randomInt(0, 10).toString();
  return code;
}

export function hashOtp(phone: string, code: string): string {
  const secret = process.env.SESSION_SECRET ?? "foodfox-dev-session";
  return createHash("sha256").update(`${secret}:${phone}:${code}`).digest("hex");
}

/**
 * Partner-cabinet demo: the same number and code as the mobile app demo, so
 * one test account opens both. The partner role is granted per login (verify
 * with intent "partner"), never stored, so the mobile client login on this
 * number stays a client. See verifyPhoneOtp in lib/db.ts.
 */
export const PARTNER_DEMO_PHONE_DEFAULT = "79251111111";

export function partnerDemoPhone(): string {
  return (
    normalizePhone(process.env.FOX_PARTNER_DEMO_PHONE ?? PARTNER_DEMO_PHONE_DEFAULT) ??
    PARTNER_DEMO_PHONE_DEFAULT
  );
}

export function isPartnerDemoPhone(phone: string): boolean {
  return phone === partnerDemoPhone();
}

/**
 * Echo the fixed code in the HTTP response only when the operator turned demo
 * mode on. Login still accepts the fixed code when the flag is off.
 */
export function isDemoMode(): boolean {
  const flag = (process.env.FOX_DEMO_MODE ?? "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/**
 * Demo numbers bypass the SMS gateway and always accept a fixed code, so the
 * app can be reviewed without a live provider. Every other number gets null.
 */
export function demoCodeFor(phone: string): string | null {
  if (isPartnerDemoPhone(phone)) {
    // Defaults to the client demo code: the number is shared with the app.
    return process.env.FOX_PARTNER_DEMO_OTP ?? process.env.FOX_DEMO_OTP ?? "1111";
  }
  // Normalise the configured list the same way the caller's number was
  // normalised. Operators write these by hand in .env and reasonably reach for
  // "+7 925 111-11-11"; comparing raw strings silently issues a real random
  // code instead, and the demo account then cannot log in at all.
  const demo = (process.env.FOX_DEMO_PHONES ?? "79251111111,79991234567")
    .split(",")
    .map((p) => normalizePhone(p))
    .filter((p): p is string => p !== null);
  return demo.includes(phone) ? (process.env.FOX_DEMO_OTP ?? "1111") : null;
}

/**
 * JSON body for POST /api/auth/otp/request.
 * `demoCode` is present only for a demo number and only when FOX_DEMO_MODE is set.
 */
export function otpRequestPayload(
  phone: string,
  resendAfterMs: number,
  demoCode: string | null,
): { ok: true; phone: string; resendAfterMs: number; demoCode?: string } {
  const body: { ok: true; phone: string; resendAfterMs: number; demoCode?: string } = {
    ok: true,
    phone,
    resendAfterMs,
  };
  if (demoCode && isDemoMode()) body.demoCode = demoCode;
  return body;
}
