"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { monthOf, rub, STATEMENT_STATUSES, type StatementStatus } from "@/lib/admin/partners";
import { statementStep } from "../actions";

export type StatementView = {
  id: string; period: string; reports: number; amount: number; status: StatementStatus; disputeNote: string;
  scanDocId: string | null; scanReceived: string | null; originalSent: string | null; originalTrack: string;
  originalReceived: string | null; paidAt: string | null; actReturned: string | null;
};

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ru-RU") : null);
const BADGE: Record<StatementStatus, string> = { sent: "rs-review", disputed: "rs-missing", confirmed: "p-approved", paid: "rs-credited" };

/* БПИТ10.1.1 on the staff side: monthly reports, the dispute the client service specialist settles, the act scan and
   original the accountant receives, the payment and the partner's copy of the act. */
export function PartnerStatements({ statements, canPay }: { statements: StatementView[]; canPay: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const run = (id: string, step: string) => start(async () => {
    const r = await statementStep(id, step);
    if (!r.ok) { setToast({ text: r.message ?? "Ошибка", error: true }); window.setTimeout(() => setToast(null), 3000); }
    else router.refresh();
  });

  return (
    <section className="a-card">
      <div className="a-card-head"><h2>Отчёты за месяц и акты</h2><span className="muted">формируются после конца месяца</span></div>
      {statements.length ? (
        <ul className="a-feed">
          {statements.map((s) => {
            const confirmed = s.status === "confirmed" || s.status === "paid";
            return (
              <li key={s.id} style={{ flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontWeight: 500, textTransform: "capitalize" }}>{monthOf(s.period)}</b>
                  <span className="muted">{s.reports} анализ. · {rub(s.amount)}</span>
                  <span className={`a-badge ${BADGE[s.status]}`}>{STATEMENT_STATUSES[s.status]}</span>
                </div>
                {s.status === "disputed" && (
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <small style={{ flex: 1 }}>Партнёр: «{s.disputeNote}». Поправьте статусы анализов выше и отправьте отчёт заново.</small>
                    <button className="a-btn is-small is-lime" type="button" disabled={pending} onClick={() => run(s.id, "resend")}>Сверено, отправить заново</button>
                  </div>
                )}
                {confirmed && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {s.scanDocId ? <a className="a-chip" href={`/admin/api/partner-doc/${s.scanDocId}`} target="_blank" rel="noreferrer">Скан от партнёра</a> : <span className="a-chip">Скана нет</span>}
                    {s.originalSent ? <span className="a-chip">Оригинал отправлен {day(s.originalSent)}{s.originalTrack ? ` · ${s.originalTrack}` : ""}</span> : null}
                    <Step done={s.scanReceived} label="Скан получен" onClick={() => run(s.id, "scan")} pending={pending} />
                    <Step done={s.originalReceived} label="Оригинал получен" onClick={() => run(s.id, "original")} pending={pending} />
                    {canPay ? <Step done={s.paidAt} label="Оплачено в 1С:ERP" onClick={() => window.confirm(`Отметить оплату ${rub(s.amount)}?`) && run(s.id, "pay")} pending={pending} /> : s.paidAt ? <span className="a-chip">Оплачено {day(s.paidAt)}</span> : null}
                    <Step done={s.actReturned} label="Экземпляр отправлен партнёру" onClick={() => run(s.id, "returned")} pending={pending} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className="muted">Отчётов ещё не было: первый появится после конца месяца с подтверждёнными анализами.</p>}
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </section>
  );
}

function Step({ done, label, onClick, pending }: { done: string | null; label: string; onClick: () => void; pending: boolean }) {
  if (done) return <span className="a-badge s-done">{label} {day(done)}</span>;
  return <button className="a-btn is-small" type="button" disabled={pending} onClick={onClick}>{label}</button>;
}
