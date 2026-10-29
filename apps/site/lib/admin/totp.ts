import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/* RFC 6238 one-time codes (SHA-1, 6 digits, 30 s), what Google Authenticator, Яндекс Ключ, 1Password and the rest
   expect. A code is accepted one step either side of now, and never for a step at or before the last accepted one. */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;

export function newSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function decode(secret: string): Buffer {
  const clean = secret.replace(/[\s=]/g, "").toUpperCase();
  let bits = "";
  for (const c of clean) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) throw new Error("bad base32");
    bits += v.toString(2).padStart(5, "0");
  }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

function codeAt(key: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", key).update(counter).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const n = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** The step the code matches, or null. Pass the last accepted step so a code cannot be replayed. */
export function verifyCode(secret: string, code: string, lastStep = 0, now = Date.now()): number | null {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return null;
  const key = decode(secret);
  const current = Math.floor(now / 1000 / STEP);
  for (const step of [current, current - 1, current + 1]) {
    if (step <= lastStep) continue;
    if (timingSafeEqual(Buffer.from(codeAt(key, step)), Buffer.from(clean))) return step;
  }
  return null;
}

export function otpauthUri(secret: string, account: string): string {
  const issuer = "FOX Админка";
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP}`;
}

/** The secret in groups of four, easier to type by hand. */
export const groupSecret = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();
