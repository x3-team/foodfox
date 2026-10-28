import { cabinetPartner, json } from "@/lib/partner-program/http";
import { submitAnalysis } from "@/lib/partner-program/rewards";

export const dynamic = "force-dynamic";

export const POST = json(async (session, req) => submitAnalysis(await cabinetPartner(session), await req.formData()));
