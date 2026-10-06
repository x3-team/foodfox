import { Suspense } from "react";
import { BlogFeed } from "@/components/BlogFeed";

export default function BlogPage() {
  return (
    <Suspense fallback={null}>
      <BlogFeed />
    </Suspense>
  );
}
