import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";

// This handler touches no request data, so the App Router would happily
// prerender it and serve a body frozen at build time — which is how a
// deployment with DATABASE_URL set kept reporting `database: "memory"` next to
// a timestamp weeks old. A health check has to be evaluated per request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const dbOk = hasDatabase();
  if (process.env.NODE_ENV === "production" && !dbOk) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "foodfox-web",
        database: "missing",
        error: "DATABASE_URL not configured",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: "ok",
    service: "foodfox-web",
    database: dbOk ? "postgres" : "memory",
    timestamp: new Date().toISOString(),
  });
}
