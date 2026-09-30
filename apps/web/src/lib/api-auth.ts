import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "./auth";
import { resolveSessionFromRequest } from "./auth-request";

export { AuthError };

export async function getAuthSession(req?: NextRequest) {
  const session = await resolveSessionFromRequest(req);
  if (!session) throw new AuthError();
  return session;
}

export async function getAuthClientId(req?: NextRequest): Promise<string> {
  const session = await getAuthSession(req);
  return session.clientId;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function handleAuthError(e: unknown): NextResponse | null {
  if (e instanceof AuthError) return unauthorizedResponse();
  return null;
}
