import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";

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
