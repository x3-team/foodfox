import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/admin/Icon";
import { requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { filterQuery, filtersFrom, leadWhere } from "@/lib/admin/lead-query";
import { LEAD_KINDS, LEAD_STATUSES, type Lead } from "@/lib/admin/leads";
import { LeadsTable } from "./LeadsTable";

export const metadata: Metadata = { title: "Заявки" };

const PER_PAGE = 30;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requireStaff("leads");
  const f = filtersFrom(await searchParams);
  const page = Math.max(1, Number(f.page) || 1);

  const where = leadWhere(f, staff.id);
  const [{ total }] = await q<{ total: number }>(`SELECT count(*)::int AS total FROM leads l ${where.sql}`, where.params);
  const rows = await q<Lead & { notes: number }>(
    `SELECT l.*, u.name AS assignee_name, (SELECT count(*)::int FROM lead_notes n WHERE n.lead_id = l.id) AS notes
       FROM leads l LEFT JOIN admin_users u ON u.id = l.assignee_id
       ${where.sql} ORDER BY l.created_at DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`,
    where.params,
  );
  const byStatus = leadWhere(f, staff.id, ["status"]);
  const statusCounts = await q<{ status: string; n: number }>(`SELECT l.status, count(*)::int AS n FROM leads l ${byStatus.sql} GROUP BY l.status`, byStatus.params);
  const counts: Record<string, number> = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));
  const kinds = await q<{ kind: string }>("SELECT DISTINCT kind FROM leads ORDER BY kind");
  const kindOptions = Array.from(new Set([...Object.keys(LEAD_KINDS), ...kinds.map((k) => k.kind)]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const activeStatus = f.status ?? "";
  const allNotSpam = Object.entries(counts).filter(([s]) => s !== "spam").reduce((sum, [, n]) => sum + n, 0);

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Заявки</h1>
          <p>Все формы сайта: обратная связь, курс, отзывы, запись на тест, ожидание города</p>
        </div>
        <div className="a-head-actions">
          <a className="a-btn is-ghost" href={`/admin/leads/export${filterQuery({ ...f, page: undefined })}`}>
            <Icon name="download" /> Экспорт CSV
          </a>
        </div>
      </div>

      <div className="a-chips" role="list">
        {[["", "Все, кроме спама", allNotSpam], ...Object.entries(LEAD_STATUSES).map(([id, label]) => [id, label, counts[id] ?? 0])].map(([id, label, n]) => (
          <Link key={String(id)} role="listitem" className="a-chip" aria-current={activeStatus === id ? "true" : undefined} href={`/admin/leads${filterQuery(f, { status: String(id) || undefined, page: undefined })}`}>
            {label} <i className="num">{n}</i>
          </Link>
        ))}
      </div>

      <form className="a-filters" method="get">
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <label className="a-field is-search">
          <span>Поиск</span>
          <input className="a-input" name="q" defaultValue={f.q} placeholder="Имя, почта, телефон, город, текст или #номер" />
        </label>
        <label className="a-field">
          <span>Форма</span>
          <select className="a-input" name="kind" defaultValue={f.kind ?? ""}>
            <option value="">Все формы</option>
            {kindOptions.map((kind) => <option key={kind} value={kind}>{LEAD_KINDS[kind] ?? kind}</option>)}
          </select>
        </label>
        <label className="a-field">
          <span>С</span>
          <input className="a-input" type="date" name="from" defaultValue={f.from} />
        </label>
        <label className="a-field">
          <span>По</span>
          <input className="a-input" type="date" name="to" defaultValue={f.to} />
        </label>
        <label className="a-check" style={{ minHeight: 48 }}>
          <input type="checkbox" name="mine" value="1" defaultChecked={f.mine === "1"} /> Мои
        </label>
        <button className="a-btn" type="submit">Показать</button>
        {(f.q || f.kind || f.from || f.to || f.mine) && (
          <Link className="a-btn is-ghost" href={`/admin/leads${filterQuery({ status: f.status })}`}>Сбросить</Link>
        )}
      </form>

      <LeadsTable
        rows={rows.map((r) => ({
          id: String(r.id), created_at: new Date(r.created_at).toISOString(), kind: r.kind, status: r.status, name: r.name,
          email: r.email, phone: r.phone, city: r.city, message: r.message, assignee: r.assignee_name ?? "", notes: r.notes,
        }))}
        total={total}
        page={page}
        pages={pages}
        prevHref={page > 1 ? `/admin/leads${filterQuery(f, { page: String(page - 1) })}` : null}
        nextHref={page < pages ? `/admin/leads${filterQuery(f, { page: String(page + 1) })}` : null}
      />
    </>
  );
}
