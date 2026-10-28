import type { Metadata } from "next";
import { ReviewsPage } from "@/components/ServicePages";
import "./frame.css";
import "@/app/adaptive/service.css";
import { seoMetadata } from "@/lib/cms/seo";

const baseMetadata: Metadata = { title: "Отзывы" };

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/reviews", baseMetadata);
}

export default function Page() {
  return <ReviewsPage />;
}
