import type { Metadata } from "next";
import { FaqPage } from "@/components/ServicePages";
import "./frame.css";
import "@/app/adaptive/service.css";

export const metadata: Metadata = { title: "Вопросы и ответы" };

export default function Page() {
  return <FaqPage />;
}
