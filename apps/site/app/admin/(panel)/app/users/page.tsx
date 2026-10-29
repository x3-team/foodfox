import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { appReady, clientTitle, isReportStatus, maskPhone, REPORT_STATUSES } from "@/lib/admin/app";
import { AppNotReady as NotReady } from "@/components/admin/AppNotReady";
import { q } from "@/lib/admin/db";
import { ago, dateShort } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Клиенты приложения" };

const PER_PAGE = 50;
const BLOCKED = "(u.blocked_at IS NOT NULL AND (u.blocked_until IS NULL OR u.blocked_until > now()))";

type Row = {
  id: string; phone: string | null; email: string | null; role: string; created_at: Date; blocked: boolean;
  display_name: string | null; reports: number; last_status: string | null; plan: boolean; last_seen: Date | null;
};

export default async function AppUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("app_users");
  if (!(await appReady())) return <NotReady />;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: string[] = ["u.role IN ('client', 'partner')"];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => { params.push(value); where.push(sql.replaceAll("?", `$${params.length}`)); };

  const text = sp.q?.trim();
  if (text) {
    const digits = text.replace(/\D/g, "");
    if (/^[0-9a-f-]{36}$/i.test(text)) add("(u.id = ?::uuid OR c.id = ?::uuid)", text);
    else if (digits.length >= 4 && digits.length === text.replace(/[\s()+-]/g, "").length) {
      add("u.phone LIKE ?", `%${digits.length === 11 && digits.startsWith("8") ? `7${digits.slice(1)}` : digits}%`);
    } else add("(c.display_name ILIKE ? OR u.email ILIKE ?)", `%${text.replace(/[%_\\]/g, "\\$&")}%`);
  }
  if (sp.status === "blocked") where.push(BLOCKED);
  if (sp.status === "active") where.push(`NOT ${BLOCKED}`);
  if (sp.report === "none") where.push("NOT EXISTS (SELECT 1 FROM reports r WHERE r.client_id = c.id)");
  if (sp.report && isReportStatus(sp.report)) add("(SELECT r.status FROM reports r WHERE r.client_id = c.id ORDER BY r.created_at DESC LIMIT 1) = ?", sp.report);
  if (sp.role === "client" || sp.role === "partner") add("u.role = ?", sp.role);

  const sql = `FROM users u LEFT JOIN clients c ON c.user_id = u.id WHERE ${where.join(" AND ")}`;
  const [{ total }] = await q<{ total: number }>(`SELECT count(*)::int AS total ${sql}`, params);
  const rows = await q<Row>(
    `SELECT u.id, u.phone, u.email, u.role, u.created_at, ${BLOCKED} AS blocked, c.display_name,
            (SELECT count(*)::int FROM reports r WHERE r.client_id = c.id) AS reports,
            (SELECT r.status FROM reports r WHERE r.client_id = c.id ORDER BY r.created_at DESC LIMIT 1) AS last_status,
            EXISTS (SELECT 1 FROM nutrition_plans p WHERE p.client_id = c.id AND p.status = 'active') AS plan,
            (SELECT max(e.created_at) FROM analytics_events e WHERE e.client_id = c.id) AS last_seen
       ${sql} ORDER BY u.created_at DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`,
    params,
  );
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, page: undefined, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Клиенты приложения</h1>
          <p>Поиск по телефону, имени, почте или ID. Телефон в списке скрыт, целиком он виден в карточке. Медданные открываются отдельно, по праву и с причиной.</p>
        </div>
      </div>
      <div className="a-chips">
        <Link className="a-chip" aria-current={!sp.status ? "true" : undefined} href={`/admin/app/users${qs({ status: undefined })}`}>Все</Link>
        <Link className="a-chip" aria-current={sp.status === "active" ? "true" : undefined} href={`/admin/app/users${qs({ status: "active" })}`}>Активные</Link>
        <Link className="a-chip" aria-current={sp.status === "blocked" ? "true" : undefined} href={`/admin/app/users${qs({ status: "blocked" })}`}>Заблокированные</Link>
      </div>
      <form className="a-filters" method="get">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <label className="a-field is-search"><span className="sr">Поиск</span><input className="a-input" name="q" defaultValue={sp.q} placeholder="+7 925…, имя, почта или ID" autoFocus={!sp.q} /></label>
        <label className="a-field"><span className="sr">Отчёт</span>
          <select className="a-input" name="report" defaultValue={sp.report ?? ""}>
            <option value="">Любой отчёт</option>
            <option value="none">Без отчёта</option>
            {Object.entries(REPORT_STATUSES).map(([id, label]) => <option key={id} value={id}>Последний: {label.toLowerCase()}</option>)}
          </select>
        </label>
        <label className="a-field"><span className="sr">Тип</span>
          <select className="a-input" name="role" defaultValue={sp.role ?? ""}>
            <option value="">Клиенты и партнёры</option>
            <option value="client">Только клиенты</option>
            <option value="partner">Только партнёры</option>
          </select>
        </label>
        <button className="a-btn" type="submit">Найти</button>
      </form>
      <div className="a-table-wrap">
        {rows.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Клиент</th><th>Телефон</th><th>Отчёты</th><th>План</th><th>Активность</th><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="a-cell-main">
                      <Link href={`/admin/app/users/${r.id}`}>{clientTitle(r.display_name, r.phone)}</Link>
                      <span className="sub">{r.role === "partner" ? "Партнёр · " : ""}с {dateShort(r.created_at)}</span>
                    </td>
                    <td data-label="Телефон" className="nowrap num">{maskPhone(r.phone)}</td>
                    <td data-label="Отчёты">
                      {r.reports ? <>{r.reports} {r.last_status && isReportStatus(r.last_status) && <span className={`a-badge rp-${r.last_status}`}>{REPORT_STATUSES[r.last_status]}</span>}</> : <span className="faint">нет</span>}
                    </td>
                    <td data-label="План">{r.plan ? "Идёт" : <span className="faint">—</span>}</td>
                    <td data-label="Активность" className="nowrap">{r.last_seen ? ago(r.last_seen) : <span className="faint">—</span>}</td>
                    <td data-label="Статус">{r.blocked ? <span className="a-badge is-off">Заблокирован</span> : <span className="a-badge s-done">Активен</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="a-empty"><b>Никого не нашли</b>Проверьте номер или уберите фильтры.</div>}
        <div className="a-pager">
          <span>Всего {total} · страница {page} из {pages}</span>
          <nav>
            {page > 1 && <Link className="a-btn is-ghost is-small" href={`/admin/app/users${qs({ page: String(page - 1) })}`}>← Назад</Link>}
            {page < pages && <Link className="a-btn is-ghost is-small" href={`/admin/app/users${qs({ page: String(page + 1) })}`}>Дальше →</Link>}
          </nav>
        </div>
      </div>
    </>
  );
}
