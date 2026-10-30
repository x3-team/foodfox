import type { Metadata } from "next";
import { requireStaff, ROLE_HINT, ROLE_LABEL, ROLES, type Role } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { UsersManager, type UserRow } from "./UsersManager";

export const metadata: Metadata = { title: "Сотрудники" };

export default async function UsersPage() {
  const staff = await requireStaff("users");
  const rows = await q<{ id: string; email: string; name: string; role: Role; is_active: boolean; mfa: boolean; last_login_at: Date | null; created_at: Date; sessions: number }>(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.last_login_at, u.created_at, (u.totp_enabled_at IS NOT NULL) AS mfa,
            (SELECT count(*)::int FROM admin_sessions s WHERE s.user_id = u.id AND s.expires_at > now()) AS sessions
       FROM admin_users u ORDER BY u.is_active DESC, u.role, u.name, u.email`,
  );
  const users: UserRow[] = rows.map((r) => ({
    id: r.id, email: r.email, name: r.name, role: r.role, active: r.is_active, mfa: r.mfa, sessions: r.sessions,
    lastLogin: r.last_login_at ? new Date(r.last_login_at).toISOString() : null, me: r.id === staff.id,
  }));
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Сотрудники</h1>
          <p>Кто входит в админку и что ему открыто. Отчёты и медданные клиентов приложения открываются только с двухфакторным входом.</p>
        </div>
      </div>
      <UsersManager users={users} roles={ROLES.map((id) => ({ id, label: ROLE_LABEL[id], hint: ROLE_HINT[id] }))} />
    </>
  );
}
