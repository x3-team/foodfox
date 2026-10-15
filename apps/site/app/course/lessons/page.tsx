import type { Metadata } from "next";
import { LessonsPage } from "@/components/CourseFlow";
import "../frame.css";
import "@/app/adaptive/course.css";
import "@/app/adaptive/b2b-motion.css";
import "../motion.css";
import "../demo.css";

export const metadata: Metadata = { title: "Кабинет курса" };

export default function Page() {
  return <LessonsPage />;
}
