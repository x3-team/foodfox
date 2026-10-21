import type { Metadata } from "next";
import { ContactsPage } from "@/components/ServicePages";
import "./frame.css";
import "@/app/adaptive/service.css";
import { seoMetadata } from "@/lib/cms/seo";

const baseMetadata: Metadata = { title: "Контакты" };

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/contacts", baseMetadata);
}

export default function Page() {
  return <ContactsPage />;
}
