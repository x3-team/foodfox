import type { Metadata } from "next";
import { SpecialistsView } from "@/components/SpecialistsView";
import "./frame.css";
import "@/app/adaptive/specialists.css";
import "@/app/adaptive/b2b-motion.css";
import "./motion.css";

export const metadata: Metadata = { title: "Специалистам" };

export default function Page() {
  return <SpecialistsView />;
}
