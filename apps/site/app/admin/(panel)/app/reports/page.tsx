import type { Metadata } from "next";
import Link from "next/link";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { requireStaff } from "@/lib/admin/auth";
import { appReady, clientTitle, isReportStatus, LOW_CONFIDENCE, maskPhone, queueWhere, REPORT_STATUSES } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";
import { ago, dateTime } from "@/lib/admin/format";
import { reprocessMany } from "./actions";

export const metadata: Metadata = { title: "Отчёты" };

const PER_PAGE = 50;

type Row = {
  id: string; status: string; parse_confidence: string | null; created_at: Date; reviewed_at: Date | null; results: number;
  user_id: string | null; phone: string | null; display_name: string | null; last_error: string | null;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("app_reports");
  if (!(await appReady())) return <AppNotReady />;
  const sp = await searchParams;
  const queue = sp.queue === "1" || (!sp.status && !sp.q && sp.queue !== "0");
  const page = Math.max(1, Number(sp.page) || 1);
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => { params.push(value); where.push(sql.replaceAll("?", `$${params.length}`)); };
  if (queue) where.push(queueWhere("r"));
  if (sp.status && isReportStatus(sp.status)) add("r.status = ?", sp.status);
  const text = sp.q?.trim();
  if (text) {
    const digits = text.replace(/\D/g, "");
    if (/^[0-9a-f-]{36}$/i.test(text)) add("(r.id = ?::uuid OR u.id = ?::uuid)", text);
    else if (digits.length >= 4) add("u.phone LIKE ?", `%${digits}%`);
    else add("c.display_name ILIKE ?", `%${text.replace(/[%_\\]/g, "\\$&")}%`);
  }
  const sql = `FROM reports r JOIN clients c ON c.id = r.client_id LEFT JOIN users u ON u.id = c.user_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;
  const [{ total }] = await q<{ total: number }>(`SELECT count(*)::int AS total ${sql}`, params);
  const rows = await q<Row>(
    `SELECT r.id, r.status, r.parse_confidence, r.created_at, r.reviewed_at, r.metadata->>'last_error' AS last_error,
            (SELECT count(*)::int FROM test_results t WHERE t.report_id = r.id) AS results,
            u.id AS user_id, u.phone, c.display_name
       ${sql} ORDER BY ${queue ? "r.created_at ASC" : "r.created_at DESC"} LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`,
    params,
  );
  const counts = await q<{ status: string; n: number }>("SELECT status, count(*)::int AS n FROM reports GROUP BY status");
  const [{ n: queued }] = await q<{ n: number }>(`SELECT count(*)::int AS n FROM reports WHERE ${queueWhere()}`);
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
          <h1>Отчёты</h1>
          <p>Загруженные клиентами PDF FOX. В очереди то, что парсер не разобрал, пометил на проверку или разобрал с уверенностью ниже {Math.round(LOW_CONFIDENCE * 100)}%. Сначала старые.</p>
        </div>
      </div>
      <nav className="a-tabs-inline">
        <Link href="/admin/app/reports?queue=1" aria-current={queue ? "page" : undefined}>Очередь · {queued}</Link>
        <Link href="/admin/app/reports?queue=0" aria-current={!queue ? "page" : undefined}>Все · {counts.reduce((s, c) => s + c.n, 0)}</Link>
      </nav>
      {!queue && (
        <div className="a-chips">
          <Link className="a-chip" aria-current={!sp.status ? "true" : undefined} href={`/admin/app/reports${qs({ status: undefined, queue: "0" })}`}>Все</Link>
          {Object.entries(REPORT_STATUSES).map(([id, label]) => (
            <Link key={id} className="a-chip" aria-current={sp.status === id ? "true" : undefined} href={`/admin/app/reports${qs({ status: id, queue: "0" })}`}>{label} <i>{counts.find((c) => c.status === id)?.n ?? 0}</i></Link>
          ))}
        </div>
      )}
      <form className="a-filters" method="get">
        <input type="hidden" name="queue" value={queue ? "1" : "0"} />
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <label className="a-field is-search"><span className="sr">Поиск</span><input className="a-input" name="q" defaultValue={sp.q} placeholder="Телефон, имя клиента или ID отчёта" /></label>
        <button className="a-btn" type="submit">Найти</button>
      </form>

      <form id="bulk" action={reprocessMany} />
      <div className="a-table-wrap">
        {rows.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th className="a-sel"><span className="sr">Выбрать</span></th><th>Загружен</th><th>Клиент</th><th>Статус</th><th>Антигенов</th><th>Уверенность</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const conf = r.parse_confidence == null ? null : Number(r.parse_confidence);
                  return (
                    <tr key={r.id} className={!r.reviewed_at && r.status !== "ready" ? "is-new" : undefined}>
                      <td className="a-sel"><input type="checkbox" name="ids" value={r.id} form="bulk" aria-label={`Выбрать отчёт от ${dateTime(r.created_at)}`} /></td>
                      <td className="a-cell-main">
                        <Link href={`/admin/app/reports/${r.id}`}>{dateTime(r.created_at)}</Link>
                        <span className="sub">{r.last_error || (r.reviewed_at ? `проверен ${ago(r.reviewed_at)}` : ago(r.created_at))}</span>
                      </td>
                      <td data-label="Клиент">{clientTitle(r.display_name, r.phone)}<span className="sub num">{maskPhone(r.phone)}</span></td>
                      <td data-label="Статус">{isReportStatus(r.status) ? <span className={`a-badge rp-${r.status}`}>{REPORT_STATUSES[r.status]}</span> : r.status}</td>
                      <td data-label="Антигенов" className="num">{r.results}</td>
                      <td data-label="Уверенность" className="num" style={conf !== null && conf < LOW_CONFIDENCE ? { color: "var(--a-red)" } : undefined}>{conf === null ? "—" : `${Math.round(conf * 100)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="a-empty"><b>{queue ? "Очередь пуста" : "Отчётов нет"}</b>{queue ? "Все загруженные отчёты разобраны и проверены." : "Под эти фильтры ничего не подходит."}</div>}
        <div className="a-pager">
          <span>Всего {total} · страница {page} из {pages}</span>
          <nav>
            {rows.length > 0 && <button className="a-btn is-ghost is-small" type="submit" form="bulk">Обработать выбранные заново</button>}
            {page > 1 && <Link className="a-btn is-ghost is-small" href={`/admin/app/reports${qs({ page: String(page - 1) })}`}>← Назад</Link>}
            {page < pages && <Link className="a-btn is-ghost is-small" href={`/admin/app/reports${qs({ page: String(page + 1) })}`}>Дальше →</Link>}
          </nav>
        </div>
      </div>
    </>
  );
}
