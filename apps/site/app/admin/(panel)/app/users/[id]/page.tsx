import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { Icon } from "@/components/admin/Icon";
import { can, requireStaff } from "@/lib/admin/auth";
import { appReady, clientTitle, fullPhone, isReportStatus, LOW_CONFIDENCE, medicalGrant, REPORT_STATUSES } from "@/lib/admin/app";
import { one, q } from "@/lib/admin/db";
import { ago, dateShort, dateTime } from "@/lib/admin/format";
import { MedicalGate } from "../../MedicalGate";
import { UserActions } from "./UserActions";

export const metadata: Metadata = { title: "Клиент" };

type User = {
  id: string; phone: string | null; email: string | null; role: string; created_at: Date;
  blocked_at: Date | null; blocked_until: Date | null; blocked_reason: string | null; sessions_revoked_at: Date | null;
  client_id: string | null; display_name: string | null; referral_code: string | null; privacy_consent_at: Date | null;
};

export default async function AppUserPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("app_users");
  if (!(await appReady())) return <AppNotReady />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await one<User>(
    `SELECT u.id, u.phone, u.email, u.role, u.created_at, u.blocked_at, u.blocked_until, u.blocked_reason, u.sessions_revoked_at,
            c.id AS client_id, c.display_name, c.referral_code, c.privacy_consent_at
       FROM users u LEFT JOIN clients c ON c.user_id = u.id WHERE u.id = $1`,
    [id],
  );
  if (!user) notFound();
  const cid = user.client_id;
  const blocked = Boolean(user.blocked_at && (!user.blocked_until || new Date(user.blocked_until) > new Date()));

  const [activity] = await q<{ devices: number; last_login: Date | null; last_seen: Date | null; events: number; messages: number }>(
    `SELECT (SELECT count(*)::int FROM refresh_tokens t WHERE t.user_id = $1 AND t.revoked_at IS NULL AND t.expires_at > now()) AS devices,
            (SELECT max(t.created_at) FROM refresh_tokens t WHERE t.user_id = $1) AS last_login,
            (SELECT max(e.created_at) FROM analytics_events e WHERE e.client_id = $2) AS last_seen,
            (SELECT count(*)::int FROM analytics_events e WHERE e.client_id = $2 AND e.created_at > now() - interval '30 days') AS events,
            (SELECT count(*)::int FROM chat_messages m JOIN chat_threads t ON t.id = m.thread_id WHERE t.client_id = $2 AND m.role = 'user') AS messages`,
    [id, cid],
  );
  const reports = cid
    ? await q<{ id: string; status: string; parse_confidence: string | null; created_at: Date; reviewed_at: Date | null; results: number }>(
        `SELECT r.id, r.status, r.parse_confidence, r.created_at, r.reviewed_at,
                (SELECT count(*)::int FROM test_results t WHERE t.report_id = r.id) AS results
           FROM reports r WHERE r.client_id = $1 ORDER BY r.created_at DESC`,
        [cid],
      )
    : [];
  const plan = cid
    ? await one<{ status: string; started_at: Date; weeks_total: number }>(
        "SELECT status, started_at, weeks_total FROM nutrition_plans WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1",
        [cid],
      )
    : null;
  const history = await q<{ id: string; actor_name: string; summary: string; created_at: Date }>(
    "SELECT id, actor_name, summary, created_at FROM audit_log WHERE entity IN ('app_user', 'medical', 'report') AND entity_id = $1 ORDER BY created_at DESC LIMIT 12",
    [id],
  );
  const grant = cid && can(staff, "medical") && staff.mfa ? await medicalGrant(staff, cid) : null;
  const zones = grant && reports[0]
    ? await q<{ zone: string; n: number }>("SELECT zone, count(*)::int AS n FROM test_results WHERE report_id = $1 GROUP BY zone", [reports[0].id])
    : [];
  const week = plan ? Math.min(plan.weeks_total, Math.max(1, Math.floor((Date.now() - new Date(plan.started_at).getTime()) / (7 * 86400_000)) + 1)) : null;
  const name = clientTitle(user.display_name, user.phone);

  return (
    <>
      <nav className="a-crumbs"><Link href="/admin/app/users"><Icon name="back" size={16} /> Клиенты</Link></nav>
      <div className="a-head">
        <div>
          <h1>{name}</h1>
          <p>
            {blocked ? <span className="a-badge is-off">Заблокирован</span> : <span className="a-badge s-done">Активен</span>}
            {user.role === "partner" && <> <span className="a-badge is-plain">Партнёр</span></>}
            <span className="muted"> · с {dateShort(user.created_at)}</span>
          </p>
        </div>
      </div>

      <div className="a-grid a-grid-side">
        <div className="a-stack">
          {blocked && (
            <div className="a-error">
              Заблокирован {dateTime(user.blocked_at)}{user.blocked_until ? ` до ${dateTime(user.blocked_until)}` : ", бессрочно"}. Причина: {user.blocked_reason || "не указана"}
            </div>
          )}
          <section className="a-card">
            <div className="a-card-head"><h2>Профиль</h2></div>
            <dl className="a-dl">
              <dt>Телефон</dt><dd className="num">{fullPhone(user.phone)}</dd>
              <dt>Почта</dt><dd>{user.email && !user.email.endsWith("@phone.foodfox") ? user.email : "—"}</dd>
              <dt>ID</dt><dd className="num faint" style={{ fontSize: 13 }}>{user.id}</dd>
              <dt>Согласие на обработку</dt><dd>{user.privacy_consent_at ? dateTime(user.privacy_consent_at) : "—"}</dd>
              <dt>Промокод партнёра</dt><dd>{user.referral_code || "—"}</dd>
            </dl>
          </section>

          <section className="a-card">
            <div className="a-card-head"><h2>Отчёты</h2><span className="muted">{reports.length}</span></div>
            {reports.length ? (
              <div className="a-table-scroll">
                <table className="a-table">
                  <thead><tr><th>Загружен</th><th>Статус</th><th>Антигенов</th><th>Уверенность</th></tr></thead>
                  <tbody>
                    {reports.map((r) => {
                      const conf = r.parse_confidence == null ? null : Number(r.parse_confidence);
                      return (
                        <tr key={r.id}>
                          <td className="a-cell-main">
                            {can(staff, "app_reports") ? <Link href={`/admin/app/reports/${r.id}`}>{dateTime(r.created_at)}</Link> : <span>{dateTime(r.created_at)}</span>}
                            {r.reviewed_at && <span className="sub">проверен {ago(r.reviewed_at)}</span>}
                          </td>
                          <td data-label="Статус">{isReportStatus(r.status) ? <span className={`a-badge rp-${r.status}`}>{REPORT_STATUSES[r.status]}</span> : r.status}</td>
                          <td data-label="Антигенов" className="num">{r.results}</td>
                          <td data-label="Уверенность" className="num" style={conf !== null && conf < LOW_CONFIDENCE ? { color: "var(--a-red)" } : undefined}>{conf === null ? "—" : `${Math.round(conf * 100)}%`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="muted">Отчёт ещё не загружен.</p>}
          </section>

          <MedicalGate
            userId={user.id}
            allowed={can(staff, "medical")}
            mfa={staff.mfa}
            grantUntil={grant ? grant.toISOString() : null}
            hasData={reports.length > 0}
          >
            {zones.length ? (
              <div className="a-zones">
                {(["red", "yellow", "green"] as const).map((z) => (
                  <div key={z} className={`a-zone z-${z}`}><b>{zones.find((x) => x.zone === z)?.n ?? 0}</b><small>{z === "red" ? "красная" : z === "yellow" ? "жёлтая" : "зелёная"}</small></div>
                ))}
              </div>
            ) : null}
            {reports[0] && can(staff, "app_reports") && <Link className="a-btn is-ghost is-small" href={`/admin/app/reports/${reports[0].id}`}>Открыть последний отчёт</Link>}
          </MedicalGate>
        </div>

        <div className="a-stack">
          <section className="a-card">
            <div className="a-card-head"><h2>Активность</h2></div>
            <dl className="a-dl" style={{ gridTemplateColumns: "140px minmax(0,1fr)" }}>
              <dt>Последний вход</dt><dd>{activity.last_login ? ago(activity.last_login) : "—"}</dd>
              <dt>Был в приложении</dt><dd>{activity.last_seen ? ago(activity.last_seen) : "—"}</dd>
              <dt>Устройств</dt><dd className="num">{activity.devices}</dd>
              <dt>Действий за 30 дней</dt><dd className="num">{activity.events}</dd>
              <dt>Вопросов помощнику</dt><dd className="num">{activity.messages}</dd>
              <dt>План</dt><dd>{plan ? `${plan.status === "active" ? "идёт" : plan.status === "completed" ? "завершён" : "черновик"}${week && plan.status === "active" ? `, неделя ${week} из ${plan.weeks_total}` : ""}` : "—"}</dd>
            </dl>
          </section>
          {can(staff, "app_block") && <UserActions id={user.id} blocked={blocked} devices={activity.devices} />}
          <section className="a-card">
            <div className="a-card-head"><h2>История</h2>{can(staff, "audit") && <Link href={`/admin/audit?q=${user.id}`}>Журнал</Link>}</div>
            {history.length ? (
              <ul className="a-timeline">
                {history.map((h) => <li key={h.id}><div><small>{h.actor_name} · {ago(h.created_at)}</small><p>{h.summary}</p></div></li>)}
              </ul>
            ) : <p className="muted">Действий сотрудников с этим клиентом ещё не было.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
