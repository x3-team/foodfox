import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { buildAuthResponse } from "@/lib/auth-request";
import { createRefreshToken, verifyPhoneOtp } from "@/lib/db";
import { normalizePhone } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhone(
      typeof body.phone === "string" ? body.phone : "",
    );
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!phone || !/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: "Неверный код" }, { status: 400 });
    }

    const session = await verifyPhoneOtp(phone, code);
    if (!session) {
      return NextResponse.json(
        { error: "Код неверный или истёк" },
        { status: 401 },
      );
    }

    setSessionCookie(session);
    const refreshToken = await createRefreshToken(session.userId);
    return NextResponse.json(buildAuthResponse(session, refreshToken));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не удалось проверить код";
    const status = message.startsWith("Слишком много") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
