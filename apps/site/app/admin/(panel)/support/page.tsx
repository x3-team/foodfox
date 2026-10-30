import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { maskPhone } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";
import { ago } from "@/lib/admin/format";
import { FIRST_REPLY_HOURS, TICKET_STATUSES, TICKET_TOPICS, type TicketRow } from "@/lib/admin/support";

export const metadata: Metadata = { title: "Обращения" };

/* The queue of client requests to a live specialist. Open ones first, the longest-waiting client on top. */
export default async function SupportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("tickets");
  const sp = await searchParams;
  const status = sp.status && (sp.status in TICKET_STATUSES || sp.status === "all") ? sp.status : "open";
  const where: string[] = [];
  const params: unknown[] = [];
  if (status === "open") where.push("t.status <> 'closed'");
  else if (status !== "all") { params.push(status); where.push(`t.status = $${params.length}`); }
  if (sp.topic && sp.topic in TICKET_TOPICS) { params.push(sp.topic); where.push(`t.topic = $${params.length}`); }
  if (sp.mine === "1") { params.push(staff.id); where.push(`t.assignee_id = $${params.length}`); }
  const sql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows, counts] = await Promise.all([
    q<TicketRow>(
      `SELECT t.*, u.phone, coalesce(nullif(a.name, ''), a.email) AS assignee_name,
              (SELECT count(*)::int FROM support_messages m WHERE m.ticket_id = t.id AND m.author = 'client' AND m.read_at IS NULL) AS unread,
              (SELECT count(*)::int FROM support_messages m WHERE m.ticket_id = t.id) AS messages
         FROM support_tickets t JOIN users u ON u.id = t.user_id LEFT JOIN admin_users a ON a.id = t.assignee_id
         ${sql} ORDER BY (t.status = 'closed'), t.client_at LIMIT 200`,
      params,
    ),
    q<{ status: string; n: number }>("SELECT status, count(*)::int AS n FROM support_tickets GROUP BY status"),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.status, c.n]));
  const open = (count.new ?? 0) + (count.in_progress ?? 0) + (count.waiting ?? 0);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const late = (t: TicketRow) => !t.first_reply_at && t.status !== "closed" && Date.now() - new Date(t.created_at).getTime() > FIRST_REPLY_HOURS * 3600_000;

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Обращения</h1>
          <p>Клиенты пишут живому специалисту из приложения («Подключить специалиста»). Ответ приходит им туда же. Первый ответ — в течение {FIRST_REPLY_HOURS} часов, просроченные отмечены красным.</p>
        </div>
      </div>
      <div className="a-chips">
        <Link className="a-chip" aria-current={status === "open" ? "true" : undefined} href={`/admin/support${qs({ status: undefined })}`}>Открытые · {open}</Link>
        {Object.entries(TICKET_STATUSES).map(([id, label]) => (
          <Link key={id} className="a-chip" aria-current={status === id ? "true" : undefined} href={`/admin/support${qs({ status: id })}`}>{label} · {count[id] ?? 0}</Link>
        ))}
        <Link className="a-chip" aria-current={sp.mine === "1" ? "true" : undefined} href={`/admin/support${qs({ mine: sp.mine === "1" ? undefined : "1" })}`}>Мои</Link>
      </div>
      <form className="a-filters" method="get">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        {sp.mine && <input type="hidden" name="mine" value={sp.mine} />}
        <label className="a-field"><span>Тема</span>
          <select className="a-input" name="topic" defaultValue={sp.topic ?? ""}>
            <option value="">Все</option>
            {Object.entries(TICKET_TOPICS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <button className="a-btn" type="submit">Показать</button>
      </form>
      <div className="a-table-wrap">
        {rows.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Обращение</th><th>Клиент</th><th>Статус</th><th>Ответственный</th><th>Клиент ждёт</th></tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className={t.status === "new" ? "is-new" : undefined}>
                    <td className="a-cell-main a-clip">
                      <Link href={`/admin/support/${t.id}`}>#{t.id} · {TICKET_TOPICS[t.topic]}</Link>
                      <span className="sub">{t.subject}</span>
                    </td>
                    <td data-label="Клиент" className="num nowrap">{maskPhone(t.phone)}</td>
                    <td data-label="Статус">
                      <span className={`a-badge ${t.status === "new" ? "s-new" : t.status === "closed" ? "is-plain" : "s-in_progress"}`}>{TICKET_STATUSES[t.status]}</span>
                      {t.unread > 0 && t.status !== "new" && <span className="sub">новых сообщений: {t.unread}</span>}
                    </td>
                    <td data-label="Ответственный">{t.assignee_name ?? "—"}</td>
                    <td data-label="Клиент ждёт" style={late(t) ? { color: "var(--a-red)" } : undefined}>
                      {t.status === "closed" || t.status === "waiting" ? "—" : ago(t.client_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="a-empty"><b>Обращений нет</b>Новые появятся, когда клиент нажмёт «Подключить специалиста» в приложении.</div>
        )}
      </div>
    </>
  );
}
