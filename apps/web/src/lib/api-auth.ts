import { NextResponse } from "next/server";
import { AuthError, requireClientId, requireSession } from "./auth";

export { AuthError };

export async function getAuthClientId(): Promise<string> {
  return requireClientId();
}

export async function getAuthSession() {
  return requireSession();
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function handleAuthError(e: unknown): NextResponse | null {
  if (e instanceof AuthError) return unauthorizedResponse();
  return null;
}
