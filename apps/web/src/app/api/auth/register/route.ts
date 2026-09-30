import { NextRequest, NextResponse } from "next/server";
import { buildAuthResponse } from "@/lib/auth-request";
import { setSessionCookie } from "@/lib/auth";
import { createRefreshToken, getDbPool, registerUser } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName =
      typeof body.displayName === "string" ? body.displayName : "";
    const consent = body.consent === true;

    if (!email.trim() || password.length < 6) {
      return NextResponse.json(
        { error: "Email и пароль (мин. 6 символов) обязательны" },
        { status: 400 },
      );
    }

    if (process.env.NODE_ENV === "production" && !consent) {
      return NextResponse.json(
        { error: "Необходимо согласие на обработку персональных данных" },
        { status: 400 },
      );
    }

    const session = await registerUser(email, password, displayName, { consent });
    setSessionCookie(session);
    const refreshToken = await createRefreshToken(session.userId);
    trackEvent(getDbPool(), session.clientId, "user_registered", { consent });

    return NextResponse.json(buildAuthResponse(session, refreshToken));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка регистрации";
    const status = message.includes("зарегистрирован") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
