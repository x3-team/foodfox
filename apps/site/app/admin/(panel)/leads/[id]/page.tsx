import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { can, requireStaff } from "@/lib/admin/auth";
import { one, q } from "@/lib/admin/db";
import { dateTime } from "@/lib/admin/format";
import { LEAD_STATUSES, kindLabel, type Lead } from "@/lib/admin/leads";
import { LeadControls } from "./LeadControls";

export const metadata: Metadata = { title: "Заявка" };

const FIELD_LABELS: Record<string, string> = {
  kind: "Форма", name: "Имя", contact: "Контакт", email: "Почта", phone: "Телефон", city: "Город", company: "Компания",
  text: "Текст", who: "Кто", specialty: "Специальность", agree: "Согласие",
};

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("leads");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const lead = await one<Lead>("SELECT l.*, u.name AS assignee_name FROM leads l LEFT JOIN admin_users u ON u.id = l.assignee_id WHERE l.id = $1", [id]);
  if (!lead) notFound();
  const notes = await q<{ id: string; author_name: string; text: string; created_at: Date }>(
    "SELECT id, author_name, text, created_at FROM lead_notes WHERE lead_id = $1", [id],
  );
  const history = await q<{ id: string; actor_name: string; summary: string; created_at: Date }>(
    "SELECT id, actor_name, summary, created_at FROM audit_log WHERE entity = 'lead' AND (entity_id = $1 OR $1 = ANY(string_to_array(entity_id, ','))) AND action <> 'note'",
    [id],
  );
  const staffList = await q<{ id: string; name: string; email: string }>("SELECT id, name, email FROM admin_users WHERE is_active ORDER BY name");
  const timeline = [
    { key: "created", at: new Date(lead.created_at), who: "сайт", text: `Заявка получена с ${lead.page || "сайта"}`, note: false },
    ...notes.map((n) => ({ key: `n${n.id}`, at: new Date(n.created_at), who: n.author_name, text: n.text, note: true })),
    ...history.map((h) => ({ key: `h${h.id}`, at: new Date(h.created_at), who: h.actor_name, text: h.summary, note: false })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const extra = Object.entries(lead.payload).filter(([key]) => !["kind", "name", "email", "phone", "city", "company", "text", "contact"].includes(key));
  const utm = Object.entries(lead.utm ?? {});

  return (
    <>
      <div className="a-crumbs"><Link href="/admin/leads">Заявки</Link><span>/</span><span>#{lead.id}</span></div>
      <div className="a-head">
        <div>
          <h1>{lead.name || lead.email || lead.phone || `Заявка #${lead.id}`}</h1>
          <p>{kindLabel(lead.kind)} · {dateTime(lead.created_at)} · <span className={`a-badge s-${lead.status}`}>{LEAD_STATUSES[lead.status]}</span></p>
        </div>
        <div className="a-head-actions">
          {lead.email && <a className="a-btn is-ghost" href={`mailto:${lead.email}`}>Написать</a>}
          {lead.phone && <a className="a-btn is-ghost" href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>Позвонить</a>}
        </div>
      </div>

      <div className="a-grid a-grid-side">
        <div className="a-stack">
          <section className="a-card">
            <div className="a-card-head"><h2>Данные</h2></div>
            <dl className="a-dl">
              {lead.name && (<><dt>Имя</dt><dd>{lead.name}</dd></>)}
              {lead.email && (<><dt>Почта</dt><dd><a className="a-link" href={`mailto:${lead.email}`}>{lead.email}</a></dd></>)}
              {lead.phone && (<><dt>Телефон</dt><dd><a className="a-link" href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>{lead.phone}</a></dd></>)}
              {lead.city && (<><dt>Город</dt><dd>{lead.city}</dd></>)}
              {lead.company && (<><dt>Компания</dt><dd>{lead.company}</dd></>)}
              {extra.map(([key, value]) => (<Fragment key={key}><dt>{FIELD_LABELS[key] ?? key}</dt><dd>{String(value)}</dd></Fragment>))}
              <dt>Страница</dt><dd>{lead.page ? <a className="a-link" href={lead.page} target="_blank" rel="noreferrer">{lead.page}</a> : "—"}</dd>
              {utm.length > 0 && (<><dt>UTM</dt><dd>{utm.map(([k, v]) => `${k}: ${v}`).join(" · ")}</dd></>)}
            </dl>
            {lead.message && (
              <>
                <hr className="a-divider" style={{ margin: "20px 0" }} />
                <div className="a-label" style={{ marginBottom: 8 }}>Сообщение</div>
                <div className="a-quote">{lead.message}</div>
              </>
            )}
          </section>
          <section className="a-card">
            <div className="a-card-head"><h2>История и заметки</h2></div>
            <ol className="a-timeline">
              {timeline.map((item) => (
                <li key={item.key} className={item.note ? "is-note" : undefined}>
                  <div>
                    <small>{dateTime(item.at)} · {item.who}{item.note ? " · заметка" : ""}</small>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <LeadControls
          id={String(lead.id)}
          status={lead.status}
          assigneeId={lead.assignee_id ?? ""}
          staff={staffList.map((s) => ({ id: s.id, name: s.name || s.email }))}
          canDelete={can(staff, "users")}
          tech={{ ip: lead.ip ?? "", ua: lead.user_agent ?? "", payload: JSON.stringify(lead.payload, null, 2) }}
        />
      </div>
    </>
  );
}
