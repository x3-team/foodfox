import type { Metadata } from "next";
import Link from "next/link";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { requireStaff } from "@/lib/admin/auth";
import { appReady, isReportStatus, REPORT_STATUSES } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";
import { dateShort } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Метрики приложения" };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;
// Clients only: partners and staff test accounts would skew the funnel.
const CLIENTS = "SELECT c.id, c.created_at FROM clients c JOIN users u ON u.id = c.user_id WHERE u.role = 'client'";

type Day = { day: string; n: number };

async function daily(sql: string, days: number): Promise<Day[]> {
  return q<Day>(
    `SELECT to_char(d, 'YYYY-MM-DD') AS day, coalesce(x.n, 0)::int AS n
       FROM generate_series((now() AT TIME ZONE 'Europe/Moscow')::date - ($1::int - 1), (now() AT TIME ZONE 'Europe/Moscow')::date, interval '1 day') d
       LEFT JOIN (${sql}) x ON x.day = d::date ORDER BY d`,
    [days],
  );
}
const perDay = (from: string, at = "created_at") => `SELECT (${at} AT TIME ZONE 'Europe/Moscow')::date AS day, count(*) AS n FROM ${from} GROUP BY 1`;

type Issue = { id: string; title: string; count: string; lastSeen: string; permalink?: string };

/** Unresolved API errors from GlitchTip (Sentry-compatible API), when a read token is configured. */
async function glitchtip(): Promise<{ issues: Issue[]; error?: string } | null> {
  const base = process.env.FOX_GLITCHTIP_URL?.replace(/\/$/, "");
  const token = process.env.FOX_GLITCHTIP_TOKEN;
  const org = process.env.FOX_GLITCHTIP_ORG;
  const project = process.env.FOX_GLITCHTIP_PROJECT;
  if (!base || !token || !org || !project) return null;
  try {
    const res = await fetch(`${base}/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/?query=is:unresolved&limit=5`, {
      headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { issues: [], error: `GlitchTip ответил ${res.status}` };
    const data = (await res.json()) as Issue[];
    return { issues: Array.isArray(data) ? data.slice(0, 5) : [] };
  } catch {
    return { issues: [], error: "GlitchTip не отвечает" };
  }
}

function Bars({ title, days, total, unit }: { title: string; days: Day[]; total: number; unit: string }) {
  const max = Math.max(1, ...days.map((d) => d.n));
  const mid = Math.floor(days.length / 2);
  return (
    <section className="a-card">
      <div className="a-card-head"><h2>{title}</h2><span className="muted num">{total}</span></div>
      <div className="a-bars" role="img" aria-label={`${title} по дням: всего ${total}`}>
        {days.map((d, i) => <span key={d.day} className={i === days.length - 1 ? "is-today" : undefined} style={{ height: `${(d.n / max) * 100}%` }} data-tip={`${dateShort(d.day)}: ${d.n} ${unit}`} />)}
      </div>
      <div className="a-bars-axis"><span>{dateShort(days[0].day)}</span><span>{dateShort(days[mid].day)}</span><span>сегодня</span></div>
    </section>
  );
}

export default async function MetricsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("app_metrics");
  if (!(await appReady())) return <AppNotReady />;
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === sp.days) ?? 30;
  const since = `now() - make_interval(days => ${days})`;

  const [signups, reports, chats, [funnel], statuses, [llm], issues] = await Promise.all([
    daily(perDay(`(${CLIENTS}) s`), days),
    daily(perDay("reports"), days),
    daily(perDay("chat_messages WHERE role = 'user'"), days),
    q<{ registered: number; uploaded: number; ready: number; plan: number; chatted: number }>(
      `WITH cohort AS (${CLIENTS} AND c.created_at > ${since})
       SELECT count(*)::int AS registered,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM reports r WHERE r.client_id = k.id))::int AS uploaded,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM reports r WHERE r.client_id = k.id AND r.status = 'ready'))::int AS ready,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM nutrition_plans p WHERE p.client_id = k.id))::int AS plan,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM chat_threads t JOIN chat_messages m ON m.thread_id = t.id WHERE t.client_id = k.id AND m.role = 'user'))::int AS chatted
         FROM cohort k`,
    ),
    q<{ status: string; n: number; conf: number | null }>(
      `SELECT status, count(*)::int AS n, round(avg(parse_confidence) * 100)::int AS conf FROM reports WHERE created_at > ${since} GROUP BY 1 ORDER BY 2 DESC`,
    ),
    q<{ n: number; tokens: number; avg_ms: number | null }>(
      `SELECT count(*)::int AS n, coalesce(sum(coalesce(tokens_in, 0) + coalesce(tokens_out, 0)), 0)::int AS tokens, round(avg(latency_ms))::int AS avg_ms
         FROM llm_requests WHERE created_at > ${since}`,
    ),
    glitchtip(),
  ]);

  const sum = (list: Day[]) => list.reduce((s, d) => s + d.n, 0);
  const steps = [
    { label: "Зарегистрировались", n: funnel.registered },
    { label: "Загрузили отчёт", n: funnel.uploaded },
    { label: "Отчёт распознан", n: funnel.ready },
    { label: "Получили план", n: funnel.plan },
    { label: "Написали помощнику", n: funnel.chatted },
  ];
  const top = Math.max(1, funnel.registered);
  const reportsTotal = statuses.reduce((s, r) => s + r.n, 0);
  const ready = statuses.find((s) => s.status === "ready");
  const appmetrica = process.env.FOX_APPMETRICA_URL;
  const glitchUrl = process.env.FOX_GLITCHTIP_URL;
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Метрики приложения</h1>
          <p>Из базы приложения, без персональных данных. Время по Москве. Краши и поведение в приложении смотрите в AppMetrica, ошибки сервера в GlitchTip.</p>
        </div>
      </div>
      <div className="a-chips">
        {RANGES.map((r) => <Link key={r} className="a-chip" aria-current={r === days ? "true" : undefined} href={`/admin/app/metrics?days=${r}`}>{r} дней</Link>)}
      </div>

      <div className="a-grid a-grid-4" style={{ marginBottom: 24 }}>
        <div className="a-card a-stat"><small>Новые клиенты</small><b>{fmt(sum(signups))}</b><span className="a-delta">за {days} дней</span></div>
        <div className="a-card a-stat"><small>Отчётов загружено</small><b>{fmt(reportsTotal)}</b><span className="a-delta">{reportsTotal ? `распознано ${Math.round(((ready?.n ?? 0) / reportsTotal) * 100)}%` : "пока нет"}</span></div>
        <div className="a-card a-stat"><small>Вопросов помощнику</small><b>{fmt(sum(chats))}</b><span className="a-delta">{llm.avg_ms == null ? "ответов не было" : `ответ в среднем ${(llm.avg_ms / 1000).toFixed(1)} с`}</span></div>
        <div className="a-card a-stat"><small>Токены AI</small><b>{fmt(llm.tokens)}</b><span className="a-delta">{fmt(llm.n)} запросов</span></div>
      </div>

      <div className="a-grid a-grid-2" style={{ marginBottom: 24 }}>
        <section className="a-card">
          <div className="a-card-head"><h2>Воронка</h2><span className="muted">клиенты, пришедшие за {days} дней</span></div>
          {funnel.registered ? (
            <div className="a-split">
              {steps.map((s, i) => (
                <div key={s.label} className="a-split-row" style={{ ["--w" as string]: `${(s.n / top) * 100}%` }}>
                  <span>{s.label}</span>
                  <b className="num" style={{ fontWeight: 500 }}>{fmt(s.n)}<span className="faint"> · {Math.round((s.n / top) * 100)}%{i > 0 && steps[i - 1].n ? `, из прошлого шага ${Math.round((s.n / steps[i - 1].n) * 100)}%` : ""}</span></b>
                  <i />
                </div>
              ))}
            </div>
          ) : <p className="muted">За этот период новых клиентов нет.</p>}
        </section>
        <section className="a-card">
          <div className="a-card-head"><h2>Обработка отчётов</h2><Link className="a-link" href="/admin/app/reports?queue=1">Очередь</Link></div>
          {statuses.length ? (
            <table className="a-table">
              <thead><tr><th>Статус</th><th>Отчётов</th><th>Уверенность</th></tr></thead>
              <tbody>{statuses.map((s) => <tr key={s.status}><td><span className={`a-badge rp-${s.status}`}>{isReportStatus(s.status) ? REPORT_STATUSES[s.status] : s.status}</span></td><td className="num">{s.n}</td><td className="num">{s.conf == null ? "—" : `${s.conf}%`}</td></tr>)}</tbody>
            </table>
          ) : <p className="muted">Отчётов за период нет.</p>}
        </section>
      </div>

      <div className="a-grid a-grid-2" style={{ marginBottom: 24 }}>
        <Bars title="Новые клиенты по дням" days={signups} total={sum(signups)} unit="клиент." />
        <Bars title="Отчёты по дням" days={reports} total={sum(reports)} unit="отчёт." />
        <Bars title="Вопросы помощнику по дням" days={chats} total={sum(chats)} unit="вопр." />
        <section className="a-card">
          <div className="a-card-head"><h2>Мониторинг</h2></div>
          <div className="a-stack" style={{ gap: 12 }}>
            <div className="a-split-row"><span><b>AppMetrica</b><br /><small className="muted">краши, сессии, события приложения</small></span>
              {appmetrica ? <a className="a-btn is-small" href={appmetrica} target="_blank" rel="noreferrer">Открыть</a> : <small className="faint">FOX_APPMETRICA_URL не задан</small>}</div>
            <div className="a-split-row"><span><b>GlitchTip</b><br /><small className="muted">ошибки сервера, по x-request-id связаны с AppMetrica</small></span>
              {glitchUrl ? <a className="a-btn is-small" href={glitchUrl} target="_blank" rel="noreferrer">Открыть</a> : <small className="faint">FOX_GLITCHTIP_URL не задан</small>}</div>
            {issues?.error && <div className="a-error">{issues.error}</div>}
            {issues && !issues.error && (issues.issues.length ? (
              <ul className="a-feed">{issues.issues.map((i) => (
                <li key={i.id}><div><a className="a-link" href={i.permalink ?? glitchUrl} target="_blank" rel="noreferrer">{i.title}</a><small className="faint"> · {i.count} раз, последняя {dateShort(i.lastSeen)}</small></div></li>
              ))}</ul>
            ) : <p className="muted">Нерешённых ошибок сервера нет.</p>)}
            {!issues && glitchUrl && <small className="faint">Чтобы видеть здесь свежие ошибки, задайте FOX_GLITCHTIP_TOKEN, FOX_GLITCHTIP_ORG и FOX_GLITCHTIP_PROJECT.</small>}
          </div>
        </section>
      </div>
    </>
  );
}
