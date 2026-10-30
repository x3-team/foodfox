import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { deleteClientAccount } from "@/lib/account-deletion";
import { getAuthSession, handleAuthError } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/* «Удалить аккаунт» in the app profile (App Store and Google Play require it inside the app). The body must carry
   confirm: "DELETE", so a stray request cannot wipe an account. Everything is removed at once; see
   014_account_deletion.sql for what stays (a tombstone without contacts, the masked consent register). */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (session.role === "partner") {
      return NextResponse.json({ error: "Аккаунт партнёра удаляется через поддержку" }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as { confirm?: unknown; reason?: unknown };
    if (body.confirm !== "DELETE") {
      return NextResponse.json({ error: "Подтвердите удаление" }, { status: 400 });
    }
    const pool = getDbPool();
    if (!pool) return NextResponse.json({ error: "База недоступна" }, { status: 503 });
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : null;
    const deleted = await deleteClientAccount(pool, session.userId, reason);
    const response = NextResponse.json({ ok: true, deleted });
    clearSessionCookie();
    return response;
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json({ error: "Не удалось удалить аккаунт. Напишите в поддержку" }, { status: 500 });
  }
}
