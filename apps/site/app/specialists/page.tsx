import type { Metadata } from "next";
import { SpecialistsView } from "@/components/SpecialistsView";
import "./frame.css";
import "@/app/adaptive/specialists.css";

export const metadata: Metadata = { title: "Специалистам" };

export default function Page() {
  return <SpecialistsView />;
}
