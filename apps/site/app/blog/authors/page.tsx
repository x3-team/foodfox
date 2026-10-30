import type { Metadata } from "next";
import { AuthorsBrowser } from "@/components/AuthorsBrowser";
import "@/app/adaptive/blog.css";
import { seoMetadata } from "@/lib/cms/seo";

const baseMetadata: Metadata = {
  title: "Авторы блога",
  description: "Врачи и нутрициологи, которые готовят материалы FOX Food Xplorer.",
};

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/blog/authors", baseMetadata);
}

export default function AuthorsPage() {
  return <AuthorsBrowser />;
}
