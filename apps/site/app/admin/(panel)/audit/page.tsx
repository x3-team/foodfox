import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { dateTime } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Журнал действий" };

const ENTITIES: Record<string, string> = {
  lead: "Заявки", session: "Входы", user: "Пользователи", content: "Страницы", media: "Медиатека", seo: "SEO",
  price: "Цены", course: "Курс", article: "Блог", author: "Авторы", review: "Отзывы", partner: "Партнёры",
};
const PER_PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("audit");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => { params.push(value); where.push(sql.replace("?", `$${params.length}`)); };
  if (staff.role !== "admin") add("actor_id = ?", staff.id);
  else if (sp.actor && /^[0-9a-f-]{36}$/i.test(sp.actor)) add("actor_id = ?::uuid", sp.actor);
  if (sp.entity) add("entity = ?", sp.entity);
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) add("(created_at AT TIME ZONE 'Europe/Moscow')::date >= ?::date", sp.from);
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) add("(created_at AT TIME ZONE 'Europe/Moscow')::date <= ?::date", sp.to);
  const text = sp.q?.trim();
  if (text) {
    params.push(`%${text.replace(/[%_\\]/g, "\\$&")}%`, text.replace(/^#/, ""));
    where.push(`(summary ILIKE $${params.length - 1} OR entity_id = $${params.length})`);
  }
  const sql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [{ total }] = await q<{ total: number }>(`SELECT count(*)::int AS total FROM audit_log ${sql}`, params);
  const rows = await q<{ id: string; created_at: Date; actor_name: string; actor_role: string | null; action: string; entity: string; entity_id: string | null; summary: string; before: unknown; after: unknown; ip: string | null }>(
    `SELECT * FROM audit_log ${sql} ORDER BY created_at DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`, params,
  );
  const actors = staff.role === "admin" ? await q<{ id: string; name: string; email: string }>("SELECT id, name, email FROM admin_users ORDER BY name") : [];
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const link = (entity: string, id: string | null) => {
    if (!id || id.includes(",")) return null;
    if (entity === "lead") return `/admin/leads/${id}`;
    return null;
  };

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Журнал действий</h1>
          <p>{staff.role === "admin" ? "Кто, что и когда менял в админке. Записи нельзя изменить или удалить." : "Ваши действия в админке"}</p>
        </div>
      </div>
      <form className="a-filters" method="get">
        <label className="a-field is-search"><span>Поиск</span><input className="a-input" name="q" defaultValue={sp.q} placeholder="Текст записи или номер объекта" /></label>
        {staff.role === "admin" && (
          <label className="a-field"><span>Кто</span>
            <select className="a-input" name="actor" defaultValue={sp.actor ?? ""}>
              <option value="">Все</option>
              {actors.map((a) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
            </select>
          </label>
        )}
        <label className="a-field"><span>Раздел</span>
          <select className="a-input" name="entity" defaultValue={sp.entity ?? ""}>
            <option value="">Все</option>
            {Object.entries(ENTITIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="a-field"><span>С</span><input className="a-input" type="date" name="from" defaultValue={sp.from} /></label>
        <label className="a-field"><span>По</span><input className="a-input" type="date" name="to" defaultValue={sp.to} /></label>
        <button className="a-btn" type="submit">Показать</button>
      </form>
      <div className="a-table-wrap">
        {rows.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Раздел</th><th>IP</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const href = link(r.entity, r.entity_id);
                  const hasDiff = r.before != null || r.after != null;
                  return (
                    <tr key={r.id}>
                      <td data-label="Когда" className="nowrap num">{dateTime(r.created_at)}</td>
                      <td data-label="Кто">{r.actor_name || "—"}{r.actor_role ? <span className="sub">{r.actor_role === "admin" ? "админ" : "менеджер"}</span> : null}</td>
                      <td className="a-cell-main" style={{ maxWidth: 520 }}>
                        {href ? <Link href={href} style={{ fontWeight: 400 }}>{r.summary}</Link> : <span>{r.summary}</span>}
                        {hasDiff && (
                          <details className="a-details" style={{ marginTop: 6, position: "relative", zIndex: 1 }}>
                            <summary>Было / стало</summary>
                            <div className="a-grid a-grid-2" style={{ gap: 8, marginTop: 8 }}>
                              <pre className="a-json">{r.before == null ? "—" : JSON.stringify(r.before, null, 2)}</pre>
                              <pre className="a-json">{r.after == null ? "—" : JSON.stringify(r.after, null, 2)}</pre>
                            </div>
                          </details>
                        )}
                      </td>
                      <td data-label="Раздел">{ENTITIES[r.entity] ?? r.entity}</td>
                      <td data-label="IP" className="faint num">{r.ip || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="a-empty"><b>Записей нет</b>Под эти фильтры ничего не подходит.</div>}
        <div className="a-pager">
          <span>Всего {total} · страница {page} из {pages}</span>
          <nav>
            {page > 1 && <Link className="a-btn is-ghost is-small" href={`/admin/audit${qs({ page: String(page - 1) })}`}>← Новее</Link>}
            {page < pages && <Link className="a-btn is-ghost is-small" href={`/admin/audit${qs({ page: String(page + 1) })}`}>Старше →</Link>}
          </nav>
        </div>
      </div>
    </>
  );
}
