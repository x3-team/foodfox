"use server";

import { one } from "@/lib/admin/db";
import { ARTICLES_DEFAULT, BLOG_ARTICLES_KEY, type BlogArticle } from "@/lib/cms/blog";
import { saveContent } from "../content/actions";

/* One article is saved against the list as it is in the database now, so two people editing different articles
   do not overwrite each other. Validation, the audit entry and the site refresh happen in saveContent. */

async function currentList(): Promise<BlogArticle[]> {
  const row = await one<{ value: BlogArticle[] }>("SELECT value FROM site_content WHERE key = $1", [BLOG_ARTICLES_KEY]);
  return row?.value ?? ARTICLES_DEFAULT;
}

export async function saveArticle(originalSlug: string | null, article: BlogArticle): Promise<{ ok: boolean; message?: string; slug?: string }> {
  const list = await currentList();
  let next: BlogArticle[];
  if (originalSlug) {
    const index = list.findIndex((a) => a.slug === originalSlug);
    if (index < 0) return { ok: false, message: "Статья не найдена: возможно, её только что удалили" };
    next = list.map((a, i) => (i === index ? article : a));
  } else {
    next = [article, ...list];
  }
  // One main article on /blog: the one just marked wins.
  if (article.featured && !article.draft) next = next.map((a) => (a === article ? a : { ...a, featured: undefined }));
  const r = await saveContent({ [BLOG_ARTICLES_KEY]: next }, `Блог · «${article.title.slice(0, 60)}»`);
  return { ...r, slug: article.slug };
}

export async function deleteArticle(slug: string): Promise<{ ok: boolean; message?: string }> {
  const list = await currentList();
  if (!list.some((a) => a.slug === slug)) return { ok: false, message: "Статья уже удалена" };
  return saveContent({ [BLOG_ARTICLES_KEY]: list.filter((a) => a.slug !== slug) }, `Блог · удалена /blog/${slug}`);
}
