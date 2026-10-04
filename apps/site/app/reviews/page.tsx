import type { Metadata } from "next";
import { ReviewsPage } from "@/components/ServicePages";

export const metadata: Metadata = { title: "Отзывы" };

export default function Page() {
  return <ReviewsPage />;
}
