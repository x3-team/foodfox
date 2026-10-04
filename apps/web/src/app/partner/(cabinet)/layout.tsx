import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/** Server-side gate. Middleware redirects first; this layout is the second check. */
export default async function PartnerCabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/partner");
  if (session.role !== "partner") redirect("/partner?error=role");
  return children;
}
