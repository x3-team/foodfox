"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DOC_KINDS, EVENT_KINDS, LEGAL_FORMS, type LegalForm } from "@/lib/admin/partners";
import type { PartnerPd } from "@/lib/admin/pd-seal";
import { eventDone, revealPd, setLegalStep } from "../actions";

type Props = {
  partnerId: string;
  legalForm: LegalForm | null;
  contractVersion: string;
  contractAcceptedAt: string | null;
  steps: { contract: string | null; fns: string | null; erp: string | null };
  hints: Record<string, string> | null;
  canPd: boolean;
  docs: { id: string; kind: string; createdAt: string }[];
  events: { id: string; kind: string; createdAt: string; status: string }[];
};

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ru-RU") : null);

/* БПИТ12.8 on the staff side: the form and contract the partner chose, the steps after the application, personal
   data (masked until the accountant opens it) and the queue of outside steps. */
export function PartnerLegal({ partnerId, legalForm, contractVersion, contractAcceptedAt, steps, hints, canPd, docs, events }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pd, setPd] = useState<PartnerPd | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => {
    const r = await fn();
    if (!r.ok || r.message) { setToast({ text: r.message ?? "Ошибка", error: !r.ok }); window.setTimeout(() => setToast(null), 3000); }
    if (r.ok) router.refresh();
  });
  const checklist: [keyof Props["steps"], string][] = [
    ["contract", "Договор согласован в 1С:ДО (специалист службы)"],
    ...(legalForm === "fl" ? ([["fns", "Физлицо зарегистрировано в ФНС (бухгалтер, не позднее следующего дня)"]] as [keyof Props["steps"], string][]) : []),
    ["erp", "Договор заведён в 1С:ERP (бухгалтер)"],
  ];
  const personal = docs.filter((d) => d.kind in DOC_KINDS && d.kind !== "analysis" && d.kind !== "act_scan");
  const open = events.filter((e) => e.status !== "done");

  return (
    <>
      <section className="a-card">
        <div className="a-card-head"><h2>Договор и документы</h2><span className="muted">{legalForm ? LEGAL_FORMS[legalForm] : "форма не указана"}</span></div>
        {contractAcceptedAt ? (
          <p className="muted" style={{ marginTop: 0 }}>Договор ({contractVersion || "версия не указана"}) принят партнёром {day(contractAcceptedAt)}.</p>
        ) : <p className="muted" style={{ marginTop: 0 }}>Партнёр заведён вручную или до анкеты по БП: договор в кабинете не принимал.</p>}
        <ul className="a-feed">
          {checklist.map(([key, label]) => (
            <li key={key} style={{ alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>{label}{steps[key] ? <small>отмечено {day(steps[key])}</small> : null}</div>
              <button className={`a-btn is-small${steps[key] ? "" : " is-lime"}`} type="button" disabled={pending} onClick={() => run(() => setLegalStep(partnerId, key, !steps[key]))}>
                {steps[key] ? "Снять отметку" : "Отметить"}
              </button>
            </li>
          ))}
        </ul>
        <p className="muted">Когда договор согласован и заведён, переведите партнёра в статус «Одобрен» — он сможет войти в кабинет.</p>

        <div className="a-card-head" style={{ marginTop: 16 }}><h2>Персональные данные</h2></div>
        {hints ? (
          pd ? (
            <dl className="a-dl">
              <dt>Паспорт</dt><dd>{pd.passport}</dd>
              <dt>ИНН</dt><dd>{pd.inn}</dd>
              <dt>Почтовый адрес</dt><dd>{pd.postal}</dd>
              <dt>Получатель</dt><dd>{pd.bank.recipient}</dd>
              <dt>Счёт</dt><dd>{pd.bank.account}</dd>
              <dt>БИК / банк</dt><dd>{pd.bank.bik}{pd.bank.name ? ` · ${pd.bank.name}` : ""}</dd>
            </dl>
          ) : (
            <>
              <dl className="a-dl">
                <dt>Паспорт</dt><dd>{hints.passport}</dd>
                <dt>ИНН</dt><dd>{hints.inn}</dd>
                <dt>Счёт</dt><dd>{hints.account} · БИК {hints.bik}</dd>
              </dl>
              {canPd ? (
                <button className="a-btn is-small" type="button" disabled={pending} onClick={() => start(async () => {
                  const r = await revealPd(partnerId);
                  if (r.ok && r.pd) setPd(r.pd); else setToast({ text: r.message ?? "Ошибка", error: true });
                })}>Показать полностью (запишется в журнал)</button>
              ) : <p className="muted">Полностью данные видит бухгалтер или администратор.</p>}
            </>
          )
        ) : <p className="muted">Партнёр ещё не передавал паспортные данные и реквизиты.</p>}
        {personal.length ? (
          <div className="a-chips" style={{ marginTop: 12 }}>
            {personal.map((d) => canPd ? (
              <a key={d.id} className="a-chip" href={`/admin/api/partner-doc/${d.id}`} target="_blank" rel="noreferrer">{DOC_KINDS[d.kind]}</a>
            ) : <span key={d.id} className="a-chip">{DOC_KINDS[d.kind]} · закрыто</span>)}
          </div>
        ) : null}
      </section>

      {open.length ? (
        <section className="a-card">
          <div className="a-card-head"><h2>Шаги во внешних системах</h2><span className="muted">пока без интеграций — вручную</span></div>
          <ul className="a-feed">
            {open.map((e) => (
              <li key={e.id} style={{ alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>{EVENT_KINDS[e.kind] ?? e.kind}<small>{new Date(e.createdAt).toLocaleString("ru-RU")}</small></div>
                <button className="a-btn is-small" type="button" disabled={pending} onClick={() => run(() => eventDone(e.id))}>Сделано</button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </>
  );
}
