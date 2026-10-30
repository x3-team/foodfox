import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { one, q } from "./db";
import { verifyPassword } from "./password";
import { verifyCode } from "./totp";

export const ROLES = ["admin", "manager", "accountant", "moderator", "editor", "support", "analyst"] as const;
export type Role = (typeof ROLES)[number];
export const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  accountant: "Бухгалтер",
  moderator: "Модератор отчётов",
  editor: "Контент-редактор",
  support: "Поддержка",
  analyst: "Аналитик",
};

/* One line per role for the staff page, so whoever hands out a role sees what it opens. */
export const ROLE_HINT: Record<Role, string> = {
  admin: "Всё, включая сотрудников, цены, SEO и медданные клиентов",
  manager: "Заявки, партнёры, отзывы, страницы, блог, медиа; клиенты приложения без медданных",
  accountant: "Партнёры: начисления и выплаты",
  moderator: "Клиенты приложения и их отчёты: сверка, правка, повторная обработка",
  editor: "Страницы, блог, медиа, отзывы; продукты, зоны, рецепты и планы приложения",
  support: "Заявки и клиенты приложения без медданных: поиск, блокировка, выход со всех устройств",
  analyst: "Сводка и метрики приложения, без персональных данных",
};

export type Staff = { id: string; email: string; name: string; role: Role; sessionId: string; mfa: boolean };

export const COOKIE = "fox_adm";
const SESSION_DAYS = 14;
// Wrong passwords per e-mail or per IP in 15 minutes before the form is locked for the rest of the window.
const MAX_FAILS = 8;

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "").trim();
}

/* What each role may open. Pages and server actions both check it, the menu only hides what is closed.
   app_* are the sections of the mobile app; `medical` is a client's PDF, values and zones, and also needs 2FA. */
const ALL = ROLES;
export const ACCESS = {
  dashboard: ALL,
  leads: ["admin", "manager", "support"],
  content: ["admin", "manager", "editor"],
  media: ["admin", "manager", "editor"],
  blog: ["admin", "manager", "editor"],
  reviews: ["admin", "manager", "editor"],
  partners: ["admin", "manager", "accountant"],
  course: ["admin", "manager", "editor"],
  prices: ["admin"],
  seo: ["admin"],
  users: ["admin"],
  audit: ALL,
  /** The whole log; everyone else sees only their own actions. */
  audit_all: ["admin"],
  app_users: ["admin", "manager", "moderator", "support"],
  app_block: ["admin", "moderator", "support"],
  app_reports: ["admin", "moderator"],
  medical: ["admin", "moderator"],
  app_catalog: ["admin", "editor"],
  app_recipes: ["admin", "editor"],
  app_plans: ["admin", "editor"],
  app_assistant: ["admin"],
  app_push: ["admin", "manager"],
  app_metrics: ["admin", "manager", "analyst"],
} satisfies Record<string, readonly Role[]>;
export type Area = keyof typeof ACCESS;

/** Areas that open only with two-factor sign-in switched on. */
export const MFA_AREAS: readonly Area[] = ["medical", "app_reports"];

/** FOX_ADMIN_REQUIRE_MFA=0 (false, no, off) lifts that rule on a test server; any other value or none keeps it. */
export function mfaRequired(): boolean {
  return !["0", "false", "no", "off"].includes((process.env.FOX_ADMIN_REQUIRE_MFA ?? "").trim().toLowerCase());
}

/** The staff member may open the MFA areas: 2FA is on, or the rule is off on this server. */
export const mfaOk = (staff: Pick<Staff, "mfa">) => staff.mfa || !mfaRequired();

export function can(staff: Pick<Staff, "role"> | null, area: Area): boolean {
  return Boolean(staff && (ACCESS[area] as readonly Role[]).includes(staff.role));
}

type SessionRow = { id: string; email: string; name: string; role: Role; session_id: string; last_seen_at: Date; mfa: boolean; mfa_pending: boolean };

const sessionRow = cache(async (): Promise<SessionRow | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return one<SessionRow>(
    `SELECT u.id, u.email, u.name, u.role, s.id AS session_id, s.last_seen_at, s.mfa_pending,
            (u.totp_enabled_at IS NOT NULL) AS mfa
       FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active`,
    [sha(token)],
  ).catch(() => null);
});

export const currentStaff = cache(async (): Promise<Staff | null> => {
  const row = await sessionRow();
  if (!row || row.mfa_pending) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > 5 * 60_000) {
    await q("UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1", [row.session_id]).catch(() => {});
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role, sessionId: row.session_id, mfa: row.mfa };
});

/** A session that passed the password and waits for the code. */
export async function pendingStaff(): Promise<{ id: string; email: string; sessionId: string } | null> {
  const row = await sessionRow();
  return row?.mfa_pending ? { id: row.id, email: row.email, sessionId: row.session_id } : null;
}

/** For pages: the signed-in staff member allowed into `area`, or a redirect. */
export async function requireStaff(area?: Area): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) {
    if (await pendingStaff()) redirect("/admin/login/code");
    redirect("/admin/login");
  }
  if (area && !can(staff, area)) redirect("/admin?denied=1");
  if (area && MFA_AREAS.includes(area) && !mfaOk(staff)) redirect("/admin/account?mfa=required");
  return staff;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function assertStaff(area?: Area): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) throw new Error("Войдите заново");
  if (area && !can(staff, area)) throw new Error("Недостаточно прав");
  if (area && MFA_AREAS.includes(area) && !mfaOk(staff)) throw new Error("Включите двухфакторный вход в профиле");
  return staff;
}

async function tooManyFails(email: string, ip: string): Promise<boolean> {
  const [fails] = await q<{ by_email: number; by_ip: number }>(
    `SELECT count(*) FILTER (WHERE email = $1)::int AS by_email, count(*) FILTER (WHERE ip = $2)::int AS by_ip
       FROM admin_login_attempts WHERE NOT ok AND created_at > now() - interval '15 minutes'`,
    [email, ip],
  );
  return fails.by_email >= MAX_FAILS || fails.by_ip >= MAX_FAILS * 3;
}

export async function signIn(email: string, password: string): Promise<{ ok: true; mfa: boolean } | { ok: false; error: string }> {
  const ip = await clientIp();
  const normalized = email.trim().toLowerCase();
  if (await tooManyFails(normalized, ip)) {
    return { ok: false, error: "Слишком много попыток. Попробуйте через 15 минут" };
  }
  const user = await one<{ id: string; password_hash: string; is_active: boolean; name: string; role: Role; mfa: boolean }>(
    "SELECT id, password_hash, is_active, name, role, (totp_enabled_at IS NOT NULL) AS mfa FROM admin_users WHERE lower(email) = $1",
    [normalized],
  );
  const ok = Boolean(user && user.is_active && verifyPassword(password, user.password_hash));
  await q("INSERT INTO admin_login_attempts (email, ip, ok) VALUES ($1, $2, $3)", [normalized, ip, ok]);
  if (!ok || !user) {
    return { ok: false, error: user && !user.is_active ? "Учётная запись заблокирована" : "Неверная почта или пароль" };
  }
  const token = randomBytes(32).toString("base64url");
  const ua = ((await headers()).get("user-agent") || "").slice(0, 300);
  // With 2FA on, the session stays pending for 10 minutes until the code is entered (signInCode).
  await q(
    `INSERT INTO admin_sessions (token_hash, user_id, ip, user_agent, mfa_pending, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + CASE WHEN $5 THEN interval '10 minutes' ELSE make_interval(days => $6) END)`,
    [sha(token), user.id, ip, ua, user.mfa, SESSION_DAYS],
  );
  if (!user.mfa) await recordLogin(user.id, user.name || normalized, user.role, ip);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true, mfa: user.mfa };
}

async function recordLogin(userId: string, name: string, role: Role, ip: string, summary = "Вход в админку") {
  await q("UPDATE admin_users SET last_login_at = now() WHERE id = $1", [userId]);
  await q(
    `INSERT INTO audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, summary, ip)
     VALUES ($1, $2, $3, 'login', 'session', $6, $5, $4)`,
    [userId, name, role, ip, summary, userId],
  );
}

/** Second step of the sign-in: the code from the authenticator app turns the pending session into a full one. */
export async function signInCode(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const pending = await pendingStaff();
  if (!pending) return { ok: false, error: "Сессия входа истекла, введите пароль ещё раз" };
  const ip = await clientIp();
  const email = pending.email.toLowerCase();
  if (await tooManyFails(email, ip)) return { ok: false, error: "Слишком много попыток. Попробуйте через 15 минут" };
  const user = await one<{ name: string; role: Role; totp_secret: string | null; totp_last_step: string }>(
    "SELECT name, role, totp_secret, totp_last_step FROM admin_users WHERE id = $1 AND is_active",
    [pending.id],
  );
  const step = user?.totp_secret ? verifyCode(user.totp_secret, code, Number(user.totp_last_step)) : null;
  await q("INSERT INTO admin_login_attempts (email, ip, ok) VALUES ($1, $2, $3)", [email, ip, step !== null]);
  if (step === null || !user) return { ok: false, error: "Код не подходит. Проверьте время на телефоне" };
  await q("UPDATE admin_users SET totp_last_step = $2 WHERE id = $1", [pending.id, step]);
  await q(
    "UPDATE admin_sessions SET mfa_pending = false, expires_at = now() + make_interval(days => $2) WHERE id = $1",
    [pending.sessionId, SESSION_DAYS],
  );
  await recordLogin(pending.id, user.name || email, user.role, ip, "Вход в админку с кодом 2FA");
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await q("DELETE FROM admin_sessions WHERE token_hash = $1", [sha(token)]).catch(() => {});
  jar.delete(COOKIE);
}
