import type { Metadata } from "next";
import { CoursePage } from "@/components/CourseFlow";
import "./frame.css";
import "@/app/adaptive/course.css";
import "@/app/adaptive/b2b-motion.css";
import "./motion.css";
import "./demo.css";
import { seoMetadata } from "@/lib/cms/seo";

const baseMetadata: Metadata = { title: "Курс FOX для специалистов" };

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/course", baseMetadata);
}

export default function Page() {
  return <CoursePage />;
}
