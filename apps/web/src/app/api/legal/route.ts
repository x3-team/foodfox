import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/* The legal documents in force now, for the sign-in screen of the app: title, version, link. */
export async function GET() {
  const pool = getDbPool();
  const { rows } = pool
    ? await pool
        .query(`SELECT kind, version, title, url, effective_from FROM legal_documents WHERE is_current ORDER BY kind`)
        .catch(() => ({ rows: [] }))
    : { rows: [] };
  return NextResponse.json({ documents: rows });
}
