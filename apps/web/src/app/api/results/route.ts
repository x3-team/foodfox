import { NextResponse } from "next/server";
import { countZones } from "@/lib/fox-parser";
import { getOrCreateDemoClient, getResultsForClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = await getOrCreateDemoClient();
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
}
