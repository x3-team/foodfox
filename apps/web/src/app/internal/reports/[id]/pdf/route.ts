import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { refuseInternal, UUID } from "@/lib/internal-api";
import { readReportPdf } from "@/lib/report-storage";

export const dynamic = "force-dynamic";

/** The stored PDF of any report, for the moderator's side-by-side check. The admin checks rights and logs access. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = refuseInternal(req);
  if (refused) return refused;
  const pool = getDbPool();
  if (!pool || !UUID.test(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { rows } = await pool.query(`SELECT client_id FROM reports WHERE id = $1`, [params.id]);
  const pdf = rows[0] ? await readReportPdf(rows[0].client_id, params.id) : null;
  if (!pdf) return NextResponse.json({ error: "PDF не сохранён" }, { status: 404 });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" },
  });
}
