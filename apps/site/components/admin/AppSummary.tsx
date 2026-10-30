import Link from "next/link";
import { can, type Staff } from "@/lib/admin/auth";
import { appCounts } from "@/lib/admin/app";

/** Aggregates of the mobile app for the dashboard. Counts only, nothing that points at a person. */
export async function AppSummary({ staff }: { staff: Staff }) {
  const c = await appCounts();
  if (!c) {
    return <div className="a-note">Данные приложения пока недоступны: сервер приложения ещё не создал свои таблицы в базе.</div>;
  }
  const users = can(staff, "app_users");
  const reports = can(staff, "app_reports");
  return (
    <section>
      <div className="a-card-head" style={{ marginBottom: 12 }}><h2>Приложение</h2></div>
      <div className="a-grid a-grid-4">
        <Tile href={users ? "/admin/app/users" : undefined} label="Клиенты" value={c.users} note={`+${c.users_week} за 7 дней`} />
        <Tile href={reports ? "/admin/app/reports" : undefined} label="Отчётов за 7 дней" value={c.reports_week} note={c.failed_week ? `с ошибкой: ${c.failed_week}` : "без ошибок обработки"} />
        <Tile href={reports ? "/admin/app/reports?queue=1" : undefined} label="Ждут модерации" value={c.queue} note={c.queue ? "ошибки и низкая уверенность" : "очередь пуста"} hot={c.queue > 0} />
        <Tile label="Активных планов" value={c.plans} note={c.blocked ? `заблокировано клиентов: ${c.blocked}` : "8-недельные планы"} />
      </div>
    </section>
  );
}

function Tile({ href, label, value, note, hot }: { href?: string; label: string; value: number; note: string; hot?: boolean }) {
  const body = (<><small>{label}</small><b>{value}</b><span className="a-delta">{note}</span></>);
  const cls = `a-card a-stat${hot ? " is-hot" : ""}`;
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
