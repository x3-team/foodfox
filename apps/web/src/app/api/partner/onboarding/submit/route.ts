import { submit } from "@/lib/partner-program/onboarding";
import { requestMeta } from "@/lib/consents";
import { json } from "@/lib/partner-program/http";

export const dynamic = "force-dynamic";

export const POST = json(async (session, req) => submit(session.userId, await req.formData(), requestMeta(req.headers)));
