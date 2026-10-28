import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { UsersManager, type UserRow } from "./UsersManager";

export const metadata: Metadata = { title: "Пользователи" };

export default async function UsersPage() {
  const staff = await requireStaff("users");
  const rows = await q<{ id: string; email: string; name: string; role: "admin" | "manager"; is_active: boolean; last_login_at: Date | null; created_at: Date; sessions: number }>(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.last_login_at, u.created_at,
            (SELECT count(*)::int FROM admin_sessions s WHERE s.user_id = u.id AND s.expires_at > now()) AS sessions
       FROM admin_users u ORDER BY u.is_active DESC, u.role, u.name, u.email`,
  );
  const users: UserRow[] = rows.map((r) => ({
    id: r.id, email: r.email, name: r.name, role: r.role, active: r.is_active, sessions: r.sessions,
    lastLogin: r.last_login_at ? new Date(r.last_login_at).toISOString() : null, me: r.id === staff.id,
  }));
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Пользователи</h1>
          <p>Администратор видит и меняет всё. Менеджер работает с заявками, партнёрами, отзывами, страницами и медиа; цены, SEO и пользователи ему закрыты.</p>
        </div>
      </div>
      <UsersManager users={users} />
    </>
  );
}
