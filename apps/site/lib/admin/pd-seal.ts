import { createDecipheriv, createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";

/* Opens what the partner cabinet sealed (apps/web/src/lib/partner-program/seal.ts): AES-256-GCM with FOX_PD_KEY,
   "v1." + base64url(iv 12 | tag 16 | ciphertext). The admin only reads; keep the format in step with the cabinet. */

function key(): Buffer {
  const raw = process.env.FOX_PD_KEY?.trim();
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("FOX_PD_KEY must be 32 bytes in base64");
    return k;
  }
  if (process.env.NODE_ENV === "production") throw new Error("FOX_PD_KEY не задан — персональные данные не открыть");
  return createHash("sha256").update("foodfox-dev-pd-key").digest();
}

function open(sealed: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key(), sealed.subarray(0, 12));
  decipher.setAuthTag(sealed.subarray(12, 28));
  return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
}

export function openJson<T>(text: string): T {
  if (!text.startsWith("v1.")) throw new Error("Unknown sealed format");
  return JSON.parse(open(Buffer.from(text.slice(3), "base64url")).toString("utf-8")) as T;
}

/* The site runs from apps/site, the cabinet from apps/web: both default to <repo>/data/partner-pd. */
export function pdDir(): string {
  return process.env.FOX_PD_DIR ?? join(process.cwd(), "../../data/partner-pd");
}

export async function readSealedFile(rel: string): Promise<Buffer> {
  if (rel.includes("..")) throw new Error("Bad path");
  return open(await readFile(join(pdDir(), rel)));
}

export type PartnerPd = {
  passport: string;
  inn: string;
  postal: string;
  bank: { recipient: string; bik: string; account: string; name: string };
};
