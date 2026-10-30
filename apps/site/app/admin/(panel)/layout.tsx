import { Shell } from "@/components/admin/Shell";
import { visibleNav } from "@/components/admin/nav";
import { can, requireStaff, ROLE_LABEL } from "@/lib/admin/auth";
import { queueWhere } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const nav = visibleNav((area) => can(staff, area));
  const [counts] = await q<{ leads: number; reviews: number; partners: number }>(
    "SELECT count(*) FILTER (WHERE status = 'new')::int AS leads, count(*) FILTER (WHERE kind = 'review' AND status IN ('new', 'in_progress'))::int AS reviews, count(*) FILTER (WHERE kind = 'partner' AND status IN ('new', 'in_progress'))::int AS partners FROM leads",
  );
  // Reports waiting for a moderator; 0 while apps/web has not created its tables.
  const queue = can(staff, "app_reports")
    ? ((await q<{ n: number }>(`SELECT count(*)::int AS n FROM reports WHERE ${queueWhere()}`).catch(() => []))[0]?.n ?? 0)
    : 0;
  return (
    <Shell nav={nav} me={{ name: staff.name, email: staff.email, roleLabel: ROLE_LABEL[staff.role], mfa: staff.mfa }} counts={{ "/admin/leads": counts.leads, "/admin/reviews": counts.reviews, "/admin/partners": counts.partners, "/admin/app/reports": queue }} logout={logoutAction} build={buildLabel()}>
      {children}
    </Shell>
  );
}

/** «v1.0.0 · 0c7bdfe · 30.10.2026 14:05» from next.config.mjs, in Moscow time like the rest of the admin. */
function buildLabel(): string {
  const time = process.env.FOX_BUILD_TIME;
  const when = time ? new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(time)).replace(",", "") : "";
  return [process.env.FOX_BUILD_VERSION && `v${process.env.FOX_BUILD_VERSION}`, process.env.FOX_BUILD_SHA, when].filter(Boolean).join(" · ");
}
