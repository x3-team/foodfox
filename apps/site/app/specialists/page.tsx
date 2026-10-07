import type { Metadata } from "next";
import { SpecialistsView } from "@/components/SpecialistsView";
import "./frame.css";

export const metadata: Metadata = { title: "Специалистам" };

export default function Page() {
  return <SpecialistsView />;
}
