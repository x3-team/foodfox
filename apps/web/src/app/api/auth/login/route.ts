import { NextRequest, NextResponse } from "next/server";
import { buildAuthResponse } from "@/lib/auth-request";
import { setSessionCookie } from "@/lib/auth";
import { createRefreshToken, getDbPool, loginUser } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email.trim() || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 },
      );
    }

    const session = await loginUser(email, password);
    if (!session) {
      return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
    }

    setSessionCookie(session);
    const refreshToken = await createRefreshToken(session.userId);
    trackEvent(getDbPool(), session.clientId, "user_logged_in", {});

    return NextResponse.json(buildAuthResponse(session, refreshToken));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка входа" }, { status: 500 });
  }
}
