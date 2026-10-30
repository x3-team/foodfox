import { appendFile, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { q } from "./db";

/* Uploads live outside the git checkout (deploy/vps/update.sh resets it on every deploy): FOX_MEDIA_DIR on the VPS,
   ./.media next to the site in development. Served by app/media/[...path]/route.ts under /media/<id>/<file>. */
export function mediaDir(): string {
  return resolve(process.env.FOX_MEDIA_DIR || join(process.cwd(), ".media"));
}

export const MAX_UPLOAD = 20 * 1024 * 1024;
/** Videos and big PDFs come in chunks (startUpload / appendChunk / finishUpload), so nginx and memory never see 1 GB at once. */
export const MAX_LARGE_UPLOAD = 1536 * 1024 * 1024;
export const CHUNK = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const FILE_TYPES = new Set(["application/pdf"]);
// MP4 (H.264) plays everywhere, WebM is the fallback some Chromium builds need; MOV plays only in Safari.
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
// SVG is refused on purpose: served from the site's own origin it could carry script.
export const ACCEPT = [...IMAGE_TYPES, ...FILE_TYPES].join(",");
const WIDTHS = [480, 960, 1440, 1920, 2880];

export type MediaVariant = { width: number; url: string };
export type MediaRow = {
  id: string; original_name: string; mime: string; size: number; width: number | null; height: number | null;
  alt: string; url: string; variants: MediaVariant[]; created_at: Date;
};

export function srcSetOf(row: Pick<MediaRow, "variants">): string {
  return row.variants.map((v) => `${v.url} ${v.width}w`).join(", ");
}

/** What the media page and the editors' picker get for one file. */
export const mediaView = (r: MediaRow) => ({
  id: r.id, name: r.original_name, mime: r.mime, size: Number(r.size), width: r.width, height: r.height, alt: r.alt,
  url: r.url, src: r.mime.startsWith("image/") ? mainUrl(r) : r.url, srcSet: srcSetOf(r), thumb: r.variants[0]?.url ?? r.url,
  createdAt: new Date(r.created_at).toISOString(),
});
export type MediaItem = ReturnType<typeof mediaView>;

/** The variant a page should load by default: the widest up to 1920. */
export function mainUrl(row: Pick<MediaRow, "variants" | "url">): string {
  const fit = row.variants.filter((v) => v.width <= 1920);
  return (fit.at(-1) ?? row.variants[0])?.url ?? row.url;
}

export async function storeUpload(file: File, userId: string): Promise<MediaRow> {
  if (file.size > MAX_UPLOAD) throw new Error(`${file.name}: больше 20 МБ`);
  const isImage = IMAGE_TYPES.has(file.type);
  if (!isImage && !FILE_TYPES.has(file.type)) throw new Error(`${file.name}: такой тип файла не поддерживается`);
  const id = randomUUID();
  const dir = join(mediaDir(), id);
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? (isImage ? file.type.split("/")[1] : "pdf")).toLowerCase();
  const originalFile = `original.${ext}`;
  try {
    await writeFile(join(dir, originalFile), bytes);
    let width: number | null = null;
    let height: number | null = null;
    const variants: MediaVariant[] = [];
    if (isImage) {
      const image = sharp(bytes, { animated: file.type === "image/gif" }).rotate();
      const meta = await image.metadata();
      width = meta.autoOrient?.width ?? meta.width ?? null;
      height = meta.autoOrient?.height ?? meta.height ?? null;
      if (width) {
        const targets = WIDTHS.filter((w) => w < width!);
        if (!targets.length || width <= 3840) targets.push(Math.min(width, 3840));
        for (const w of Array.from(new Set(targets))) {
          const name = `${w}.webp`;
          await sharp(bytes).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(dir, name));
          variants.push({ width: w, url: `/media/${id}/${name}` });
        }
      }
    }
    const [row] = await q<MediaRow>(
      `INSERT INTO media (id, original_name, mime, size, width, height, url, variants, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, file.name.slice(0, 200), file.type, file.size, width, height, `/media/${id}/${originalFile}`, JSON.stringify(variants), userId],
    );
    return row;
  } catch (error) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    if (error instanceof Error && /unsupported image format|Input buffer/i.test(error.message)) throw new Error(`${file.name}: файл повреждён или не картинка`);
    throw error;
  }
}

type Pending = { name: string; type: string; size: number; userId: string; at: number };
const uploadsDir = () => join(mediaDir(), ".uploads");
const UPLOAD_ID = /^[0-9a-f-]{36}$/;

function extOf(name: string, type: string): string {
  const fromName = name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  if (type === "video/mp4") return fromName === "m4v" ? "m4v" : "mp4";
  if (type === "video/webm") return "webm";
  return "pdf";
}

/** Opens a chunked upload of a video or a PDF up to MAX_LARGE_UPLOAD. Unfinished uploads older than a day are dropped. */
export async function startUpload(input: { name: string; type: string; size: number }, userId: string): Promise<string> {
  const name = String(input.name ?? "").slice(0, 200) || "file";
  const size = Number(input.size);
  if (!VIDEO_TYPES.has(input.type) && !FILE_TYPES.has(input.type)) throw new Error(`${name}: загрузите видео MP4 или WebM либо PDF`);
  if (!Number.isInteger(size) || size <= 0) throw new Error(`${name}: пустой файл`);
  if (size > MAX_LARGE_UPLOAD) throw new Error(`${name}: больше 1,5 ГБ`);
  await mkdir(uploadsDir(), { recursive: true });
  for (const file of await readdir(uploadsDir()).catch(() => [] as string[])) {
    const info = await stat(join(uploadsDir(), file)).catch(() => null);
    if (info && Date.now() - info.mtimeMs > 86_400_000) await rm(join(uploadsDir(), file), { force: true }).catch(() => {});
  }
  const id = randomUUID();
  const meta: Pending = { name, type: input.type, size, userId, at: Date.now() };
  await writeFile(join(uploadsDir(), `${id}.json`), JSON.stringify(meta));
  await writeFile(join(uploadsDir(), `${id}.part`), Buffer.alloc(0));
  return id;
}

async function pending(id: string, userId: string): Promise<Pending> {
  if (!UPLOAD_ID.test(id)) throw new Error("Загрузка не найдена");
  const meta = JSON.parse(await readFile(join(uploadsDir(), `${id}.json`), "utf-8").catch(() => "null")) as Pending | null;
  if (!meta || meta.userId !== userId) throw new Error("Загрузка не найдена, начните заново");
  return meta;
}

/** Appends one chunk at `offset`. A chunk that does not start where the file ends is ignored, so a retried request
    after a lost answer never writes the same bytes twice; the answer is the size on disk to continue from. */
export async function appendChunk(id: string, offset: number, bytes: Buffer, userId: string): Promise<number> {
  const meta = await pending(id, userId);
  const part = join(uploadsDir(), `${id}.part`);
  const have = (await stat(part)).size;
  if (offset !== have) return have;
  if (bytes.length > CHUNK || have + bytes.length > meta.size) throw new Error("Лишние данные в загрузке");
  await appendFile(part, bytes);
  return have + bytes.length;
}

/** Moves a complete upload into the library. */
export async function finishUpload(id: string, userId: string): Promise<MediaRow> {
  const meta = await pending(id, userId);
  const part = join(uploadsDir(), `${id}.part`);
  const have = (await stat(part)).size;
  if (have !== meta.size) throw new Error(`${meta.name}: загружено ${have} из ${meta.size} байт`);
  const head = Buffer.alloc(12);
  const fh = await open(part, "r");
  await fh.read(head, 0, 12, 0).finally(() => fh.close());
  // The type the browser reported must match the bytes: PDF «%PDF», MP4 «ftyp» at 4, WebM EBML 1A 45 DF A3.
  const ok = meta.type === "application/pdf" ? head.subarray(0, 4).toString() === "%PDF"
    : meta.type === "video/webm" ? head.readUInt32BE(0) === 0x1a45dfa3
    : head.subarray(4, 8).toString() === "ftyp";
  if (!ok) {
    await rm(part, { force: true });
    await rm(join(uploadsDir(), `${id}.json`), { force: true });
    throw new Error(`${meta.name}: содержимое не похоже на ${meta.type === "application/pdf" ? "PDF" : "видео MP4 или WebM"}`);
  }
  const dir = join(mediaDir(), id);
  await mkdir(dir, { recursive: true });
  const file = `original.${extOf(meta.name, meta.type)}`;
  await rename(part, join(dir, file));
  await rm(join(uploadsDir(), `${id}.json`), { force: true });
  const [row] = await q<MediaRow>(
    `INSERT INTO media (id, original_name, mime, size, url, variants, created_by) VALUES ($1, $2, $3, $4, $5, '[]', $6) RETURNING *`,
    [id, meta.name, meta.type, meta.size, `/media/${id}/${file}`, userId],
  );
  return row;
}

export async function removeFiles(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  await rm(join(mediaDir(), id), { recursive: true, force: true });
}

/** Where a file is used: page fields, SEO images (and later blog and reviews). Deleting a used file is refused. */
export async function mediaUsage(id: string): Promise<string[]> {
  const like = `%/media/${id}/%`;
  const content = await q<{ key: string }>("SELECT key FROM site_content WHERE value::text LIKE $1", [like]);
  const seo = await q<{ path: string }>("SELECT path FROM seo_pages WHERE og_image LIKE $1", [like]);
  // Recipes of the app keep their photo and step photos as URLs; the table is apps/web's, absent on a site-only database.
  const recipes = await q<{ title: string }>("SELECT title FROM recipes WHERE photo_url LIKE $1 OR steps::text LIKE $1", [like]).catch(() => []);
  return [...content.map((r) => `Поле «${r.key}»`), ...seo.map((r) => `SEO-картинка ${r.path}`), ...recipes.map((r) => `Рецепт «${r.title}»`)];
}
