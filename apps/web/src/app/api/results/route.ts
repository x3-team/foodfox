import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getResultsForClient } from "@/lib/db";
import { countZones } from "@/lib/fox-parser";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const results = await getResultsForClient(clientId);
    const counts = countZones(
      results.map((r) => ({
        foxName: r.foxName,
        valueUgMl: r.valueUgMl,
        isFloorValue: r.isFloorValue,
        zone: r.zone,
      })),
    );
    return NextResponse.json({ results, counts });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
