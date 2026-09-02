import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "fox_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export interface SessionData {
  userId: string;
  clientId: string;
  email: string;
  displayName: string;
}

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

function secret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.FOX_SESSION_SECRET ??
    "foodfox-dev-session-change-in-production"
  );
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function encodeSession(data: SessionData): string {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function decodeSession(token: string): SessionData | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionData;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export function setSessionCookie(data: SessionData): void {
  cookies().set(SESSION_COOKIE, encodeSession(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) throw new AuthError();
  return session;
}

export async function requireClientId(): Promise<string> {
  const session = await requireSession();
  return session.clientId;
}
