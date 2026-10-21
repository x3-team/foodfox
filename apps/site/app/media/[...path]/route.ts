import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join, normalize } from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { mediaDir } from "@/lib/admin/media";

const TYPES: Record<string, string> = {
  webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", avif: "image/avif", pdf: "application/pdf",
};

/** Files of the admin media library. Names never change (a new upload is a new id), so they cache for a year. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.length !== 2 || !/^[0-9a-f-]{36}$/.test(path[0]) || !/^[\w.-]+$/.test(path[1])) return new NextResponse(null, { status: 404 });
  const root = mediaDir();
  const file = normalize(join(root, path[0], path[1]));
  if (!file.startsWith(root)) return new NextResponse(null, { status: 404 });
  const type = TYPES[path[1].split(".").pop()!.toLowerCase()];
  if (!type) return new NextResponse(null, { status: 404 });
  try {
    const info = await stat(file);
    const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "content-type": type,
        "content-length": String(info.size),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
