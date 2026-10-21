import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getRecipesPageData } from "@/lib/db";
import { reportServerError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const data = await getRecipesPageData(clientId);
    return NextResponse.json(data);
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    reportServerError(e, { route: "GET /api/recipes" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
