import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { registerUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName =
      typeof body.displayName === "string" ? body.displayName : "";

    if (!email.trim() || password.length < 6) {
      return NextResponse.json(
        { error: "Email и пароль (мин. 6 символов) обязательны" },
        { status: 400 },
      );
    }

    const session = await registerUser(email, password, displayName);
    setSessionCookie(session);

    return NextResponse.json({
      user: {
        email: session.email,
        displayName: session.displayName,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка регистрации";
    const status = message.includes("зарегистрирован") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
