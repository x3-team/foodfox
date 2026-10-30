import type { Metadata } from "next";
import Link from "next/link";
import { ACCESS, AREA_LABEL, CORE_ROLES, MFA_AREAS, requireStaff, ROLE_HINT, ROLE_LABEL, ROLES, type Area, type Role } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";

export const metadata: Metadata = { title: "Права ролей" };

/* Read-only: the table is built from ACCESS, the same map every page and server action checks,
   so what is shown here is exactly what the server enforces. */
export default async function RightsPage() {
  await requireStaff("users");
  const counts = await q<{ role: Role; n: number }>(
    "SELECT role, count(*)::int AS n FROM admin_users WHERE is_active GROUP BY role",
  ).catch(() => []);
  const people = new Map(counts.map((c) => [c.role, c.n]));
  const roles = [...ROLES].sort((a, b) => Number(!CORE_ROLES.includes(a)) - Number(!CORE_ROLES.includes(b)));
  const areas = Object.keys(AREA_LABEL) as Area[];
  const groups = [...new Set(areas.map((a) => AREA_LABEL[a].group))];
  const allowed = (role: Role, area: Area) => (ACCESS[area] as readonly Role[]).includes(role);

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Сотрудники</h1>
          <p>Что открывает каждая роль. Первые четыре роли из схемы заказчика, остальные дополнительные, с узкими правами. Права заданы в коде, сервер проверяет их на каждой странице и при каждом действии.</p>
        </div>
      </div>
      <nav className="a-tabs-inline">
        <Link href="/admin/users">Сотрудники</Link>
        <Link href="/admin/users/rights" aria-current="page">Права ролей</Link>
      </nav>

      <div className="a-card" style={{ marginBottom: 16 }}>
        <div className="a-stack">
          {roles.map((role) => (
            <p key={role} style={{ margin: 0 }}>
              <span className={`a-badge r-${role}`}>{ROLE_LABEL[role]}</span>{" "}
              {!CORE_ROLES.includes(role) ? <span className="a-badge is-plain">дополнительная</span> : null}{" "}
              <span style={{ color: "var(--a-ink-65)" }}>{ROLE_HINT[role]} · сотрудников: {people.get(role) ?? 0}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="a-table-wrap">
        <div className="a-table-scroll">
          <table className="a-table a-rights">
            <thead>
              <tr>
                <th>Раздел</th>
                {roles.map((role) => (
                  <th key={role} style={{ textAlign: "center" }}>{ROLE_LABEL[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => [
                <tr key={group} className="a-rights-group">
                  <th colSpan={roles.length + 1} style={{ textAlign: "left", paddingTop: 18 }}>{group}</th>
                </tr>,
                ...areas.filter((a) => AREA_LABEL[a].group === group).map((area) => (
                  <tr key={area}>
                    <td className="a-cell-main">
                      {AREA_LABEL[area].label}
                      {AREA_LABEL[area].hint || MFA_AREAS.includes(area) ? (
                        <small style={{ display: "block", color: "var(--a-ink-65)" }}>{AREA_LABEL[area].hint ?? "нужен двухфакторный вход"}</small>
                      ) : null}
                    </td>
                    {roles.map((role) => (
                      <td key={role} data-label={ROLE_LABEL[role]} style={{ textAlign: "center" }} aria-label={`${ROLE_LABEL[role]}: ${allowed(role, area) ? "есть доступ" : "нет доступа"}`}>
                        {allowed(role, area) ? <span style={{ color: "var(--a-green)", fontWeight: 600 }}>✓</span> : <span style={{ color: "var(--a-ink-65)" }}>—</span>}
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
