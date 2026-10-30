import { NextResponse } from "next/server";
import { courseVideos } from "@/lib/course-media";

export const dynamic = "force-dynamic";

/** Videos found in the course media folder on the server, by lesson ("1", "3", "5-2"…). */
export async function GET() {
  return NextResponse.json({ videos: await courseVideos() }, { headers: { "Cache-Control": "public, max-age=60" } });
}
