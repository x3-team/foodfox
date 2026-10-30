import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/admin/audit";
import { can, currentStaff } from "@/lib/admin/auth";
import { appendChunk, CHUNK, finishUpload, mediaView, startUpload } from "@/lib/admin/media";

export const dynamic = "force-dynamic";

/* Chunked upload for videos and big PDFs (components/admin/upload.ts):
   POST {name, type, size} → {id, chunk}; PUT ?id&offset with up to CHUNK raw bytes → {received}; POST {id, done: true} → {item}.
   Each request stays under nginx's client_max_body_size, and a dropped chunk is simply sent again. */

async function staffFor(request: NextRequest) {
  const staff = await currentStaff();
  if (!staff || !can(staff, "media")) return null;
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return null;
  return staff;
}

export async function POST(request: NextRequest) {
  const staff = await staffFor(request);
  if (!staff) return NextResponse.json({ error: "Войдите заново" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { id?: string; done?: boolean; name?: string; type?: string; size?: number };
  try {
    if (body.done && body.id) {
      const row = await finishUpload(body.id, staff.id);
      await audit(staff, { action: "upload", entity: "media", entityId: row.id, summary: `Загружен файл ${row.original_name}` });
      return NextResponse.json({ item: mediaView(row) });
    }
    const id = await startUpload({ name: String(body.name ?? ""), type: String(body.type ?? ""), size: Number(body.size) }, staff.id);
    return NextResponse.json({ id, chunk: CHUNK });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не загрузилось" }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const staff = await staffFor(request);
  if (!staff) return NextResponse.json({ error: "Войдите заново" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const offset = Number(request.nextUrl.searchParams.get("offset"));
  if (!Number.isInteger(offset) || offset < 0) return NextResponse.json({ error: "offset" }, { status: 400 });
  try {
    const bytes = Buffer.from(await request.arrayBuffer());
    return NextResponse.json({ received: await appendChunk(id, offset, bytes, staff.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не загрузилось" }, { status: 400 });
  }
}
