import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, handleAuthError } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import { addClientMessage, getTicket, SupportError } from "@/lib/support";

export const dynamic = "force-dynamic";

/* One request: GET the conversation (marks the specialist's replies as read), POST { message } to write again. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    const pool = getDbPool();
    const ticket = pool ? await getTicket(pool, session.userId, params.id) : null;
    if (!ticket) return NextResponse.json({ error: "Обращение не найдено" }, { status: 404 });
    return NextResponse.json({ ticket });
  } catch (e) {
    return fail(e, "Не удалось загрузить обращение");
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    const pool = getDbPool();
    if (!pool) return NextResponse.json({ error: "База недоступна" }, { status: 503 });
    const body = (await req.json().catch(() => ({}))) as { message?: unknown };
    if (!(await addClientMessage(pool, session.userId, params.id, body.message))) {
      return NextResponse.json({ error: "Обращение не найдено" }, { status: 404 });
    }
    return NextResponse.json({ ticket: await getTicket(pool, session.userId, params.id) });
  } catch (e) {
    return fail(e, "Не удалось отправить сообщение");
  }
}

function fail(e: unknown, message: string) {
  const auth = handleAuthError(e);
  if (auth) return auth;
  if (e instanceof SupportError) return NextResponse.json({ error: e.message }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: message }, { status: 500 });
}
