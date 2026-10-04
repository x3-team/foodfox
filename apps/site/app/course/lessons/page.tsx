import type { Metadata } from "next";
import { LessonsPage } from "@/components/CourseFlow";

export const metadata: Metadata = { title: "Кабинет курса" };

export default function Page() {
  return <LessonsPage />;
}
