import type { Metadata } from "next";
import { SpecialistsView } from "@/components/SpecialistsView";
import "./frame.css";
import "@/app/adaptive/specialists.css";
import "@/app/adaptive/b2b-motion.css";
import "./motion.css";
import { seoMetadata } from "@/lib/cms/seo";

const baseMetadata: Metadata = { title: "Специалистам" };

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/specialists", baseMetadata);
}

export default function Page() {
  return <SpecialistsView />;
}
