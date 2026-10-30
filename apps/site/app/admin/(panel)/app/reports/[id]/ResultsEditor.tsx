"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveValues } from "../actions";

type Zone = "red" | "yellow" | "green";
export type ResultRow = { id: string; name: string; value: number | null; floor: boolean; zone: Zone };

const ZONE_LABEL: Record<Zone, string> = { red: "Красная", yellow: "Жёлтая", green: "Зелёная" };
// Same thresholds as apps/web/src/lib/fox-parser.ts classifyZone.
const zoneOf = (v: number): Zone => (v < 10 ? "green" : v < 20 ? "yellow" : "red");
// Below the detection floor the PDF prints "<5" and the parser keeps no number: that is expected, not doubtful.
const doubtful = (r: ResultRow) => (r.value === null ? !r.floor : !r.floor && zoneOf(r.value) !== r.zone);

type Filter = "all" | "doubt" | Zone;

/* Values next to the PDF. Doubtful rows (no value, or a zone that does not match the value) are marked and have
   their own filter; edits are collected and saved together, optionally rebuilding the client's plan. */
export function ResultsEditor({ reportId, rows, pdfUrl }: { reportId: string; rows: ResultRow[]; pdfUrl: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edits, setEdits] = useState<Record<string, { value: number | null; zone: Zone }>>({});
  const [filter, setFilter] = useState<Filter>(() => (rows.some(doubtful) ? "doubt" : "all"));
  const [text, setText] = useState("");
  const [rebuild, setRebuild] = useState(true);
  const [showPdf, setShowPdf] = useState(Boolean(pdfUrl));
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const current = (r: ResultRow): ResultRow => (edits[r.id] ? { ...r, ...edits[r.id] } : r);
  const counts = useMemo(() => ({
    all: rows.length,
    doubt: rows.filter((r) => doubtful(current(r))).length,
    red: rows.filter((r) => current(r).zone === "red").length,
    yellow: rows.filter((r) => current(r).zone === "yellow").length,
    green: rows.filter((r) => current(r).zone === "green").length,
  }), [rows, edits]); // eslint-disable-line react-hooks/exhaustive-deps
  const needle = text.trim().toLowerCase();
  const shown = rows.filter((r) => {
    const c = current(r);
    if (needle && !r.name.toLowerCase().includes(needle)) return false;
    if (filter === "doubt") return doubtful(c) || Boolean(edits[r.id]);
    return filter === "all" || c.zone === filter;
  });
  const dirty = Object.keys(edits).length;

  const setValue = (r: ResultRow, raw: string) => {
    const value = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    if (value !== null && !Number.isFinite(value)) return;
    const zone = value === null ? current(r).zone : zoneOf(value);
    patch(r, { value, zone });
  };
  const patch = (r: ResultRow, next: { value: number | null; zone: Zone }) => {
    setEdits((e) => {
      const copy = { ...e };
      if (next.value === r.value && next.zone === r.zone) delete copy[r.id];
      else copy[r.id] = next;
      return copy;
    });
  };

  if (!rows.length) return <p className="muted">Значений нет: отчёт не распознан. Обработайте его заново или отклоните.</p>;

  return (
    <div className={`a-review${showPdf && pdfUrl ? " has-pdf" : ""}`}>
      {showPdf && pdfUrl && (
        <div className="a-review-pdf">
          <iframe src={pdfUrl} title="PDF отчёта" />
        </div>
      )}
      <div className="a-review-values">
        <div className="a-chips" style={{ marginBottom: 12 }}>
          {(["doubt", "all", "red", "yellow", "green"] as Filter[]).map((f) => (
            <button key={f} type="button" className="a-chip" aria-current={filter === f ? "true" : undefined} onClick={() => setFilter(f)}>
              {f === "doubt" ? "Сомнительные" : f === "all" ? "Все" : ZONE_LABEL[f as Zone]} <i>{counts[f]}</i>
            </button>
          ))}
          {pdfUrl && <button type="button" className="a-chip" onClick={() => setShowPdf((v) => !v)}>{showPdf ? "Скрыть PDF" : "Показать PDF"}</button>}
        </div>
        <input className="a-input" style={{ marginBottom: 12 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Найти продукт" aria-label="Найти продукт" />
        {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 12 }}>{msg.text}</div>}
        <div className="a-table-wrap">
          <div className="a-table-scroll" style={{ maxHeight: 640 }}>
            <table className="a-table a-values">
              <thead><tr><th>Продукт</th><th>мкг/мл</th><th>Зона</th></tr></thead>
              <tbody>
                {shown.map((r) => {
                  const c = current(r);
                  return (
                    <tr key={r.id} className={`${doubtful(c) ? "is-doubt" : ""}${edits[r.id] ? " is-dirty" : ""}`}>
                      <td className="a-cell-main"><span>{r.name}</span>{r.floor && <span className="sub">ниже порога</span>}{doubtful(c) && <span className="sub" style={{ color: "var(--a-red)" }}>{c.value === null ? "нет значения" : "зона не совпадает со значением"}</span>}</td>
                      <td data-label="мкг/мл">
                        <input className="a-input a-num-input" inputMode="decimal" defaultValue={r.value ?? ""} placeholder={r.floor ? "< 5" : ""} key={`${r.id}-${r.value}`} onChange={(e) => setValue(r, e.target.value)} aria-label={`Значение ${r.name}`} />
                      </td>
                      <td data-label="Зона">
                        <select className={`a-input a-zone-select z-${c.zone}`} value={c.zone} onChange={(e) => patch(r, { value: c.value, zone: e.target.value as Zone })} aria-label={`Зона ${r.name}`}>
                          {(Object.keys(ZONE_LABEL) as Zone[]).map((z) => <option key={z} value={z}>{ZONE_LABEL[z]}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!shown.length && <div className="a-empty"><b>Пусто</b>{filter === "doubt" ? "Сомнительных значений нет." : "Ничего не нашли."}</div>}
        </div>
        <div className={`a-savebar${dirty ? " is-on" : ""}`}>
          <span>Изменено: {dirty}</span>
          <label className="a-check" style={{ color: "inherit" }}><input type="checkbox" checked={rebuild} onChange={(e) => setRebuild(e.target.checked)} /> Пересобрать план клиента</label>
          <div className="a-actions">
            <button className="a-btn is-ghost is-small" type="button" style={{ color: "inherit" }} disabled={pending} onClick={() => setEdits({})}>Сбросить</button>
            <button className="a-btn is-lime is-small" type="button" disabled={pending} onClick={() => start(async () => {
              const r = await saveValues(reportId, Object.entries(edits).map(([id, v]) => ({ id, ...v })), rebuild);
              setMsg({ text: r.message ?? (r.ok ? "Сохранено" : "Ошибка"), error: !r.ok });
              if (r.ok) { setEdits({}); router.refresh(); }
            })}>{pending ? "Сохраняем…" : "Сохранить"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
