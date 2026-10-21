import { NextResponse } from "next/server";
import { hasDatabase, q } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

/** For deploy/vps/update.sh: is the site connected to Postgres and are the admin tables in place. */
export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ database: "off" }, { status: 503 });
  try {
    const [row] = await q<{ admins: number }>("SELECT count(*)::int AS admins FROM admin_users WHERE role = 'admin' AND is_active");
    return NextResponse.json({ database: "postgres", admins: row.admins });
  } catch (error) {
    console.error("[admin] health", error);
    return NextResponse.json({ database: "error" }, { status: 503 });
  }
}
