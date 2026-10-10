import { Suspense } from "react";
import { BlogFeed } from "@/components/BlogFeed";
import "@/app/adaptive/blog.css";

export default function BlogPage() {
  return (
    <Suspense fallback={null}>
      <BlogFeed />
    </Suspense>
  );
}
