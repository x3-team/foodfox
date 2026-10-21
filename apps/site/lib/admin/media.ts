import { mkdir, rm, writeFile } from "fs/promises";
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
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const FILE_TYPES = new Set(["application/pdf"]);
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

export async function removeFiles(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  await rm(join(mediaDir(), id), { recursive: true, force: true });
}

/** Where a file is used: page fields, SEO images (and later blog and reviews). Deleting a used file is refused. */
export async function mediaUsage(id: string): Promise<string[]> {
  const like = `%/media/${id}/%`;
  const content = await q<{ key: string }>("SELECT key FROM site_content WHERE value::text LIKE $1", [like]);
  const seo = await q<{ path: string }>("SELECT path FROM seo_pages WHERE og_image LIKE $1", [like]);
  return [...content.map((r) => `Поле «${r.key}»`), ...seo.map((r) => `SEO-картинка ${r.path}`)];
}
