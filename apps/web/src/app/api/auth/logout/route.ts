import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { revokeRefreshToken } from "@/lib/db";
import { reportServerError } from "@/lib/monitoring";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken =
      typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";
    if (refreshToken) await revokeRefreshToken(refreshToken);
    clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (e) {
    reportServerError(e, { route: "POST /api/auth/logout" });
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
