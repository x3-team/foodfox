import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getClientProfile, loadDemoReport } from "@/lib/db";
import { countZones } from "@/lib/fox-parser";

export async function POST() {
  try {
    const clientId = await getAuthClientId();
    const profile = await getClientProfile(clientId);
    if (profile.hasReport) {
      return NextResponse.json(
        { error: "У вас уже есть отчёт. Демо-загрузка доступна только для нового аккаунта." },
        { status: 409 },
      );
    }

    const { reportId, planId, results } = await loadDemoReport(clientId);
    const counts = countZones(
      results.map((r) => ({
        foxName: r.foxName,
        valueUgMl: r.valueUgMl,
        isFloorValue: r.isFloorValue,
        zone: r.zone,
      })),
    );

    return NextResponse.json({
      reportId,
      planId,
      parsedCount: results.length,
      counts,
      demo: true,
    });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка демо-загрузки" },
      { status: 500 },
    );
  }
}
