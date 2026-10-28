"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { REPORT_STATUSES, rub } from "@/lib/admin/partners";
import { addPayout, addReport, deleteReport, markPaid, setReportStatus } from "../actions";

type Report = { id: string; number: string; client: string; lab: string; date: string; status: keyof typeof REPORT_STATUSES; fee: number; fromPartner: boolean; photo: string | null };
type Payout = { id: string; period: string; amount: number; reports: number; status: "pending" | "paid"; paidAt: string | null };

const MONTH = () => new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date()).replace(" г.", "");

export function PartnerMoney({ partnerId, reports, payouts, available, unpaidReports }: { partnerId: string; reports: Report[]; payouts: Payout[]; available: number; unpaidReports: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [report, setReport] = useState({ number: "", client: "", lab: "", date: "", status: "credited" });
  const [payout, setPayout] = useState({ period: MONTH(), amount: String(available || ""), reports: String(unpaidReports || "") });
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => start(async () => {
    const r = await fn();
    if (r.message || !r.ok) { setToast({ text: r.message ?? "Ошибка", error: !r.ok }); window.setTimeout(() => setToast(null), 3000); }
    if (r.ok) { after?.(); router.refresh(); }
  });

  return (
    <>
      <section className="a-card">
        <div className="a-card-head"><h2>Отчёты клиентов</h2></div>
        <form className="a-filters" onSubmit={(e) => { e.preventDefault(); run(() => addReport(partnerId, report), () => setReport({ ...report, number: "", client: "" })); }}>
          <label className="a-field is-search"><span>Номер отчёта</span><input className="a-input" value={report.number} onChange={(e) => setReport({ ...report, number: e.target.value })} placeholder="FOX-2026-004182" required /></label>
          <label className="a-field"><span>Клиент</span><input className="a-input" value={report.client} onChange={(e) => setReport({ ...report, client: e.target.value })} placeholder="А. Соколова" /></label>
          <label className="a-field"><span>Лаборатория</span><input className="a-input" value={report.lab} onChange={(e) => setReport({ ...report, lab: e.target.value })} /></label>
          <label className="a-field"><span>Дата теста</span><input className="a-input" type="date" value={report.date} onChange={(e) => setReport({ ...report, date: e.target.value })} /></label>
          <label className="a-field"><span>Статус</span>
            <select className="a-input" value={report.status} onChange={(e) => setReport({ ...report, status: e.target.value })}>
              {Object.entries(REPORT_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <button className="a-btn" type="submit" disabled={pending}>Привязать</button>
        </form>
        {reports.length ? (
          <div className="a-table-wrap"><div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Отчёт</th><th>Дата теста</th><th>Статус</th><th>Вознаграждение</th><th></th></tr></thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="a-cell-main"><b style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{r.number}</b><span className="sub">{[r.client, r.lab, r.fromPartner ? "прислал партнёр" : ""].filter(Boolean).join(" · ")}</span>
                      {r.photo ? <a className="a-link" href={`/admin/api/partner-doc/${r.photo}`} target="_blank" rel="noreferrer">фото анализа</a> : null}</td>
                    <td data-label="Дата теста" className="nowrap">{r.date ? new Date(r.date).toLocaleDateString("ru-RU") : "—"}</td>
                    <td data-label="Статус">
                      <select className="a-input" style={{ minHeight: 36, padding: "6px 36px 6px 12px", width: "auto" }} value={r.status} disabled={pending} aria-label={`Статус ${r.number}`} onChange={(e) => run(() => setReportStatus(r.id, e.target.value))}>
                        {Object.entries(REPORT_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td data-label="Вознаграждение" className="num">{r.status === "credited" ? rub(r.fee) : "—"}</td>
                    <td data-label=""><button className="a-mini is-danger" type="button" onClick={() => window.confirm(`Отвязать отчёт ${r.number}?`) && run(() => deleteReport(r.id))}>Отвязать</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        ) : <p className="muted">Отчётов пока нет.</p>}
      </section>

      <section className="a-card">
        <div className="a-card-head"><h2>Выплаты</h2><span className="muted">к выплате {rub(available)}</span></div>
        <form className="a-filters" onSubmit={(e) => { e.preventDefault(); run(() => addPayout(partnerId, { period: payout.period, amount: Number(payout.amount), reports: Number(payout.reports) || 0 })); }}>
          <label className="a-field"><span>Период</span><input className="a-input" value={payout.period} onChange={(e) => setPayout({ ...payout, period: e.target.value })} /></label>
          <label className="a-field"><span>Сумма, ₽</span><input className="a-input" inputMode="numeric" value={payout.amount} onChange={(e) => setPayout({ ...payout, amount: e.target.value })} /></label>
          <label className="a-field"><span>Отчётов</span><input className="a-input" inputMode="numeric" value={payout.reports} onChange={(e) => setPayout({ ...payout, reports: e.target.value })} /></label>
          <button className="a-btn" type="submit" disabled={pending}>Создать выплату</button>
        </form>
        {payouts.length ? (
          <ul className="a-feed">
            {payouts.map((p) => (
              <li key={p.id} style={{ alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontWeight: 500 }}>{rub(p.amount)}</b> <span className="muted">за {p.period} · отчётов: {p.reports}</span>
                  <small>{p.status === "paid" ? `выплачено ${new Date(p.paidAt!).toLocaleDateString("ru-RU")}` : "в обработке — партнёр видит «Запрос на вывод отправлен»"}</small>
                </div>
                {p.status === "pending" ? <button className="a-btn is-lime is-small" type="button" disabled={pending} onClick={() => run(() => markPaid(p.id))}>Отметить выплаченной</button> : <span className="a-badge s-done">Выплачено</span>}
              </li>
            ))}
          </ul>
        ) : <p className="muted">Выплат ещё не было.</p>}
      </section>
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </>
  );
}
