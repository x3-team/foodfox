import type { Metadata } from "next";
import { ContactsPage } from "@/components/ServicePages";

export const metadata: Metadata = { title: "Контакты" };

export default function Page() {
  return <ContactsPage />;
}
