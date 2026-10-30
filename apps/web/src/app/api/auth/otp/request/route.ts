import { NextRequest, NextResponse } from "next/server";
import { requestPhoneOtp } from "@/lib/db";
import { normalizePhone, otpRequestPayload } from "@/lib/otp";
import { SmsError } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhone(
      typeof body.phone === "string" ? body.phone : "",
    );
    if (!phone) {
      return NextResponse.json({ error: "Неверный номер телефона" }, { status: 400 });
    }

    const ip = (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "").trim() || null;
    const { resendAfterMs, demoCode } = await requestPhoneOtp(phone, ip);

    return NextResponse.json(otpRequestPayload(phone, resendAfterMs, demoCode));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не удалось отправить код";
    const status = message.startsWith("Повторная отправка") || message.startsWith("Слишком много")
      ? 429
      : e instanceof SmsError ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
