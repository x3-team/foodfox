import type { Metadata } from "next";
import { CertificatesView } from "@/components/CertificatesView";

export const metadata: Metadata = { title: "Сертификаты" };

export default function Page() {
  return <CertificatesView />;
}
