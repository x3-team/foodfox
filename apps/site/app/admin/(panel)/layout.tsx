import { Shell } from "@/components/admin/Shell";
import { NAV } from "@/components/admin/nav";
import { can, requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

// Sections that already have pages; the rest of NAV joins as it is built.
const READY = new Set(["/admin", "/admin/leads", "/admin/partners", "/admin/reviews", "/admin/content", "/admin/course", "/admin/media", "/admin/seo", "/admin/prices", "/admin/users", "/admin/audit"]);

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const nav = NAV.filter((item) => READY.has(item.href) && can(staff, item.area));
  const [counts] = await q<{ leads: number; reviews: number; partners: number }>(
    "SELECT count(*) FILTER (WHERE status = 'new')::int AS leads, count(*) FILTER (WHERE kind = 'review' AND status IN ('new', 'in_progress'))::int AS reviews, count(*) FILTER (WHERE kind = 'partner' AND status IN ('new', 'in_progress'))::int AS partners FROM leads",
  );
  return (
    <Shell nav={nav} me={{ name: staff.name, email: staff.email, role: staff.role }} counts={{ "/admin/leads": counts.leads, "/admin/reviews": counts.reviews, "/admin/partners": counts.partners }} logout={logoutAction}>
      {children}
    </Shell>
  );
}
