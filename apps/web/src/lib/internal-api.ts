import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Routes under /internal serve the admin (apps/site) on the same server only.
 * The caller sends x-fox-internal: FOX_INTERNAL_TOKEN, or when that is not
 * set, an HMAC of SESSION_SECRET (both processes load apps/web/.env). A request
 * that came through nginx carries X-Real-IP and is refused whatever token it
 * has (X-Forwarded-For is no signal: Next.js adds it to every request).
 */

function expectedToken(): string | null {
  const explicit = process.env.FOX_INTERNAL_TOKEN?.trim();
  if (explicit) return explicit;
  const secret = process.env.SESSION_SECRET ?? process.env.FOX_SESSION_SECRET;
  return secret ? createHmac("sha256", secret).update("fox-internal-api").digest("base64url") : null;
}

/** null when the caller may go on, otherwise the response to send. */
export function refuseInternal(req: NextRequest): NextResponse | null {
  const notFound = NextResponse.json({ error: "Not found" }, { status: 404 });
  if (req.headers.get("x-real-ip")) return notFound;
  const expected = expectedToken();
  const got = req.headers.get("x-fox-internal") ?? "";
  if (!expected || got.length !== expected.length) return notFound;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected)) ? null : notFound;
}

export const UUID = /^[0-9a-f-]{36}$/i;
