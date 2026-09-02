import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getActivePlanContext, getRecipesForClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const ctx = await getActivePlanContext(clientId);
    const recipes = await getRecipesForClient(clientId);
    const suitableCount = recipes.filter((r) => r.suitable).length;
    return NextResponse.json({
      recipes,
      weekNumber: ctx?.weekNumber ?? 1,
      suitableCount,
      totalCount: recipes.length,
    });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
