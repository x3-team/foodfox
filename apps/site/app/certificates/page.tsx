import type { Metadata } from "next";
import { CertificatesView } from "@/components/CertificatesView";
import "./frame.css";
import "@/app/adaptive/service.css";
import { seoMetadata } from "@/lib/cms/seo";

const baseMetadata: Metadata = { title: "Сертификаты" };

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/certificates", baseMetadata);
}

export default function Page() {
  return <CertificatesView />;
}
