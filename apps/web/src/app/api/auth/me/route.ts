import { NextResponse } from "next/server";
import { getAuthClientId, getAuthSession, handleAuthError } from "@/lib/api-auth";
import { getClientProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthSession();
    const clientId = await getAuthClientId();
    const profile = await getClientProfile(clientId);

    return NextResponse.json({
      user: {
        email: session.email,
        displayName: session.displayName,
      },
      profile,
    });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json({ error: "Ошибка профиля" }, { status: 500 });
  }
}
