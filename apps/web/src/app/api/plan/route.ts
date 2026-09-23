import { NextRequest, NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getPlanOverview, getPlanWeek } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const clientId = await getAuthClientId();
    const overview = await getPlanOverview(clientId);
    if (!overview) {
      return NextResponse.json({
        plan: null,
        currentWeek: 1,
        hasReport: false,
        weekTabs: [],
      });
    }

    const weekParam = req.nextUrl.searchParams.get("week");
    const weekNumber = weekParam
      ? parseInt(weekParam, 10)
      : overview.currentWeek;
    const week = await getPlanWeek(clientId, weekNumber);

    return NextResponse.json({
      plan: week
        ? {
            planId: overview.planId,
            startedAt: overview.startedAt,
            weeks: [week],
          }
        : null,
      weekTabs: overview.weekTabs,
      currentWeek: overview.currentWeek,
      hasReport: overview.hasReport,
    });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json({ error: "Ошибка загрузки плана" }, { status: 500 });
  }
}
