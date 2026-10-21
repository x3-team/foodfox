import { Shell } from "@/components/admin/Shell";
import { NAV } from "@/components/admin/nav";
import { can, requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const nav = NAV.filter((item) => can(staff, item.area));
  const [counts] = await q<{ leads: number; reviews: number; partners: number }>(
    "SELECT count(*) FILTER (WHERE status = 'new')::int AS leads, count(*) FILTER (WHERE kind = 'review' AND status IN ('new', 'in_progress'))::int AS reviews, count(*) FILTER (WHERE kind = 'partner' AND status IN ('new', 'in_progress'))::int AS partners FROM leads",
  );
  return (
    <Shell nav={nav} me={{ name: staff.name, email: staff.email, role: staff.role }} counts={{ "/admin/leads": counts.leads, "/admin/reviews": counts.reviews, "/admin/partners": counts.partners }} logout={logoutAction}>
      {children}
    </Shell>
  );
}
