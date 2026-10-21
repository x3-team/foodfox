import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getUnreadCount, markMessagesRead } from "@/lib/db";
import { reportServerError } from "@/lib/monitoring";

// Reads the caller's session, so it must never be prerendered; stated
// explicitly to match the rest of the API and keep it that way.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const count = await getUnreadCount(clientId);
    return NextResponse.json({ count });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    reportServerError(e, { route: "GET /api/chat/unread" });
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
    reportServerError(e, { route: "PATCH /api/chat/unread" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
