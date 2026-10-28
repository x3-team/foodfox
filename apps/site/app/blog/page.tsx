import type { Metadata } from "next";
import { BlogFeed } from "@/components/BlogFeed";
import { seoMetadata } from "@/lib/cms/seo";
import "@/app/adaptive/blog.css";

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/blog", {});
}

// The feed is server-rendered; only the URL-filter reader inside BlogFeed sits in a Suspense boundary.
export default function BlogPage() {
  return <BlogFeed />;
}
