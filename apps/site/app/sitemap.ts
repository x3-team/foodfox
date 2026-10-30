import type { MetadataRoute } from "next";
import { blogFrom } from "@/lib/cms/blog";
import { getContentOverrides } from "@/lib/cms/server";
import { getSeoRows, SEO_PAGES, SITE_URL } from "@/lib/cms/seo";

/** sitemap.xml: site pages, articles and authors, minus what the SEO section closes from indexing or the sitemap. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoRows();
  const { articles, authors } = blogFrom(await getContentOverrides());
  const paths = [
    ...SEO_PAGES.map((p) => p.path),
    ...articles.map((a) => `/blog/${a.slug}`),
    ...authors.map((a) => `/blog/authors/${a.slug}`),
  ];
  return paths
    .filter((path) => !seo[path]?.noindex && seo[path]?.in_sitemap !== false)
    .map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: path.startsWith("/blog/") ? "monthly" : "weekly", priority: path === "/" ? 1 : 0.7 }));
}
