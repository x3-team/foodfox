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
 * Demo numbers bypass the SMS gateway and always accept a fixed code, so the
 * app can be reviewed without a live provider.
 */
export function demoCodeFor(phone: string): string | null {
  const demo = (process.env.FOX_DEMO_PHONES ?? "79991234567")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return demo.includes(phone) ? (process.env.FOX_DEMO_OTP ?? "4747") : null;
}
