import type { Metadata } from "next";
import { CoursePage } from "@/components/CourseFlow";
import "./frame.css";
import "@/app/adaptive/course.css";
import "@/app/adaptive/b2b-motion.css";
import "./motion.css";

export const metadata: Metadata = { title: "Курс FOX для специалистов" };

export default function Page() {
  return <CoursePage />;
}
