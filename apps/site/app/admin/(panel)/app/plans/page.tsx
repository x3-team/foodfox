import type { Metadata } from "next";
import Link from "next/link";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { can, requireStaff } from "@/lib/admin/auth";
import { appReady, clientTitle, maskPhone } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";
import { dateShort } from "@/lib/admin/format";
import { RebuildButton } from "./RebuildButton";

export const metadata: Metadata = { title: "Планы питания" };

const STATUS: Record<string, string> = { active: "Идёт", completed: "Завершён", draft: "Черновик" };
const PHASES = [
  { weeks: "1–4", name: "Элиминация", what: "красная зона убрана, рацион из зелёной" },
  { weeks: "5–6", name: "Стабилизация", what: "часть красной зоны возвращается" },
  { weeks: "7–8", name: "Расширение", what: "жёлтая зона по ротации" },
];

type Row = { id: string; status: string; started_at: Date; weeks_total: number; report_id: string | null; user_id: string; display_name: string | null; phone: string | null; week: number; days: number; report_status: string | null };

export default async function PlansPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("app_plans");
  if (!(await appReady())) return <AppNotReady />;
  const sp = await searchParams;
  const status = sp.status && STATUS[sp.status] ? sp.status : sp.status === "all" ? null : "active";
  const rows = await q<Row>(
    `SELECT p.id, p.status, p.started_at, p.weeks_total, p.report_id, c.user_id, c.display_name, u.phone, r.status AS report_status,
            greatest(1, least(p.weeks_total, ((current_date - p.started_at) / 7) + 1))::int AS week,
            (SELECT count(*)::int FROM plan_days d WHERE d.plan_id = p.id) AS days
       FROM nutrition_plans p JOIN clients c ON c.id = p.client_id LEFT JOIN users u ON u.id = c.user_id LEFT JOIN reports r ON r.id = p.report_id
      WHERE ${status ? "p.status = $1" : "TRUE"} ORDER BY p.started_at DESC LIMIT 200`,
    status ? [status] : [],
  );
  const [weeks] = await q<{ w1: number; w5: number; w7: number; done: number }>(
    `SELECT count(*) FILTER (WHERE wk BETWEEN 1 AND 4)::int AS w1, count(*) FILTER (WHERE wk BETWEEN 5 AND 6)::int AS w5,
            count(*) FILTER (WHERE wk BETWEEN 7 AND 8)::int AS w7, count(*) FILTER (WHERE wk > 8)::int AS done
       FROM (SELECT ((current_date - started_at) / 7) + 1 AS wk FROM nutrition_plans WHERE status = 'active') x`,
  );
  const byPhase = [weeks.w1, weeks.w5, weeks.w7];
  const users = can(staff, "app_users");

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Планы питания</h1>
          <p>8-недельные планы строятся автоматически из распознанного отчёта. Здесь видно, кто на какой неделе, и можно пересобрать план, если отчёт поправили. Состав плана открывается в карточке отчёта, по доступу к медданным.</p>
        </div>
      </div>
      <div className="a-grid a-grid-4" style={{ marginBottom: 24 }}>
        {PHASES.map((p, i) => <div key={p.name} className="a-card a-stat"><small>Недели {p.weeks} · {p.name}</small><b>{byPhase[i]}</b><span className="a-delta">{p.what}</span></div>)}
        <div className="a-card a-stat"><small>Прошли 8 недель</small><b>{weeks.done}</b><span className="a-delta">план ещё помечен как идущий</span></div>
      </div>
      <div className="a-chips">
        {[["active", "Идут"], ["completed", "Завершены"], ["all", "Все"]].map(([id, label]) => (
          <Link key={id} className="a-chip" aria-current={(status ?? "all") === id ? "true" : undefined} href={`/admin/app/plans?status=${id}`}>{label}</Link>
        ))}
      </div>
      <div className="a-table-wrap">
        {rows.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Клиент</th><th>Старт</th><th>Неделя</th><th>Дней в плане</th><th>Отчёт</th><th>Статус</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="a-cell-main">
                      {users ? <Link href={`/admin/app/users/${r.user_id}`}>{clientTitle(r.display_name, r.phone)}</Link> : <span>{clientTitle(r.display_name, r.phone)}</span>}
                      <span className="sub num">{maskPhone(r.phone)}</span>
                    </td>
                    <td data-label="Старт" className="nowrap">{dateShort(r.started_at)}</td>
                    <td data-label="Неделя" className="num">{r.week} из {r.weeks_total}</td>
                    <td data-label="Дней" className="num" style={r.days < r.weeks_total * 7 ? { color: "var(--a-red)" } : undefined}>{r.days}</td>
                    <td data-label="Отчёт">{r.report_id ? (can(staff, "app_reports") ? <Link className="a-link" href={`/admin/app/reports/${r.report_id}`}>{r.report_status === "ready" ? "распознан" : r.report_status ?? "открыть"}</Link> : r.report_status ?? "есть") : <span className="faint">нет</span>}</td>
                    <td data-label="Статус">{r.status === "active" ? <span className="a-badge s-done">{STATUS[r.status]}</span> : <span className="a-badge">{STATUS[r.status] ?? r.status}</span>}</td>
                    <td className="a-row-actions">{r.status === "active" && r.report_id && <RebuildButton id={r.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="a-empty"><b>Пусто</b>Планов с таким статусом нет.</div>}
      </div>
    </>
  );
}
