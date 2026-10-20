import type { Metadata } from "next";
import { ReviewsPage } from "@/components/ServicePages";
import "./frame.css";
import "@/app/adaptive/service.css";

export const metadata: Metadata = { title: "Отзывы" };

export default function Page() {
  return <ReviewsPage />;
}
