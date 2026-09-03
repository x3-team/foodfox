import { NextRequest, NextResponse } from "next/server";
import { buildAuthResponse } from "@/lib/auth-request";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import {
  createRefreshToken,
  refreshSessionFromToken,
  revokeRefreshToken,
} from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const refreshToken =
      typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";
    if (!refreshToken) {
      return NextResponse.json({ error: "refreshToken required" }, { status: 400 });
    }

    const session = await refreshSessionFromToken(refreshToken);
    if (!session) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    setSessionCookie(session);
    const newRefresh = await createRefreshToken(session.userId);
    return NextResponse.json(buildAuthResponse(session, newRefresh));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken =
      typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";
    if (refreshToken) await revokeRefreshToken(refreshToken);
    clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
