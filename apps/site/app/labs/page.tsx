import type { Metadata } from "next";
import { LabsPage } from "@/components/ServicePages";
import "./frame.css";
import "@/app/adaptive/labs.css";

export const metadata: Metadata = { title: "Где сдать тест" };

export default function Page() {
  return <LabsPage />;
}
