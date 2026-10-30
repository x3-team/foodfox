import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

/* Lesson videos uploaded to the VPS by hand (FOX_COURSE_MEDIA_DIR, /var/www/foodfox-course-media there). nginx serves
   the files itself at /course-media/… with byte ranges (deploy/vps/nginx-apply.sh), the site only finds which file
   belongs to which lesson. A video URL set in the admin wins over the folder. */
export const COURSE_MEDIA_URL = "/course-media/";
export function courseMediaDir() {
  return resolve(process.env.FOX_COURSE_MEDIA_DIR || "/var/www/foodfox-course-media");
}

const VIDEO = /\.(mp4|m4v|webm|mov)$/i;

async function walk(dir: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  let names: string[] = [];
  try { names = await readdir(dir); } catch { return []; }
  const out: string[] = [];
  for (const name of names) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    const info = await stat(path).catch(() => null);
    if (info?.isDirectory()) out.push(...(await walk(path, depth + 1)));
    else if (info?.isFile()) out.push(path);
  }
  return out;
}

/** «Урок 5-2…», «урок 5.2», «Урок_3» → "5-2", "3"; the file name decides first, then its folders. */
export function lessonKey(path: string): string | null {
  const parts = path.split(sep).reverse();
  for (const part of parts) {
    const m = /урок[\s_]*([1-6])(?:\s*[-._]\s*([1-4])(?!\d))?/i.exec(part.normalize("NFC"));
    if (!m) continue;
    return m[1] === "5" ? (m[2] ? `5-${m[2]}` : null) : m[1];
  }
  return null;
}

const natural = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });

/** Lesson key → its video URLs in play order (a part split in two gives two). */
export async function courseVideos(): Promise<Record<string, string[]>> {
  const root = courseMediaDir();
  const files = (await walk(root)).filter((path) => VIDEO.test(path));
  const byKey: Record<string, string[]> = {};
  for (const path of files.sort((a, b) => natural.compare(a, b))) {
    const rel = relative(root, path);
    const key = lessonKey(rel);
    if (!key) continue;
    (byKey[key] ??= []).push(COURSE_MEDIA_URL + rel.split(sep).map(encodeURIComponent).join("/"));
  }
  return byKey;
}
