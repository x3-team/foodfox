import { NextRequest, NextResponse } from "next/server";
import { requestPhoneOtp } from "@/lib/db";
import { normalizePhone } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhone(
      typeof body.phone === "string" ? body.phone : "",
    );
    if (!phone) {
      return NextResponse.json({ error: "Неверный номер телефона" }, { status: 400 });
    }

    const { resendAfterMs, demoCode } = await requestPhoneOtp(phone);

    return NextResponse.json({
      ok: true,
      phone,
      resendAfterMs,
      // Only present for allow-listed demo numbers.
      demoCode: demoCode ?? undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не удалось отправить код";
    const status = message.startsWith("Повторная отправка") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
