import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { ARTICLES_DEFAULT, BLOG_ARTICLES_KEY, BLOG_AUTHORS_KEY, blogFrom, type AuthorPatch, type BlogArticle } from "@/lib/cms/blog";
import { CATEGORIES } from "@/lib/content";
import { BlogList } from "@/components/admin/BlogList";
import { AuthorsEditor } from "@/components/admin/AuthorsEditor";
import { Icon } from "@/components/admin/Icon";

export const metadata: Metadata = { title: "Блог" };

export default async function BlogAdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff("blog");
  const { tab } = await searchParams;
  // Straight from the table so the list shows what was just saved.
  const articlesRow = await one<{ value: BlogArticle[] }>("SELECT value FROM site_content WHERE key = $1", [BLOG_ARTICLES_KEY]);
  const authorsRow = await one<{ value: AuthorPatch[] }>("SELECT value FROM site_content WHERE key = $1", [BLOG_AUTHORS_KEY]);
  const values = { ...(articlesRow ? { [BLOG_ARTICLES_KEY]: articlesRow.value } : {}), ...(authorsRow ? { [BLOG_AUTHORS_KEY]: authorsRow.value } : {}) };
  const blog = blogFrom(values);
  const authorsTab = tab === "authors";
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Блог</h1>
          <p>Статьи и авторы раздела /blog. Черновики на сайте не видны; порядок здесь — порядок в ленте.</p>
        </div>
        <div className="a-head-actions">
          <a className="a-btn is-ghost" href="/blog" target="_blank" rel="noreferrer">Открыть /blog ↗</a>
          {!authorsTab && <Link className="a-btn is-lime" href="/admin/blog/new"><Icon name="plus" size={18} /> Новая статья</Link>}
        </div>
      </div>
      <nav className="a-tabs-inline" aria-label="Разделы блога">
        <Link href="/admin/blog" aria-current={!authorsTab ? "page" : undefined}>Статьи · {blog.all.length}</Link>
        <Link href="/admin/blog?tab=authors" aria-current={authorsTab ? "page" : undefined}>Авторы · {blog.authors.length}</Link>
      </nav>
      {authorsTab ? (
        <AuthorsEditor
          authors={blog.authors.map((a) => ({ slug: a.slug, name: a.name, role: a.role, bio: a.bio, avatar: a.avatar, portrait: a.portrait, listed: a.listed !== false, count: blog.articles.filter((x) => x.author === a.slug).length }))}
          saved={authorsRow?.value ?? []}
        />
      ) : (
        <BlogList
          list={blog.all}
          isDefault={!articlesRow && blog.all === ARTICLES_DEFAULT}
          categories={CATEGORIES.filter((c) => c.id !== "all").map((c) => ({ id: c.id, label: c.label }))}
          authors={Object.fromEntries(blog.authors.map((a) => [a.slug, a.name]))}
        />
      )}
    </>
  );
}
