import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getClientProfile, getFullPlan } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const [plan, profile] = await Promise.all([
      getFullPlan(clientId),
      getClientProfile(clientId),
    ]);

    return NextResponse.json({
      plan,
      currentWeek: profile.currentWeek,
      hasReport: profile.hasReport,
    });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json({ error: "Ошибка загрузки плана" }, { status: 500 });
  }
}
