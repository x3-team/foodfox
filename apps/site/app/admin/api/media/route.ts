import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/admin/audit";
import { can, currentStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { mediaView, storeUpload, type MediaItem, type MediaRow } from "@/lib/admin/media";

export const dynamic = "force-dynamic";

export type { MediaItem } from "@/lib/admin/media";
const view = mediaView;

/** List for the media page and the picker in the editors. */
export async function GET(request: NextRequest) {
  const staff = await currentStaff();
  if (!staff || !can(staff, "media")) return NextResponse.json({ error: "auth" }, { status: 401 });
  const text = request.nextUrl.searchParams.get("q")?.trim();
  const kind = request.nextUrl.searchParams.get("kind");
  const where: string[] = [];
  const params: unknown[] = [];
  if (text) { params.push(`%${text}%`); where.push(`(original_name ILIKE $${params.length} OR alt ILIKE $${params.length})`); }
  if (kind === "image") where.push("mime LIKE 'image/%'");
  if (kind === "file") where.push("mime NOT LIKE 'image/%' AND mime NOT LIKE 'video/%'");
  if (kind === "video") where.push("mime LIKE 'video/%'");
  const rows = await q<MediaRow>(`SELECT * FROM media ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 300`, params);
  return NextResponse.json({ items: rows.map(view) });
}

/** Upload: multipart field "files", several at once. */
export async function POST(request: NextRequest) {
  const staff = await currentStaff();
  if (!staff || !can(staff, "media")) return NextResponse.json({ error: "Войдите заново" }, { status: 401 });
  // Same-origin only: the session cookie is SameSite=Lax, this check closes cross-site form posts.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "origin" }, { status: 403 });
  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 20);
  const items: MediaItem[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      const row = await storeUpload(file, staff.id);
      items.push(view(row));
      await audit(staff, { action: "upload", entity: "media", entityId: row.id, summary: `Загружен файл ${row.original_name}` });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${file.name}: не загрузился`);
    }
  }
  return NextResponse.json({ items, errors }, { status: items.length || !errors.length ? 200 : 400 });
}
