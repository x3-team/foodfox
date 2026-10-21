"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit, diff } from "@/lib/admin/audit";
import { one, q } from "@/lib/admin/db";
import { type SeoRow } from "@/lib/cms/seo";

const EMPTY: Omit<SeoRow, "path"> = { title: "", description: "", og_image: "", canonical: "", noindex: false, in_sitemap: true };

export async function saveSeo(input: SeoRow) {
  const staff = await assertStaff("seo");
  if (!/^\/[\w\-/]*$/.test(input.path)) return { ok: false, message: "Неверный адрес страницы" };
  const next = {
    title: input.title.trim().slice(0, 200),
    description: input.description.trim().slice(0, 400),
    og_image: input.og_image.trim().slice(0, 500),
    canonical: input.canonical.trim().slice(0, 500),
    noindex: Boolean(input.noindex),
    in_sitemap: Boolean(input.in_sitemap),
  };
  if (next.canonical && !/^https?:\/\//.test(next.canonical)) return { ok: false, message: "Canonical — полный адрес с https://" };
  const before = (await one<SeoRow>("SELECT * FROM seo_pages WHERE path = $1", [input.path])) ?? { path: input.path, ...EMPTY };
  const d = diff(before as unknown as Record<string, unknown>, next);
  if (!d.changed) return { ok: true, message: "Изменений нет" };
  if (JSON.stringify(next) === JSON.stringify(EMPTY)) await q("DELETE FROM seo_pages WHERE path = $1", [input.path]);
  else {
    await q(
      `INSERT INTO seo_pages (path, title, description, og_image, canonical, noindex, in_sitemap, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (path) DO UPDATE SET title = $2, description = $3, og_image = $4, canonical = $5, noindex = $6, in_sitemap = $7, updated_at = now()`,
      [input.path, next.title, next.description, next.og_image, next.canonical, next.noindex, next.in_sitemap],
    );
  }
  await audit(staff, { action: "update", entity: "seo", entityId: input.path, summary: `SEO ${input.path}`, before: d.before, after: d.after });
  revalidatePath(input.path);
  revalidatePath("/sitemap.xml");
  return { ok: true, message: "Сохранено" };
}
