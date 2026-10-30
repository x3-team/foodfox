"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/admin/support";
import { assignTicket, replyTicket, setTicketStatus } from "../actions";

type Props = { id: string; status: TicketStatus; side?: boolean; assignee?: string | null; staff?: { id: string; name: string }[]; me?: string };

/* Under the conversation: the reply form. In the side column: status and the person in charge. */
export function TicketControls({ id, status, side, assignee, staff = [], me }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [next, setNext] = useState<TicketStatus>("waiting");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => start(async () => {
    const r = await fn();
    setMsg(r.ok ? (r.message ? { text: r.message } : null) : { text: r.message ?? "Ошибка", error: true });
    if (r.ok) { after?.(); router.refresh(); }
  });

  if (side) {
    return (
      <section className="a-card a-form">
        <div className="a-card-head"><h2>Работа</h2></div>
        <label className="a-field"><span>Статус</span>
          <select className="a-input" value={status} disabled={pending} onChange={(e) => run(() => setTicketStatus(id, e.target.value))}>
            {Object.entries(TICKET_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="a-field"><span>Ответственный</span>
          <select className="a-input" value={assignee ?? ""} disabled={pending} onChange={(e) => run(() => assignTicket(id, e.target.value || null))}>
            <option value="">Не назначен</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.id === me ? " (я)" : ""}</option>)}
          </select>
        </label>
        {msg?.error && <div className="a-error" role="status">{msg.text}</div>}
      </section>
    );
  }
  return (
    <form className="a-form" style={{ marginTop: 16 }} onSubmit={(e) => { e.preventDefault(); run(() => replyTicket(id, text, next), () => setText("")); }}>
      <label className="a-field"><span>Ответ клиенту</span>
        <textarea className="a-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Клиент увидит ответ в приложении" required />
      </label>
      <div className="a-row" style={{ alignItems: "end" }}>
        <label className="a-field"><span>После ответа</span>
          <select className="a-input" value={next} onChange={(e) => setNext(e.target.value as TicketStatus)}>
            <option value="waiting">Ждём клиента</option>
            <option value="in_progress">Оставить в работе</option>
            <option value="closed">Закрыть</option>
          </select>
        </label>
        <div className="a-actions"><button className="a-btn" type="submit" disabled={pending}>{pending ? "Отправляем…" : "Ответить"}</button></div>
      </div>
      {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status">{msg.text}</div>}
    </form>
  );
}
