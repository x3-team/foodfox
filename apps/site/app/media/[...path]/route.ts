import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join, normalize } from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { mediaDir } from "@/lib/admin/media";

const TYPES: Record<string, string> = {
  webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", avif: "image/avif", pdf: "application/pdf",
  mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm",
};

/** Files of the admin media library. Names never change (a new upload is a new id), so they cache for a year.
    Range requests get 206 with that slice: a video player seeks and starts without loading the whole file. */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.length !== 2 || !/^[0-9a-f-]{36}$/.test(path[0]) || !/^[\w.-]+$/.test(path[1])) return new NextResponse(null, { status: 404 });
  const root = mediaDir();
  const file = normalize(join(root, path[0], path[1]));
  if (!file.startsWith(root)) return new NextResponse(null, { status: 404 });
  const type = TYPES[path[1].split(".").pop()!.toLowerCase()];
  if (!type) return new NextResponse(null, { status: 404 });
  try {
    const info = await stat(file);
    const headers: Record<string, string> = {
      "content-type": type,
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    };
    const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
    if (range && (range[1] || range[2])) {
      // «bytes=500-» from 500 to the end, «bytes=-500» the last 500 bytes.
      let start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
      let end = range[1] && range[2] ? Number(range[2]) : info.size - 1;
      end = Math.min(end, info.size - 1);
      if (start > end || start >= info.size) {
        return new NextResponse(null, { status: 416, headers: { "content-range": `bytes */${info.size}` } });
      }
      start = Math.max(0, start);
      const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
      return new NextResponse(stream, {
        status: 206,
        headers: { ...headers, "content-length": String(end - start + 1), "content-range": `bytes ${start}-${end}/${info.size}` },
      });
    }
    const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
    return new NextResponse(stream, { headers: { ...headers, "content-length": String(info.size) } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
