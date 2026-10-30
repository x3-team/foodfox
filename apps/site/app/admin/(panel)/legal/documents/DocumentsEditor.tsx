"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/admin/Icon";
import { makeCurrent, saveDocument, type DocumentInput } from "../actions";

type Doc = { id: string; kind: string; kindLabel: string; version: string; title: string; url: string | null; note: string | null; effectiveFrom: string; current: boolean; accepted: number };

const today = () => new Date().toISOString().slice(0, 10);
const blank = (): DocumentInput => ({ kind: "privacy", version: "", title: "", url: "", note: "", effectiveFrom: today(), current: true });
const ruDate = (iso: string) => iso.split("-").reverse().join(".");

export function DocumentsEditor({ docs, kinds }: { docs: Doc[]; kinds: { id: string; label: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState<DocumentInput | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, close = false) => start(async () => {
    const r = await fn();
    setMsg({ text: r.message ?? (r.ok ? "Готово" : "Ошибка"), error: !r.ok });
    if (r.ok) { if (close) setForm(null); router.refresh(); }
  });
  const newVersionOf = (d: Doc) => { setMsg(null); setForm({ kind: d.kind, version: "", title: d.title, url: d.url ?? "", note: "", effectiveFrom: today(), current: true }); };

  return (
    <>
      {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>{msg.text}</div>}
      {form ? (
        <form className="a-card a-form" style={{ marginBottom: 24 }} onSubmit={(e) => { e.preventDefault(); run(() => saveDocument(form), true); }}>
          <div className="a-card-head"><h2>Новая версия документа</h2></div>
          <div className="a-row">
            <label className="a-field"><span>Документ</span>
              <select className="a-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {kinds.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </label>
            <label className="a-field"><span>Версия</span><input className="a-input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.1" required /></label>
            <label className="a-field"><span>Действует с</span><input className="a-input" type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} required /></label>
          </div>
          <label className="a-field"><span>Название</span><input className="a-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Политика обработки персональных данных" /></label>
          <label className="a-field">
            <span>Ссылка на текст</span>
            <input className="a-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="/privacy или ссылка на PDF из медиатеки" />
            <small>PDF загрузите в «Медиатеку» и вставьте его ссылку. Ссылку показывает приложение на экране входа.</small>
          </label>
          <label className="a-field"><span>Что изменилось (видно только в админке)</span><input className="a-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <label className="a-check"><input type="checkbox" checked={form.current} onChange={(e) => setForm({ ...form, current: e.target.checked })} /> Сделать действующей сразу</label>
          <div className="a-actions" style={{ gap: 8 }}>
            <button className="a-btn" type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить версию"}</button>
            <button className="a-btn is-ghost" type="button" onClick={() => setForm(null)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div style={{ marginBottom: 16 }}><button className="a-btn is-lime" type="button" onClick={() => { setMsg(null); setForm(blank()); }}><Icon name="plus" /> Новая версия</button></div>
      )}
      <div className="a-table-wrap">
        <table className="a-table">
          <thead><tr><th>Документ</th><th>Версия</th><th>Действует с</th><th>Текст</th><th>Согласий</th><th></th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} style={d.current ? undefined : { opacity: 0.7 }}>
                <td className="a-cell-main">
                  {d.kindLabel}
                  <span className="sub">{d.title}</span>
                  {d.note && <span className="sub">{d.note}</span>}
                </td>
                <td data-label="Версия">{d.version} {d.current && <span className="a-badge s-done">действует</span>}</td>
                <td data-label="Действует с" className="nowrap">{ruDate(d.effectiveFrom)}</td>
                <td data-label="Текст">{d.url ? <a className="a-link" href={d.url} target="_blank" rel="noreferrer">Открыть</a> : "—"}</td>
                <td data-label="Согласий">{d.accepted}</td>
                <td data-label="">
                  <div className="a-row-actions" style={{ position: "relative", zIndex: 1 }}>
                    <button className="a-btn is-ghost is-small" type="button" onClick={() => newVersionOf(d)}>Новая версия</button>
                    {!d.current && <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => run(() => makeCurrent(d.id))}>Сделать действующей</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
