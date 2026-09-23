import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getChatMessages } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const messages = await getChatMessages(clientId);
    return NextResponse.json({ messages });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
