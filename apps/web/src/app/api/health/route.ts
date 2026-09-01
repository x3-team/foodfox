import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "foodfox-web",
    database: hasDatabase() ? "postgres" : "memory",
    timestamp: new Date().toISOString(),
  });
}
