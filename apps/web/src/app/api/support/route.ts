import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, handleAuthError } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import { createTicket, listTickets, SupportError } from "@/lib/support";

export const dynamic = "force-dynamic";

/* «Подключить специалиста»: GET lists the client's requests, POST { topic, message } opens a new one. */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const pool = getDbPool();
    if (!pool) return NextResponse.json({ tickets: [] });
    return NextResponse.json({ tickets: await listTickets(pool, session.userId) });
  } catch (e) {
    return fail(e, "Не удалось загрузить обращения");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const pool = getDbPool();
    if (!pool) return NextResponse.json({ error: "База недоступна" }, { status: 503 });
    const body = (await req.json().catch(() => ({}))) as { topic?: unknown; message?: unknown };
    const ticket = await createTicket(pool, session.userId, body.topic, body.message);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (e) {
    return fail(e, "Не удалось отправить обращение");
  }
}

function fail(e: unknown, message: string) {
  const auth = handleAuthError(e);
  if (auth) return auth;
  if (e instanceof SupportError) return NextResponse.json({ error: e.message }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: message }, { status: 500 });
}
