import type { Metadata } from "next";
import { CoursePage } from "@/components/CourseFlow";
import "./frame.css";
import "@/app/adaptive/course.css";

export const metadata: Metadata = { title: "Курс FOX для специалистов" };

export default function Page() {
  return <CoursePage />;
}
