import type { Metadata } from "next";
import { HomePage } from "@/components/HomePage";
import "@/app/adaptive/home.css";
import { seoMetadata } from "@/lib/cms/seo";

const baseMetadata: Metadata = {
  title: "FOX Food Xplorer — тест на пищевую непереносимость",
  description: "Узнайте, какие продукты не подходят именно вам. 286 продуктов, один забор крови, результат за 7–10 дней.",
};

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/", baseMetadata);
}

export default function Page() {
  return <HomePage />;
}
