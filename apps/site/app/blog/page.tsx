import { BlogFeed } from "@/components/BlogFeed";
import "@/app/adaptive/blog.css";

// The feed is server-rendered; only the URL-filter reader inside BlogFeed sits in a Suspense boundary.
export default function BlogPage() {
  return <BlogFeed />;
}
