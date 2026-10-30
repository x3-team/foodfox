import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

/* Partners' personal data (passport, ИНН, bank details, scans) never lands on disk or in Postgres in the clear.
   AES-256-GCM with the key from FOX_PD_KEY (32 bytes, base64: `openssl rand -base64 32`). The same format is read by
   apps/site/lib/admin/pd-seal.ts, where the accountant opens it; keep the two in step.
   Sealed text: "v1." + base64url(iv 12 | tag 16 | ciphertext). Sealed file: the same bytes without the prefix. */

const PREFIX = "v1.";

export class PdDisabledError extends Error {
  constructor() {
    super("Приём документов временно выключен: на сервере не задан ключ шифрования");
    this.name = "PdDisabledError";
  }
}

function key(): Buffer {
  const raw = process.env.FOX_PD_KEY?.trim();
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("FOX_PD_KEY must be 32 bytes in base64");
    return k;
  }
  // Production refuses to take documents without a real key; development uses a fixed throwaway one.
  if (process.env.NODE_ENV === "production") throw new PdDisabledError();
  return createHash("sha256").update("foodfox-dev-pd-key").digest();
}

export function pdEnabled(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

function seal(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

function open(sealed: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key(), sealed.subarray(0, 12));
  decipher.setAuthTag(sealed.subarray(12, 28));
  return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
}

export function sealJson(value: unknown): string {
  return PREFIX + seal(Buffer.from(JSON.stringify(value), "utf-8")).toString("base64url");
}

export function openJson<T>(text: string): T {
  if (!text.startsWith(PREFIX)) throw new Error("Unknown sealed format");
  return JSON.parse(open(Buffer.from(text.slice(PREFIX.length), "base64url")).toString("utf-8")) as T;
}

export function pdDir(): string {
  return process.env.FOX_PD_DIR ?? join(process.cwd(), "../../data/partner-pd");
}

/** Writes a sealed copy and returns its path relative to pdDir(). */
export async function storeSealedFile(partnerKey: string, data: Buffer): Promise<string> {
  const rel = join(partnerKey.replace(/[^a-zA-Z0-9-]/g, ""), `${randomUUID()}.bin`);
  const full = join(pdDir(), rel);
  await mkdir(dirname(full), { recursive: true, mode: 0o700 });
  await writeFile(full, seal(data), { mode: 0o600 });
  return rel;
}

export async function readSealedFile(rel: string): Promise<Buffer> {
  if (rel.includes("..")) throw new Error("Bad path");
  return open(await readFile(join(pdDir(), rel)));
}
