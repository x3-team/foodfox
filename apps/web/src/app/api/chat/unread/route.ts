import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getUnreadCount, markMessagesRead } from "@/lib/db";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const count = await getUnreadCount(clientId);
    return NextResponse.json({ count });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const clientId = await getAuthClientId();
    await markMessagesRead(clientId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
