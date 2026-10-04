import type { Metadata } from "next";
import { LabsPage } from "@/components/ServicePages";

export const metadata: Metadata = { title: "Где сдать тест" };

export default function Page() {
  return <LabsPage />;
}
