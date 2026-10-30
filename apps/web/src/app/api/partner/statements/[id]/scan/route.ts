import type { NextRequest } from "next/server";
import { cabinetPartner, json } from "@/lib/partner-program/http";
import { uploadActScan } from "@/lib/partner-program/rewards";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return json(async (session) => {
    await uploadActScan(await cabinetPartner(session), params.id, await req.formData());
    return { ok: true };
  })(req);
}
