"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ago, dateTime } from "@/lib/admin/format";
import { LEAD_STATUSES, kindLabel } from "@/lib/admin/leads";
import { bulkLeads } from "./actions";

export type LeadRow = {
  id: string; created_at: string; kind: string; status: keyof typeof LEAD_STATUSES; name: string; email: string;
  phone: string; city: string; message: string; assignee: string; notes: number;
};

type Props = { rows: LeadRow[]; total: number; page: number; pages: number; prevHref: string | null; nextHref: string | null };

export function LeadsTable({ rows, total, page, pages, prevHref, nextHref }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("in_progress");
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();
  const all = rows.length > 0 && rows.every((r) => picked.has(r.id));

  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const apply = () => start(async () => {
    const result = await bulkLeads([...picked], status);
    setToast(result.message ?? (result.ok ? "Готово" : "Ошибка"));
    window.setTimeout(() => setToast(""), 3000);
    setPicked(new Set());
    router.refresh();
  });

  if (!rows.length) {
    return (
      <div className="a-table-wrap">
        <div className="a-empty"><b>Заявок нет</b>Под эти фильтры ничего не подходит.</div>
      </div>
    );
  }

  return (
    <>
      <div className="a-table-wrap">
        <div className="a-table-scroll">
          <table className="a-table">
            <thead>
              <tr>
                <th className="a-sel"><input type="checkbox" aria-label="Выбрать все на странице" checked={all} onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
                <th>Заявка</th>
                <th>Форма</th>
                <th>Контакт</th>
                <th>Статус</th>
                <th>Ответственный</th>
                <th>Получена</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.status === "new" ? "is-new" : undefined}>
                  <td className="a-sel" data-label="Выбрать"><input type="checkbox" aria-label={`Выбрать заявку ${r.id}`} checked={picked.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td className="a-cell-main a-clip">
                    <Link href={`/admin/leads/${r.id}`}>{r.name || r.email || r.phone || "Без имени"}</Link>
                    <span className="sub">#{r.id}{r.city ? ` · ${r.city}` : ""}{r.message ? ` · ${r.message}` : ""}</span>
                  </td>
                  <td data-label="Форма">{kindLabel(r.kind)}</td>
                  <td data-label="Контакт" className="a-clip">
                    {r.email && <span style={{ display: "block" }}>{r.email}</span>}
                    {r.phone && <span className="nowrap">{r.phone}</span>}
                    {!r.email && !r.phone && <span className="faint">—</span>}
                  </td>
                  <td data-label="Статус"><span className={`a-badge s-${r.status}`}>{LEAD_STATUSES[r.status]}</span></td>
                  <td data-label="Ответственный">{r.assignee || <span className="faint">—</span>}{r.notes ? <span className="sub">заметок: {r.notes}</span> : null}</td>
                  <td data-label="Получена" className="nowrap" title={dateTime(r.created_at)}>{ago(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="a-pager">
          <span>Всего {total} · страница {page} из {pages}</span>
          <nav>
            {prevHref ? <Link className="a-btn is-ghost is-small" href={prevHref}>← Назад</Link> : null}
            {nextHref ? <Link className="a-btn is-ghost is-small" href={nextHref}>Дальше →</Link> : null}
          </nav>
        </div>
      </div>
      {picked.size > 0 && (
        <div className="a-bulk" role="region" aria-label="Действия с выбранными">
          <b>Выбрано: {picked.size}</b>
          <select className="a-input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Новый статус">
            {Object.entries(LEAD_STATUSES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <button className="a-btn is-lime" type="button" onClick={apply} disabled={pending}>{pending ? "Сохраняем…" : "Применить"}</button>
          <button className="a-btn is-ghost" style={{ color: "#f8f9f6", borderColor: "rgba(248,249,246,.3)" }} type="button" onClick={() => setPicked(new Set())}>Снять выбор</button>
        </div>
      )}
      {toast && <div className="a-toast" role="status">{toast}</div>}
    </>
  );
}
