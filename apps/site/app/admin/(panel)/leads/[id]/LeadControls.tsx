"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LEAD_STATUSES } from "@/lib/admin/leads";
import { addNote, deleteLead, updateLead } from "../actions";

type Props = {
  id: string;
  status: string;
  assigneeId: string;
  staff: Array<{ id: string; name: string }>;
  canDelete: boolean;
  tech: { ip: string; ua: string; payload: string };
};

export function LeadControls({ id, status, assigneeId, staff, canDelete, tech }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, done = "Сохранено") => start(async () => {
    const result = await fn();
    setToast({ text: result.ok ? result.message ?? done : result.message ?? "Ошибка", error: !result.ok });
    window.setTimeout(() => setToast(null), 2600);
    if (result.ok) router.refresh();
  });

  return (
    <aside className="a-stack a-sticky">
      <section className="a-card">
        <div className="a-card-head"><h2>Обработка</h2></div>
        <div className="a-form">
          <div className="a-field">
            <span>Статус</span>
            <div className="a-chips" style={{ margin: 0, flexWrap: "wrap", padding: 0 }}>
              {Object.entries(LEAD_STATUSES).map(([value, label]) => (
                <button key={value} type="button" className="a-chip" aria-current={status === value ? "true" : undefined} disabled={pending}
                  onClick={() => status !== value && run(() => updateLead(id, { status: value }))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="a-field">
            <span>Ответственный</span>
            <select className="a-input" value={assigneeId} disabled={pending} onChange={(e) => run(() => updateLead(id, { assignee_id: e.target.value || null }))}>
              <option value="">Не назначен</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
      </section>
      <section className="a-card">
        <div className="a-card-head"><h2>Заметка</h2></div>
        <form className="a-form" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await addNote(id, note); if (r.ok) setNote(""); return r; }, "Заметка добавлена"); }}>
          <textarea className="a-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Что сделали, о чём договорились" aria-label="Текст заметки" />
          <button className="a-btn" type="submit" disabled={pending || !note.trim()}>Добавить заметку</button>
        </form>
      </section>
      <details className="a-card a-details">
        <summary>Технические данные</summary>
        <dl className="a-dl" style={{ marginTop: 16, gridTemplateColumns: "80px minmax(0,1fr)" }}>
          <dt>IP</dt><dd>{tech.ip || "—"}</dd>
          <dt>Браузер</dt><dd style={{ fontSize: 13 }}>{tech.ua || "—"}</dd>
        </dl>
        <pre className="a-json" style={{ marginTop: 12 }}>{tech.payload}</pre>
        {canDelete && (
          <button className="a-btn is-danger is-small" style={{ marginTop: 16 }} type="button" disabled={pending}
            onClick={() => { if (window.confirm("Удалить заявку насовсем? Это попадёт в журнал.")) start(async () => { const r = await deleteLead(id); if (r.ok) router.push("/admin/leads"); else setToast({ text: r.message ?? "Ошибка", error: true }); }); }}>
            Удалить заявку
          </button>
        )}
      </details>
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </aside>
  );
}
