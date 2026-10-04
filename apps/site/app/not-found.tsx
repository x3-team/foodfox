import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = { title: "Страница не найдена" };

export default function NotFound() {
  return <NotFoundView />;
}
