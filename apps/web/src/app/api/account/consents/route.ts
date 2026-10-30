import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, handleAuthError } from "@/lib/api-auth";
import { withdrawClientConsents } from "@/lib/consents";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/* The client's consents (152-ФЗ): GET lists them, DELETE withdraws every active one.
   After a withdrawal the staff have 30 days to stop processing; the admin shows it in «Документы и согласия». */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const pool = getDbPool();
    if (!pool) return NextResponse.json({ consents: [] });
    const { rows } = await pool.query(
      `SELECT kind, version, accepted_at, withdrawn_at, stop_by FROM consents
        WHERE subject_type = 'client' AND subject_id = $1 ORDER BY accepted_at DESC`,
      [session.userId],
    );
    return NextResponse.json({ consents: rows });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json({ error: "Не удалось получить согласия" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const pool = getDbPool();
    if (!pool) return NextResponse.json({ error: "База недоступна" }, { status: 503 });
    const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : null;
    const result = await withdrawClientConsents(pool, session.userId, reason);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json({ error: "Не удалось отозвать согласие" }, { status: 500 });
  }
}
