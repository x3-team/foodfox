import { NextRequest, NextResponse } from "next/server";
import { refuseInternal } from "@/lib/internal-api";
import { DEFAULT_INSTRUCTIONS } from "@/lib/heli";
import { getAssistantConfig } from "@/lib/assistant-config";

export const dynamic = "force-dynamic";

/** The settings built into the code and the ones the app uses right now, for the admin's assistant page. */
export async function GET(req: NextRequest) {
  const refused = refuseInternal(req);
  if (refused) return refused;
  const current = await getAssistantConfig();
  return NextResponse.json({
    defaults: {
      instructions: DEFAULT_INSTRUCTIONS,
      model: process.env.HELI_CHAT_MODEL ?? "gpt-4o-mini",
      temperature: 0.72,
      maxTokens: 700,
    },
    current: { version: current.version },
    online: Boolean(process.env.FOX_HELI_API_KEY && process.env.HELI_BASE_URL),
  });
}
