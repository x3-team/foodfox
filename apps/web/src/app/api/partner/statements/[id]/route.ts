import type { NextRequest } from "next/server";
import { cabinetPartner, json } from "@/lib/partner-program/http";
import { statementAction } from "@/lib/partner-program/rewards";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return json(async (session) => {
    const body = (await req.json().catch(() => ({}))) as { action?: string; note?: string; track?: string };
    await statementAction(await cabinetPartner(session), params.id, String(body.action ?? ""), body);
    return { ok: true };
  })(req);
}
