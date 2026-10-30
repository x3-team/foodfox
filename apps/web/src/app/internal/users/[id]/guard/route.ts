import { NextRequest, NextResponse } from "next/server";
import { forgetAccount } from "@/lib/account-guard";
import { refuseInternal } from "@/lib/internal-api";

export const dynamic = "force-dynamic";

/** The admin blocked, unblocked or signed out this client: drop the cached answer so it applies on the next request. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = refuseInternal(req);
  if (refused) return refused;
  forgetAccount(params.id);
  return NextResponse.json({ ok: true });
}
