import type { Metadata } from "next";
import { AuthorsBrowser } from "@/components/AuthorsBrowser";
import "@/app/adaptive/blog.css";

export const metadata: Metadata = {
  title: "Авторы блога",
  description: "Врачи и нутрициологи, которые готовят материалы FOX Food Xplorer.",
};

export default function AuthorsPage() {
  return <AuthorsBrowser />;
}
