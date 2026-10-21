import type { Metadata } from "next";
import { SeoManager } from "@/components/admin/SeoManager";
import { requireStaff } from "@/lib/admin/auth";
import { articles, authors } from "@/lib/content";
import { SEO_PAGES } from "@/lib/cms/seo";
import { q } from "@/lib/admin/db";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoPage() {
  await requireStaff("seo");
  // Straight from the table, not the site cache, so the editor shows what was just saved.
  const rows = await q<{ path: string; title: string; description: string; og_image: string; canonical: string; noindex: boolean; in_sitemap: boolean }>("SELECT * FROM seo_pages");
  const saved = Object.fromEntries(rows.map((r) => [r.path, r]));
  const pages = [
    ...SEO_PAGES.map((p) => ({ ...p, group: "Страницы" })),
    ...articles.map((a) => ({ path: `/blog/${a.slug}`, label: a.title, title: `${a.title} — FOX Food Xplorer`, description: a.excerpt, group: "Статьи" })),
    ...authors.map((a) => ({ path: `/blog/authors/${a.slug}`, label: a.name, title: `${a.name} — FOX Food Xplorer`, description: a.bio, group: "Авторы" })),
  ];
  return (
    <>
      <div className="a-head">
        <div>
          <h1>SEO</h1>
          <p>Заголовок и описание для поиска и соцсетей, canonical, запрет индексации и sitemap.xml. Пустое поле — остаётся то, что задано в коде страницы.</p>
        </div>
        <div className="a-head-actions"><a className="a-btn is-ghost" href="/sitemap.xml" target="_blank" rel="noreferrer">sitemap.xml ↗</a></div>
      </div>
      <div className="a-note" style={{ marginBottom: 24 }}>Сейчас весь демо-сайт закрыт от поисковиков на уровне сервера (заголовок noindex в nginx). Настройки отсюда заработают в поиске, когда сайт откроют для индексации.</div>
      <SeoManager pages={pages} saved={saved} />
    </>
  );
}
