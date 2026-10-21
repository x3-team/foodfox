import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { hasDatabase, q } from "@/lib/admin/db";

export const SEO_TAG = "site-seo";
export const SITE_URL = (process.env.SITE_URL || "https://foodfox.yuri.guru").replace(/\/$/, "");

export type SeoRow = { path: string; title: string; description: string; og_image: string; canonical: string; noindex: boolean; in_sitemap: boolean };

export const getSeoRows = unstable_cache(
  async (): Promise<Record<string, SeoRow>> => {
    if (!hasDatabase()) return {};
    try {
      const rows = await q<SeoRow>("SELECT path, title, description, og_image, canonical, noindex, in_sitemap FROM seo_pages");
      return Object.fromEntries(rows.map((r) => [r.path, r]));
    } catch (error) {
      console.error("[seo] not loaded", error);
      return {};
    }
  },
  ["site-seo-v1"],
  { tags: [SEO_TAG] },
);

/** Page metadata with the SEO fields from the admin on top; empty admin fields keep what the page code says. */
export async function seoMetadata(path: string, base: Metadata): Promise<Metadata> {
  const row = (await getSeoRows())[path];
  if (!row) return base;
  const out: Metadata = { ...base };
  // An admin title is the full <title>, without the «— FOX Food Xplorer» template of the layout.
  if (row.title) out.title = { absolute: row.title };
  if (row.description) out.description = row.description;
  const image = row.og_image ? (row.og_image.startsWith("/") ? `${SITE_URL}${row.og_image}` : row.og_image) : undefined;
  if (row.title || row.description || image) {
    out.openGraph = {
      ...(base.openGraph ?? {}),
      ...(row.title ? { title: row.title } : {}),
      ...(row.description ? { description: row.description } : {}),
      ...(image ? { images: [{ url: image }] } : {}),
    };
  }
  if (row.canonical) out.alternates = { ...(base.alternates ?? {}), canonical: row.canonical };
  if (row.noindex) out.robots = { index: false, follow: false };
  return out;
}

/* Pages listed in the SEO section, with the title/description their code sets today. */
export const SEO_PAGES: Array<{ path: string; label: string; title: string; description: string }> = [
  { path: "/", label: "Главная", title: "FOX Food Xplorer — тест на пищевую непереносимость", description: "Узнайте, какие продукты не подходят именно вам. 286 продуктов, один забор крови, результат за 7–10 дней." },
  { path: "/specialists", label: "Специалистам", title: "Специалистам — FOX Food Xplorer", description: "" },
  { path: "/course", label: "Курс", title: "Курс FOX для специалистов — FOX Food Xplorer", description: "" },
  { path: "/report", label: "Отчёт", title: "Отчёт FOX: как читать — FOX Food Xplorer", description: "" },
  { path: "/labs", label: "Где сдать тест", title: "Где сдать тест — FOX Food Xplorer", description: "" },
  { path: "/faq", label: "Вопросы и ответы", title: "Вопросы и ответы — FOX Food Xplorer", description: "" },
  { path: "/reviews", label: "Отзывы", title: "Отзывы — FOX Food Xplorer", description: "" },
  { path: "/certificates", label: "Сертификаты", title: "Сертификаты — FOX Food Xplorer", description: "" },
  { path: "/contacts", label: "Контакты", title: "Контакты — FOX Food Xplorer", description: "" },
  { path: "/blog", label: "Блог", title: "Блог о пищевой непереносимости — FOX Food Xplorer", description: "Статьи врачей и нутрициологов: как понять свои симптомы, что показывает тест FOX и что делать с результатом." },
  { path: "/blog/authors", label: "Авторы блога", title: "Авторы блога — FOX Food Xplorer", description: "Врачи и нутрициологи, которые готовят материалы FOX Food Xplorer." },
  { path: "/privacy", label: "Политика конфиденциальности", title: "Политика конфиденциальности — FOX Food Xplorer", description: "" },
];
