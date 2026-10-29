import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Field-level encryption for health data (symptom diary).
 *
 * AES-256-GCM with a fresh 12-byte IV per value. The row's owner and day go in
 * as associated data, so a ciphertext copied onto another client's row, or
 * another day, fails to open instead of showing someone else's entry.
 *
 * Stored shape: `v1:<base64(iv | tag | ciphertext)>`. The version prefix leaves
 * room for key rotation: a new key gets `v2`, old rows keep opening with the
 * previous one until they are re-saved.
 *
 * Key: FOX_HEALTH_DATA_KEY, 32 random bytes as base64 or hex
 * (`openssl rand -base64 32`). Required in production. Outside production a
 * fixed development key stands in, so local runs work without setup and can
 * never open production data.
 */

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class HealthKeyMissingError extends Error {
  constructor() {
    super("FOX_HEALTH_DATA_KEY is not set");
    this.name = "HealthKeyMissingError";
  }
}

let cachedKey: Buffer | undefined;
let warned = false;

function parseKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  const b64 = Buffer.from(trimmed, "base64");
  return b64.length === 32 ? b64 : null;
}

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.FOX_HEALTH_DATA_KEY;
  if (raw) {
    const parsed = parseKey(raw);
    if (!parsed) throw new Error("FOX_HEALTH_DATA_KEY must be 32 bytes (base64 or hex)");
    cachedKey = parsed;
    return parsed;
  }
  if (process.env.NODE_ENV === "production") throw new HealthKeyMissingError();
  if (!warned) {
    warned = true;
    console.warn("FOX_HEALTH_DATA_KEY is not set; using the development key");
  }
  cachedKey = createHash("sha256").update("foodfox-dev-health-key").digest();
  return cachedKey;
}

/** Fails fast at the route, before anything is read or written. */
export function assertHealthKey(): void {
  key();
}

export function encryptHealth(value: unknown, aad: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const packed = Buffer.concat([iv, cipher.getAuthTag(), body]);
  return `${VERSION}:${packed.toString("base64")}`;
}

export function decryptHealth<T>(stored: string, aad: string): T {
  const [version, data] = stored.split(":", 2);
  if (version !== VERSION || !data) throw new Error("Unknown health payload version");
  const packed = Buffer.from(data, "base64");
  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const body = packed.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(body), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}

/** For tests that switch keys. */
export function resetHealthKeyForTests(): void {
  cachedKey = undefined;
  warned = false;
}
