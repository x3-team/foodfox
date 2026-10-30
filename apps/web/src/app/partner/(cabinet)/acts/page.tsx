"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { usePartnerData } from "@/components/partner/PartnerData";
import { STATEMENT_STATUS, type Statement } from "@/lib/partner-program/shared";

/* БПИТ10.1.1 after the month ends: the report on analyses and reward, «Подтверждаю» / «Не подтверждаю», the act to
   print and sign, its scan and the paper original by Почта России, then the payment. */

const badge: Record<Statement["status"], string> = {
  sent: "bg-[#FBF0D8] text-[#8A6416]",
  disputed: "bg-[#F8E3DE] text-[#A03A22]",
  confirmed: "bg-[#EDF3D9] text-[#4A6B1F]",
  paid: "bg-[#21251D] text-[#E7F551]",
};
const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;

export default function PartnerActsPage() {
  const { statements } = usePartnerData();
  return (
    <PartnerShell>
      <h1 className="text-[28px] font-light leading-8 tracking-[-0.5px] sm:text-[34px] sm:leading-[38px]">Отчёты и акты</h1>
      <p className="mt-1 text-[14px] text-[#5C5E57]">
        После конца месяца здесь появляется отчёт по подтверждённым анализам. Подтвердите его, подпишите акт и отправьте скан и оригинал.
      </p>
      <div className="mt-6 space-y-4">
        {statements.length ? statements.map((s) => <StatementCard key={s.id} s={s} />) : (
          <div className="rounded-[22px] border border-[#E3E4DF] bg-white px-6 py-8 text-[14px] text-[#5C5E57]">
            Отчётов пока нет. Первый придёт после окончания месяца, в котором подтвердят ваш первый анализ.
          </div>
        )}
      </div>
    </PartnerShell>
  );
}

function StatementCard({ s }: { s: Statement }) {
  const router = useRouter();
  const { source } = usePartnerData();
  const [busy, setBusy] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState("");
  const [track, setTrack] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function call(url: string, init: RequestInit, done: string) {
    if (source === "demo") return setMessage({ text: "В демо-кабинете действия не сохраняются" });
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, init);
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) return setMessage({ text: body.error ?? "Не получилось", error: true });
      setMessage({ text: done });
      setDisputing(false);
      router.refresh();
    } catch {
      setMessage({ text: "Нет соединения. Попробуйте ещё раз", error: true });
    } finally {
      setBusy(false);
    }
  }
  const action = (body: Record<string, string>, done: string) =>
    call(`/api/partner/statements/${s.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, done);

  const done = s.status === "confirmed" || s.status === "paid";
  const steps: [string, boolean, string?][] = [
    ["Отчёт подтверждён", done],
    ["Скан акта отправлен", s.scanSent],
    ["Оригинал отправлен Почтой России", Boolean(s.originalSentAt), s.originalSentAt ? `${s.originalSentAt}${s.originalTrack ? ` · трек ${s.originalTrack}` : ""}` : undefined],
    ["Бухгалтерия получила акт", s.scanReceived || s.originalReceived],
    ["Вознаграждение выплачено", Boolean(s.paidAt), s.paidAt ?? undefined],
    ["Ваш экземпляр акта отправлен", s.actReturned],
  ];

  return (
    <article className="rounded-[22px] border border-[#E3E4DF] bg-white px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-medium first-letter:uppercase">{s.periodLabel}</h2>
          <p className="mt-1 text-[14px] text-[#5C5E57]">
            Анализов: {s.reports} · вознаграждение <span className="font-medium text-[#0B0C08]">{rub(s.amount)}</span>
            {done ? ` · акт № ${s.actNo}` : ""}
          </p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-medium ${badge[s.status]}`}>{STATEMENT_STATUS[s.status]}</span>
      </div>

      {s.status === "sent" ? (
        <div className="mt-4 space-y-3">
          <p className="text-[14px]">Проверьте количество анализов и сумму за месяц.</p>
          {disputing ? (
            <>
              <textarea
                className="w-full rounded-[14px] border border-[#E3E4DF] px-4 py-3 text-[14px] outline-none focus:border-[#0B0C08]"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Что не сходится: какие анализы не учтены или учтены лишние"
              />
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={busy} onClick={() => action({ action: "dispute", note }, "Отправили специалисту, он свяжется с вами")} className="rounded-full bg-[#21251D] px-5 py-3 text-[14px] font-medium text-[#F8F9F6] disabled:opacity-40">Отправить на сверку</button>
                <button type="button" disabled={busy} onClick={() => setDisputing(false)} className="rounded-full border border-[#E3E4DF] px-5 py-3 text-[14px] font-medium">Отмена</button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={busy} onClick={() => action({ action: "confirm" }, "Готово: акт сформирован")} className="rounded-full bg-[#21251D] px-5 py-3 text-[14px] font-medium text-[#F8F9F6] disabled:opacity-40">Подтверждаю</button>
              <button type="button" disabled={busy} onClick={() => setDisputing(true)} className="rounded-full border border-[#E3E4DF] px-5 py-3 text-[14px] font-medium">Не подтверждаю</button>
            </div>
          )}
        </div>
      ) : null}

      {s.status === "disputed" ? (
        <p className="mt-4 rounded-2xl bg-[#F8F9F6] px-4 py-3 text-[14px] leading-5">
          Вы сообщили: «{s.disputeNote}». Специалист службы работы с клиентами сверит отчёт и свяжется с вами, после этого отчёт придёт снова.
        </p>
      ) : null}

      {done ? (
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <ol className="space-y-2 text-[14px]">
            {steps.map(([label, ok, hint]) => (
              <li key={label} className="flex items-start gap-2.5">
                <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${ok ? "bg-[#4A6B1F] text-white" : "border border-[#E3E4DF]"}`}>{ok ? "✓" : ""}</span>
                <span className={ok ? "" : "text-[#5C5E57]"}>
                  {label}
                  {hint ? <span className="block text-[12px] text-[#5C5E57]">{hint}</span> : null}
                </span>
              </li>
            ))}
          </ol>
          <div className="space-y-3">
            <Link href={`/partner/acts/${s.id}`} target="_blank" className="block rounded-full bg-[#21251D] px-5 py-3 text-center text-[14px] font-medium text-[#F8F9F6]">
              Открыть акт для печати
            </Link>
            {!s.scanSent ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void call(`/api/partner/statements/${s.id}/scan`, { method: "POST", body: new FormData(e.currentTarget) }, "Скан отправлен бухгалтеру");
                }}
              >
                <label className="text-[13px] font-medium text-[#5C5E57]" htmlFor={`scan-${s.id}`}>Скан подписанного акта</label>
                <input id={`scan-${s.id}`} name="scan" type="file" accept="image/*,application/pdf" required className="w-full rounded-[14px] border border-[#E3E4DF] px-4 py-2.5 text-[14px]" />
                <button type="submit" disabled={busy} className="rounded-full border border-[#E3E4DF] px-5 py-3 text-[14px] font-medium disabled:opacity-40">Отправить скан</button>
              </form>
            ) : null}
            {!s.originalSentAt ? (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-[#5C5E57]" htmlFor={`track-${s.id}`}>Трек-номер письма с оригиналом (если есть)</label>
                <input id={`track-${s.id}`} value={track} onChange={(e) => setTrack(e.target.value)} placeholder="14 цифр" className="w-full rounded-[14px] border border-[#E3E4DF] px-4 py-2.5 text-[14px]" />
                <button type="button" disabled={busy} onClick={() => action({ action: "original", track }, "Отметили отправку оригинала")} className="rounded-full border border-[#E3E4DF] px-5 py-3 text-[14px] font-medium disabled:opacity-40">Оригинал отправлен</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {message ? <p role="status" className={`mt-3 text-[13px] ${message.error ? "text-[#A03A22]" : "text-[#4A6B1F]"}`}>{message.text}</p> : null}
    </article>
  );
}
