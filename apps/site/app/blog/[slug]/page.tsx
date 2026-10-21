import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/ArticleView";
import { blogFrom } from "@/lib/cms/blog";
import { getContentOverrides } from "@/lib/cms/server";
import "@/app/adaptive/blog.css";
import { seoMetadata } from "@/lib/cms/seo";

export async function generateStaticParams() {
  return blogFrom(await getContentOverrides()).articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = blogFrom(await getContentOverrides()).articleBySlug(slug);
  if (!article) return {};
  return seoMetadata(`/blog/${slug}`, { title: article.title, description: article.excerpt });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { articleBySlug, authorBySlug } = blogFrom(await getContentOverrides());
  const article = articleBySlug(slug);
  if (!article) notFound();
  const author = authorBySlug(article.author);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    author: author ? { "@type": "Person", name: author.name, jobTitle: author.role } : undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleView article={article} />
    </>
  );
}
