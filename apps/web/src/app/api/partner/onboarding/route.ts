import { answer, onboardingState } from "@/lib/partner-program/onboarding";
import { json } from "@/lib/partner-program/http";

export const dynamic = "force-dynamic";

export const GET = json((session) => onboardingState(session.userId));

export const POST = json(async (session, req) => {
  const body = (await req.json().catch(() => ({}))) as { step?: string; value?: unknown };
  return answer(session.userId, String(body.step ?? ""), body.value);
});
