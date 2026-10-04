import type { Metadata } from "next";
import { CoursePage } from "@/components/CourseFlow";

export const metadata: Metadata = { title: "Курс FOX для специалистов" };

export default function Page() {
  return <CoursePage />;
}
