import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { courseMediaDir } from "@/lib/course-media";
import { readdir } from "node:fs/promises";

export const dynamic = "force-dynamic";

/* TEMPORARY (2026-10-30): lets the developer fetch the client's lesson 3 / 5.1 PDFs from the server folder to cut the
   lecturers' contact slides before they are published. Needs a secret key (only its hash is here); removed in the
   next deploy. Without ?f= it lists the folder. */
const KEY_SHA256 = "80ab73e0efb26e552996b0623d2c99f0b05d40a4bc3d5c5b9330de61ec38bbab";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("k") ?? "";
  if (createHash("sha256").update(key).digest("hex") !== KEY_SHA256) return new NextResponse("Not found", { status: 404 });
  const root = courseMediaDir();
  const name = request.nextUrl.searchParams.get("f");
  if (!name) {
    const list: string[] = [];
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await walk(path); else list.push(relative(root, path));
      }
    };
    await walk(root);
    return NextResponse.json({ root, files: list });
  }
  const path = resolve(root, name);
  if (!path.startsWith(root + "/") || !/\.pdf$/i.test(path)) return new NextResponse("Not found", { status: 404 });
  const body = await readFile(path).catch(() => null);
  if (!body) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } });
}
