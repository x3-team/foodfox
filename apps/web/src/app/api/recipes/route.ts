import { NextResponse } from "next/server";
import { getActivePlanContext, getOrCreateDemoClient, getRecipes } from "@/lib/db";

export async function GET() {
  const clientId = await getOrCreateDemoClient();
  const ctx = await getActivePlanContext(clientId);
  const recipes = await getRecipes();
  return NextResponse.json({
    recipes,
    weekNumber: ctx?.weekNumber ?? 1,
  });
}
