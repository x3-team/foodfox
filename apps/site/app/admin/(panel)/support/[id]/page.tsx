import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { can, requireStaff } from "@/lib/admin/auth";
import { clientTitle, fullPhone } from "@/lib/admin/app";
import { one, q } from "@/lib/admin/db";
import { dateTime } from "@/lib/admin/format";
import { TICKET_STATUSES, TICKET_TOPICS, type TicketRow } from "@/lib/admin/support";
import { TicketControls } from "./TicketControls";

export const metadata: Metadata = { title: "Обращение" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("tickets");
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();
  const t = await one<TicketRow & { display_name: string | null }>(
    `SELECT t.*, u.phone, c.display_name, coalesce(nullif(a.name, ''), a.email) AS assignee_name, 0 AS unread, 0 AS messages
       FROM support_tickets t JOIN users u ON u.id = t.user_id LEFT JOIN clients c ON c.user_id = u.id
       LEFT JOIN admin_users a ON a.id = t.assignee_id WHERE t.id = $1`,
    [id],
  );
  if (!t) notFound();
  // Opening the ticket is reading the client's messages.
  await q("UPDATE support_messages SET read_at = now() WHERE ticket_id = $1 AND author = 'client' AND read_at IS NULL", [id]);
  const messages = await q<{ id: string; author: "client" | "staff"; staff_name: string | null; body: string; created_at: Date; read_at: Date | null }>(
    "SELECT id, author, staff_name, body, created_at, read_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at",
    [id],
  );
  const staffList = await q<{ id: string; name: string }>(
    "SELECT id, coalesce(nullif(name, ''), email) AS name FROM admin_users WHERE is_active AND role IN ('admin', 'support') ORDER BY name",
  );

  return (
    <>
      <nav className="a-crumbs"><Link href="/admin/support"><Icon name="back" size={16} /> Обращения</Link></nav>
      <div className="a-head">
        <div>
          <h1>#{t.id} · {TICKET_TOPICS[t.topic]}</h1>
          <p>
            <span className={`a-badge ${t.status === "new" ? "s-new" : t.status === "closed" ? "is-plain" : "s-in_progress"}`}>{TICKET_STATUSES[t.status]}</span>
            {" "}открыто {dateTime(t.created_at)}{t.first_reply_at ? `, первый ответ ${dateTime(t.first_reply_at)}` : ""}
          </p>
        </div>
      </div>
      <div className="a-grid a-grid-side">
        <section className="a-card">
          <div className="a-card-head"><h2>Переписка</h2></div>
          <ol className="a-thread">
            {messages.map((m) => (
              <li key={m.id} className={m.author === "staff" ? "is-staff" : undefined}>
                <div className="a-thread-meta">
                  {m.author === "staff" ? m.staff_name || "Специалист" : clientTitle(t.display_name, t.phone)} · {dateTime(m.created_at)}
                  {m.author === "staff" && <span>{m.read_at ? " · прочитано" : " · не прочитано"}</span>}
                </div>
                <p>{m.body}</p>
              </li>
            ))}
          </ol>
          <TicketControls id={t.id} status={t.status} />
        </section>
        <div className="a-stack">
          <section className="a-card">
            <div className="a-card-head"><h2>Клиент</h2></div>
            <dl className="a-dl">
              <dt>Телефон</dt><dd className="num">{fullPhone(t.phone)}</dd>
              <dt>Карточка</dt><dd>{can(staff, "app_users") ? <Link className="a-link" href={`/admin/app/users/${t.user_id}`}>Открыть</Link> : "—"}</dd>
            </dl>
          </section>
          <TicketControls id={t.id} status={t.status} assignee={t.assignee_id} staff={staffList} me={staff.id} side />
        </div>
      </div>
    </>
  );
}
