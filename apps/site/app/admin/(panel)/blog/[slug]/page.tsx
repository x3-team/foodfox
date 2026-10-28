import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { ARTICLES_DEFAULT, BLOG_ARTICLES_KEY, BLOG_AUTHORS_KEY, blogFrom, type AuthorPatch, type BlogArticle } from "@/lib/cms/blog";
import { CATEGORIES, TAGS } from "@/lib/content";
import { ArticleEditor } from "@/components/admin/ArticleEditor";

export const metadata: Metadata = { title: "Статья" };

export default async function ArticleAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff("blog");
  const { slug } = await params;
  const row = await one<{ value: BlogArticle[] }>("SELECT value FROM site_content WHERE key = $1", [BLOG_ARTICLES_KEY]);
  const authorsRow = await one<{ value: AuthorPatch[] }>("SELECT value FROM site_content WHERE key = $1", [BLOG_AUTHORS_KEY]);
  const list = row?.value ?? ARTICLES_DEFAULT;
  const isNew = slug === "new";
  const article = isNew ? null : list.find((a) => a.slug === slug);
  if (!isNew && !article) notFound();
  const { authors } = blogFrom(authorsRow ? { [BLOG_AUTHORS_KEY]: authorsRow.value } : {});
  const tags = Array.from(new Set([...TAGS, ...list.flatMap((a) => a.tags)]));
  return (
    <>
      <div className="a-crumbs"><Link href="/admin/blog">Блог</Link><span>/</span><span>{article?.title ?? "Новая статья"}</span></div>
      <ArticleEditor
        original={article ?? null}
        taken={list.map((a) => a.slug).filter((s) => s !== article?.slug)}
        categories={CATEGORIES.filter((c) => c.id !== "all").map((c) => ({ id: c.id, label: c.label }))}
        authors={authors.map((a) => ({ slug: a.slug, name: a.name }))}
        tags={tags}
      />
    </>
  );
}
