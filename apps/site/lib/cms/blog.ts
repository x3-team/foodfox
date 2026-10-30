/* The blog as the admin left it: articles (with drafts) and author edits stored in site_content, over the articles
   and authors of lib/content.ts. Plain module: the client hook useBlog() and the server pages both build it here. */

import { articles as ARTICLES_DEFAULT, authors as AUTHORS_DEFAULT, type Article, type Author } from "@/lib/content";

export type BlogArticle = Article & { draft?: boolean };
/** Fields of an author the admin can change; the rest (experience, education, roles) stays in code. */
export type AuthorPatch = { slug: string; name?: string; role?: string; bio?: string; avatar?: string; portrait?: string; listed?: boolean };

export const BLOG_ARTICLES_KEY = "blog.articles";
export const BLOG_AUTHORS_KEY = "blog.authors";
export { ARTICLES_DEFAULT, AUTHORS_DEFAULT };

export type Blog = ReturnType<typeof blogFrom>;

export function blogFrom(values: Record<string, unknown>) {
  const saved = values[BLOG_ARTICLES_KEY];
  const all: BlogArticle[] = Array.isArray(saved) ? (saved as BlogArticle[]) : ARTICLES_DEFAULT;
  const patches = Array.isArray(values[BLOG_AUTHORS_KEY]) ? (values[BLOG_AUTHORS_KEY] as AuthorPatch[]) : [];
  const authors: Author[] = AUTHORS_DEFAULT.map((author) => {
    const patch = patches.find((p) => p.slug === author.slug);
    if (!patch) return author;
    const out = { ...author };
    for (const key of ["name", "role", "bio", "avatar", "portrait"] as const) if (patch[key]) out[key] = patch[key]!;
    if (typeof patch.listed === "boolean") out.listed = patch.listed;
    return out;
  });
  const articles = all.filter((a) => !a.draft);
  return {
    articles,
    all,
    authors,
    authorBySlug: (slug: string) => authors.find((a) => a.slug === slug),
    articleBySlug: (slug: string) => articles.find((a) => a.slug === slug),
  };
}
