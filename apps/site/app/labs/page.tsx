import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LabsPage } from "@/components/ServicePages";

const CITY_COOKIE = "fox_city"; // same name as in LabsPage (a client module — its constants are not importable here)
import "./frame.css";
import "@/app/adaptive/labs.css";
import { seoMetadata } from "@/lib/cms/seo";

const baseMetadata: Metadata = { title: "Где сдать тест" };

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/labs", baseMetadata);
}

// The saved city (cookie) is read on the server: the first-visit question «Ваш город — Москва?» is then part of the
// HTML in its final place instead of appearing after hydration and shifting the page (CLS).
export default async function Page() {
  const raw = (await cookies()).get(CITY_COOKIE)?.value;
  let saved: string | null = null;
  if (raw !== undefined) {
    try {
      saved = decodeURIComponent(raw);
    } catch {
      saved = raw;
    }
  }
  return <LabsPage savedCity={saved} />;
}
