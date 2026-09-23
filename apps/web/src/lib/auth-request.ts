import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import {
  ACCESS_TOKEN_MAX_AGE,
  decodeSession,
  encodeSession,
  type SessionData,
  SESSION_COOKIE,
  setSessionCookie,
} from "./auth";

export interface AuthTokenResponse {
  user: {
    email: string;
    displayName: string;
    role: SessionData["role"];
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function buildAuthResponse(
  session: SessionData,
  refreshToken: string,
): AuthTokenResponse {
  return {
    user: {
      email: session.email,
      displayName: session.displayName,
      role: session.role,
    },
    accessToken: encodeSession(session),
    refreshToken,
    expiresIn: ACCESS_TOKEN_MAX_AGE,
  };
}

/** Resolve session from HttpOnly cookie or Authorization: Bearer (mobile). */
export async function resolveSessionFromRequest(
  req?: NextRequest,
): Promise<SessionData | null> {
  const bearer = req?.headers.get("authorization") ?? headers().get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7).trim();
    if (token) return decodeSession(token);
  }

  const foxToken =
    req?.headers.get("x-fox-token") ?? headers().get("x-fox-token");
  if (foxToken) return decodeSession(foxToken.trim());

  const cookieToken =
    req?.cookies.get(SESSION_COOKIE)?.value ?? cookies().get(SESSION_COOKIE)?.value;
  if (cookieToken) return decodeSession(cookieToken);

  return null;
}

export function applySessionCookie(session: SessionData): AuthTokenResponse["user"] {
  setSessionCookie(session);
  return {
    email: session.email,
    displayName: session.displayName,
    role: session.role,
  };
}
