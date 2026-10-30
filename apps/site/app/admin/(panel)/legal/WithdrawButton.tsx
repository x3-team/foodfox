"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { withdrawConsents } from "./actions";

/* A withdrawal received outside the app (letter, call): the reason is the document it came with. */
export function WithdrawButton({ subject, subjectId, label = "Отозвать" }: { subject: string; subjectId: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <>
        <button className="a-btn is-ghost is-small" type="button" onClick={() => { setMsg(null); setOpen(true); }}>{label}</button>
        {msg && <span className={msg.error ? "a-error" : "a-ok"} role="status" style={{ display: "block", marginTop: 6 }}>{msg.text}</span>}
      </>
    );
  }
  return (
    <form
      className="a-stack"
      style={{ gap: 8, textAlign: "left" }}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await withdrawConsents(subject, subjectId, reason);
          setMsg({ text: r.message ?? (r.ok ? "Готово" : "Ошибка"), error: !r.ok });
          if (r.ok) { setOpen(false); setReason(""); router.refresh(); }
        });
      }}
    >
      <label className="a-field">
        <span>Основание</span>
        <input className="a-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Письмо на privacy@ от 30.10" required autoFocus />
      </label>
      <div className="a-actions" style={{ gap: 8 }}>
        <button className="a-btn is-small" type="submit" disabled={pending}>{pending ? "Отзываем…" : "Отозвать все согласия"}</button>
        <button className="a-btn is-ghost is-small" type="button" onClick={() => setOpen(false)}>Отмена</button>
      </div>
      {msg?.error && <span className="a-error" role="status">{msg.text}</span>}
    </form>
  );
}
