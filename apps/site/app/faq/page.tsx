import type { Metadata } from "next";
import { FaqPage } from "@/components/ServicePages";

export const metadata: Metadata = { title: "Вопросы и ответы" };

export default function Page() {
  return <FaqPage />;
}
