import { redirect } from "next/navigation";
import { PartnerDataProvider } from "@/components/partner/PartnerData";
import { getSession } from "@/lib/auth";
import { loadPartnerData } from "@/lib/partner-data";

/** Server-side gate. Middleware redirects first; this layout is the second check. */
export default async function PartnerCabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/partner");
  if (session.role !== "partner") redirect("/partner?error=role");
  // The partner's own data from the site admin, or the demo data for the demo login.
  const data = await loadPartnerData(session);
  return <PartnerDataProvider value={data}>{children}</PartnerDataProvider>;
}
