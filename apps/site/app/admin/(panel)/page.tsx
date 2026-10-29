import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { ago, dateShort, moscowDay, plural } from "@/lib/admin/format";
import { LEAD_STATUSES, kindLabel, type Lead } from "@/lib/admin/leads";
import { AppSummary } from "@/components/admin/AppSummary";

export const metadata: Metadata = { title: "Сводка" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireStaff("dashboard");
  const { denied } = await searchParams;
  const showApp = can(staff, "app_users") || can(staff, "app_metrics") || can(staff, "app_reports");
  if (!can(staff, "leads")) {
    return (
      <>
        {denied && <div className="a-error" style={{ marginBottom: 24 }}>Этот раздел вам закрыт. Если он нужен для работы, попросите администратора поменять роль.</div>}
        <div className="a-head"><div><h1>Сводка</h1><p>{staff.name || staff.email}</p></div></div>
        {showApp ? <AppSummary staff={staff} /> : <p className="muted">Разделы для вашей роли — в меню слева.</p>}
      </>
    );
  }
  const [stats] = await q<{ fresh: number; today: number; week: number; stale: number; prev_week: number }>(`
    SELECT count(*) FILTER (WHERE status = 'new')::int AS fresh,
           count(*) FILTER (WHERE (created_at AT TIME ZONE 'Europe/Moscow')::date = (now() AT TIME ZONE 'Europe/Moscow')::date AND status <> 'spam')::int AS today,
           count(*) FILTER (WHERE created_at > now() - interval '7 days' AND status <> 'spam')::int AS week,
           count(*) FILTER (WHERE created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days' AND status <> 'spam')::int AS prev_week,
           count(*) FILTER (WHERE status = 'new' AND created_at < now() - interval '24 hours')::int AS stale
      FROM leads`);
  const daily = await q<{ day: string; n: number }>(`
    SELECT to_char((created_at AT TIME ZONE 'Europe/Moscow')::date, 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM leads WHERE created_at > now() - interval '30 days' AND status <> 'spam' GROUP BY 1`);
  const byKind = await q<{ kind: string; n: number }>(`
    SELECT kind, count(*)::int AS n FROM leads WHERE created_at > now() - interval '30 days' AND status <> 'spam' GROUP BY kind ORDER BY n DESC`);
  const latest = await q<Lead>("SELECT * FROM leads WHERE status <> 'spam' ORDER BY created_at DESC LIMIT 6");
  const feed = await q<{ id: string; actor_name: string; summary: string; created_at: Date }>(
    can(staff, "audit_all")
      ? "SELECT id, actor_name, summary, created_at FROM audit_log ORDER BY created_at DESC LIMIT 8"
      : "SELECT id, actor_name, summary, created_at FROM audit_log WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 8",
    can(staff, "audit_all") ? [] : [staff.id],
  );

  const days: Array<{ day: string; n: number }> = [];
  const map = new Map(daily.map((d) => [d.day, d.n]));
  for (let i = 29; i >= 0; i--) {
    const day = moscowDay(new Date(Date.now() - i * 86400_000));
    days.push({ day, n: map.get(day) ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  const total30 = days.reduce((s, d) => s + d.n, 0);
  const kindMax = Math.max(1, ...byKind.map((k) => k.n));
  const delta = stats.week - stats.prev_week;
  const hour = Number(new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "numeric" }).format(new Date()));
  const hello = hour < 5 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <>
      {denied && <div className="a-error" style={{ marginBottom: 24 }}>Этот раздел вам закрыт. Если он нужен для работы, попросите администратора поменять роль.</div>}
      <div className="a-head">
        <div>
          <h1>{hello}{staff.name ? `, ${staff.name.split(" ")[0]}` : ""}</h1>
          <p>{stats.fresh ? `${stats.fresh} ${plural(stats.fresh, "новая заявка ждёт", "новые заявки ждут", "новых заявок ждут")} обработки` : "Все заявки разобраны"}</p>
        </div>
        <div className="a-head-actions">
          <Link className="a-btn is-lime" href="/admin/leads?status=new">Разобрать новые</Link>
        </div>
      </div>

      <div className="a-grid a-grid-4" style={{ marginBottom: 24 }}>
        <Link href="/admin/leads?status=new" className={`a-card a-stat${stats.fresh ? " is-hot" : ""}`}>
          <small>Новые заявки</small><b>{stats.fresh}</b><span className="a-delta">ждут ответа</span>
        </Link>
        <div className="a-card a-stat">
          <small>Сегодня</small><b>{stats.today}</b><span className="a-delta">по Москве</span>
        </div>
        <div className="a-card a-stat">
          <small>За 7 дней</small><b>{stats.week}</b>
          <span className="a-delta">{delta === 0 ? "как неделей раньше" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} к прошлой неделе`}</span>
        </div>
        <Link href="/admin/leads?status=new" className="a-card a-stat">
          <small>Без ответа больше суток</small><b style={stats.stale ? { color: "var(--a-red)" } : undefined}>{stats.stale}</b>
          <span className="a-delta">{stats.stale ? "стоит разобрать первыми" : "просрочек нет"}</span>
        </Link>
      </div>

      <div className="a-grid a-grid-side" style={{ marginBottom: 24 }}>
        <section className="a-card">
          <div className="a-card-head"><h2>Заявки за 30 дней</h2><span className="muted num">{total30}</span></div>
          <div className="a-bars" role="img" aria-label={`Заявки по дням за 30 дней, всего ${total30}`}>
            {days.map((d, i) => (
              <span key={d.day} className={i === days.length - 1 ? "is-today" : undefined} style={{ height: `${(d.n / max) * 100}%` }} data-tip={`${dateShort(d.day)}: ${d.n}`} />
            ))}
          </div>
          <div className="a-bars-axis"><span>{dateShort(days[0].day)}</span><span>{dateShort(days[15].day)}</span><span>сегодня</span></div>
        </section>
        <section className="a-card">
          <div className="a-card-head"><h2>По формам</h2><span className="muted">30 дней</span></div>
          {byKind.length ? (
            <div className="a-split">
              {byKind.map((k) => (
                <Link key={k.kind} href={`/admin/leads?kind=${encodeURIComponent(k.kind)}`} className="a-split-row" style={{ textDecoration: "none", ["--w" as string]: `${(k.n / kindMax) * 100}%` }}>
                  <span>{kindLabel(k.kind)}</span><b className="num" style={{ fontWeight: 500 }}>{k.n}</b><i />
                </Link>
              ))}
            </div>
          ) : <p className="muted">Пока пусто</p>}
        </section>
      </div>

      {showApp && <div style={{ marginBottom: 24 }}><AppSummary staff={staff} /></div>}

      <div className="a-grid a-grid-2">
        <section className="a-card">
          <div className="a-card-head"><h2>Последние заявки</h2><Link href="/admin/leads">Все</Link></div>
          {latest.length ? (
            <ul className="a-feed">
              {latest.map((l) => (
                <li key={l.id}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Link href={`/admin/leads/${l.id}`} style={{ fontWeight: 500, textDecoration: "none" }}>{l.name || l.email || l.phone || `#${l.id}`}</Link>
                    <small>{kindLabel(l.kind)} · {ago(l.created_at)}</small>
                  </div>
                  <span className={`a-badge s-${l.status}`}>{LEAD_STATUSES[l.status]}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Заявок ещё не было. Они появятся здесь сразу после отправки любой формы на сайте.</p>}
        </section>
        <section className="a-card">
          <div className="a-card-head"><h2>{can(staff, "audit_all") ? "Последние действия" : "Мои действия"}</h2><Link href="/admin/audit">Журнал</Link></div>
          {feed.length ? (
            <ul className="a-feed">
              {feed.map((e) => (
                <li key={e.id}>
                  <span className="a-avatar">{(e.actor_name || "?").slice(0, 1).toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}>
                    <span>{e.summary}</span>
                    <small>{e.actor_name} · {ago(e.created_at)}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Пока ничего</p>}
        </section>
      </div>
    </>
  );
}
