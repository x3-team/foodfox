import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { one, q } from "./db";
import { verifyPassword } from "./password";

export type Role = "admin" | "manager" | "accountant";
export type Staff = { id: string; email: string; name: string; role: Role; sessionId: string };

export const COOKIE = "fox_adm";
const SESSION_DAYS = 14;
// Wrong passwords per e-mail or per IP in 15 minutes before the form is locked for the rest of the window.
const MAX_FAILS = 8;

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "").trim();
}

/* What each role may open. Managers work with leads, partners, reviews, content and media; prices, SEO, staff and
   settings stay with admins. The accountant works with partners only and is, with the admin, the one who opens their
   personal data (pd). Pages and server actions both check it, the menu only hides what is closed. */
export const ACCESS = {
  dashboard: ["admin", "manager", "accountant"],
  leads: ["admin", "manager"],
  content: ["admin", "manager"],
  media: ["admin", "manager"],
  blog: ["admin", "manager"],
  reviews: ["admin", "manager"],
  partners: ["admin", "manager", "accountant"],
  pd: ["admin", "accountant"],
  course: ["admin", "manager"],
  prices: ["admin"],
  seo: ["admin"],
  users: ["admin"],
  audit: ["admin", "manager"],
} satisfies Record<string, Role[]>;
export type Area = keyof typeof ACCESS;

export function can(staff: Pick<Staff, "role"> | null, area: Area): boolean {
  return Boolean(staff && (ACCESS[area] as Role[]).includes(staff.role));
}

export const currentStaff = cache(async (): Promise<Staff | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await one<{ id: string; email: string; name: string; role: Role; session_id: string; last_seen_at: Date }>(
    `SELECT u.id, u.email, u.name, u.role, s.id AS session_id, s.last_seen_at
       FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active`,
    [sha(token)],
  ).catch(() => null);
  if (!row) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > 5 * 60_000) {
    await q("UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1", [row.session_id]).catch(() => {});
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role, sessionId: row.session_id };
});

/** For pages: the signed-in staff member allowed into `area`, or a redirect. */
export async function requireStaff(area?: Area): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) redirect("/admin/login");
  if (area && !can(staff, area)) redirect("/admin?denied=1");
  return staff;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function assertStaff(area?: Area): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) throw new Error("Войдите заново");
  if (area && !can(staff, area)) throw new Error("Недостаточно прав");
  return staff;
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIp();
  const normalized = email.trim().toLowerCase();
  const [fails] = await q<{ by_email: number; by_ip: number }>(
    `SELECT count(*) FILTER (WHERE email = $1)::int AS by_email, count(*) FILTER (WHERE ip = $2)::int AS by_ip
       FROM admin_login_attempts WHERE NOT ok AND created_at > now() - interval '15 minutes'`,
    [normalized, ip],
  );
  if (fails.by_email >= MAX_FAILS || fails.by_ip >= MAX_FAILS * 3) {
    return { ok: false, error: "Слишком много попыток. Попробуйте через 15 минут" };
  }
  const user = await one<{ id: string; password_hash: string; is_active: boolean; name: string; role: Role }>(
    "SELECT id, password_hash, is_active, name, role FROM admin_users WHERE lower(email) = $1",
    [normalized],
  );
  const ok = Boolean(user && user.is_active && verifyPassword(password, user.password_hash));
  await q("INSERT INTO admin_login_attempts (email, ip, ok) VALUES ($1, $2, $3)", [normalized, ip, ok]);
  if (!ok || !user) {
    return { ok: false, error: user && !user.is_active ? "Учётная запись заблокирована" : "Неверная почта или пароль" };
  }
  const token = randomBytes(32).toString("base64url");
  const ua = ((await headers()).get("user-agent") || "").slice(0, 300);
  await q(
    `INSERT INTO admin_sessions (token_hash, user_id, ip, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(days => $5))`,
    [sha(token), user.id, ip, ua, SESSION_DAYS],
  );
  await q("UPDATE admin_users SET last_login_at = now() WHERE id = $1", [user.id]);
  await q(
    `INSERT INTO audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, summary, ip)
     VALUES ($1, $2, $3, 'login', 'session', $5, 'Вход в админку', $4)`,
    [user.id, user.name || normalized, user.role, ip, user.id],
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await q("DELETE FROM admin_sessions WHERE token_hash = $1", [sha(token)]).catch(() => {});
  jar.delete(COOKIE);
}
