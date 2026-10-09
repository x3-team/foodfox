import type { Metadata } from "next";
import { ContactsPage } from "@/components/ServicePages";
import "./frame.css";
import "@/app/adaptive/service.css";

export const metadata: Metadata = { title: "Контакты" };

export default function Page() {
  return <ContactsPage />;
}
