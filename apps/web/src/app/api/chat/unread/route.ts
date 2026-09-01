import { NextResponse } from "next/server";
import { getOrCreateDemoClient, getUnreadCount, markMessagesRead } from "@/lib/db";

export async function GET() {
  const clientId = await getOrCreateDemoClient();
  const count = await getUnreadCount(clientId);
  return NextResponse.json({ count });
}

export async function PATCH() {
  const clientId = await getOrCreateDemoClient();
  const count = await markMessagesRead(clientId);
  return NextResponse.json({ marked: count });
}
