import { NextRequest, NextResponse } from "next/server";
import { refuseInternal, UUID } from "@/lib/internal-api";
import { rebuildPlanFromStored, reprocessReport } from "@/lib/report-reprocess";

export const dynamic = "force-dynamic";

/** POST {mode: "parse"} parses the stored PDF again; {mode: "plan"} rebuilds the plan from the stored results. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = refuseInternal(req);
  if (refused) return refused;
  if (!UUID.test(params.id)) return NextResponse.json({ ok: false, error: "Bad id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  try {
    const result = body.mode === "plan" ? await rebuildPlanFromStored(params.id) : await reprocessReport(params.id);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (e) {
    console.error("internal reprocess failed", e);
    return NextResponse.json({ ok: false, error: "Ошибка на сервере приложения" }, { status: 500 });
  }
}
