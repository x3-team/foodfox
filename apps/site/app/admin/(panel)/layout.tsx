import { Shell } from "@/components/admin/Shell";
import { NAV } from "@/components/admin/nav";
import { can, requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

// Sections that already have pages; the rest of NAV joins as it is built.
const READY = new Set(["/admin", "/admin/leads", "/admin/users", "/admin/audit"]);

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const nav = NAV.filter((item) => READY.has(item.href) && can(staff, item.area));
  const [counts] = await q<{ leads: number }>("SELECT count(*)::int AS leads FROM leads WHERE status = 'new'");
  return (
    <Shell nav={nav} me={{ name: staff.name, email: staff.email, role: staff.role }} counts={{ "/admin/leads": counts.leads }} logout={logoutAction}>
      {children}
    </Shell>
  );
}
