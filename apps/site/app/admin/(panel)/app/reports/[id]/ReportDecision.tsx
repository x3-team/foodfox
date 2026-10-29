"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/admin/Icon";
import { addReportNote, decideReport, reprocessReport, type ReportResult } from "../actions";

export function ReportDecision({ id, status, hasPdf }: { id: string; status: string; hasPdf: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const run = (fn: () => Promise<ReportResult>, clear = false) => start(async () => {
    const r = await fn();
    setMsg({ text: r.message ?? (r.ok ? "Готово" : "Ошибка"), error: !r.ok });
    if (r.ok) { if (clear) setNote(""); router.refresh(); }
  });

  return (
    <section className="a-card">
      <div className="a-card-head"><h2>Решение</h2></div>
      {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>{msg.text}</div>}
      <div className="a-form">
        <label className="a-field"><span>Комментарий</span>
          <textarea className="a-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Что проверили или что не так" />
        </label>
        <div className="a-actions">
          <button className="a-btn is-lime" type="button" disabled={pending} onClick={() => run(() => decideReport(id, "approve", note), true)}><Icon name="check" /> {status === "ready" ? "Проверен" : "Одобрить"}</button>
          <button className="a-btn is-danger" type="button" disabled={pending || note.trim().length < 3} title={note.trim().length < 3 ? "Напишите причину в комментарии" : undefined}
            onClick={() => window.confirm("Отклонить отчёт? Клиент увидит, что отчёт не обработан.") && run(() => decideReport(id, "reject", note), true)}>Отклонить</button>
        </div>
        <div className="a-actions">
          {hasPdf && <button className="a-btn is-ghost" type="button" disabled={pending}
            onClick={() => window.confirm("Распознать PDF заново текущим парсером? Ручные правки значений будут заменены.") && run(() => reprocessReport(id))}><Icon name="refresh" /> {pending ? "Обрабатываем…" : "Обработать заново"}</button>}
          <button className="a-btn is-ghost" type="button" disabled={pending || !note.trim()} onClick={() => run(() => addReportNote(id, note), true)}>Сохранить заметку</button>
        </div>
      </div>
    </section>
  );
}
