import { Suspense } from "react";
import { BlogFeed } from "@/components/BlogFeed";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <BlogFeed />
    </Suspense>
  );
}
