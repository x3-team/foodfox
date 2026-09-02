import { NextResponse } from "next/server";
import { getChatMessages, getOrCreateDemoClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = await getOrCreateDemoClient();
  const messages = await getChatMessages(clientId);
  return NextResponse.json({ messages });
}
