"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/admin/Icon";
import { makeDefault, saveTariff, setArchived, type TariffInput } from "./actions";

type Row = { id: string; name: string; fee: number; note: string; isDefault: boolean; archived: boolean; partners: number; tiers: { from: number; fee: number }[] };

const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;
const blank: TariffInput = { name: "", fee: "", note: "", tiers: [{ from: "", fee: "" }] };
const toInput = (t: Row): TariffInput => ({ name: t.name, fee: String(t.fee), note: t.note, tiers: [...t.tiers.map((x) => ({ from: String(x.from), fee: String(x.fee) })), { from: "", fee: "" }] });

export function TariffsEditor({ tariffs, canEdit }: { tariffs: Row[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<TariffInput>(blank);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => {
    const r = await fn();
    setMsg(r.ok ? (r.message ? { text: r.message } : null) : { text: r.message ?? "Ошибка", error: true });
    if (r.ok) { setEditing(null); router.refresh(); }
  });
  const open = (t: Row | null) => { setMsg(null); setEditing(t ? t.id : "new"); setForm(t ? toInput(t) : blank); };
  const setTier = (i: number, key: "from" | "fee", value: string) => setForm((f) => {
    const tiers = f.tiers.map((t, j) => (j === i ? { ...t, [key]: value } : t));
    if (i === tiers.length - 1 && (tiers[i].from || tiers[i].fee)) tiers.push({ from: "", fee: "" });
    return { ...f, tiers };
  });

  const editor = (
    <form className="a-card a-form" style={{ marginBottom: 24 }} onSubmit={(e) => { e.preventDefault(); run(() => saveTariff(editing === "new" ? null : editing, form)); }}>
      <div className="a-card-head"><h2>{editing === "new" ? "Новый тариф" : "Тариф"}</h2></div>
      <div className="a-row">
        <label className="a-field"><span>Название</span><input className="a-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Например, «Сертифицированный»" required /></label>
        <label className="a-field"><span>За отчёт, ₽</span><input className="a-input" inputMode="numeric" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="2400" required /></label>
      </div>
      <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <span>Ступени за объём (необязательно)</span>
        {form.tiers.map((t, i) => (
          <div className="a-row" key={i} style={{ alignItems: "center" }}>
            <label className="a-field"><span className="sr">С какого отчёта в месяце</span><input className="a-input" inputMode="numeric" value={t.from} onChange={(e) => setTier(i, "from", e.target.value)} placeholder="с какого отчёта в месяце, например 11" /></label>
            <label className="a-field"><span className="sr">Сумма</span><input className="a-input" inputMode="numeric" value={t.fee} onChange={(e) => setTier(i, "fee", e.target.value)} placeholder="сумма, ₽" /></label>
          </div>
        ))}
        <small>Например, «11 · 2800»: с 11-го подтверждённого отчёта за месяц партнёр получает по 2 800 ₽, первые 10 — по основной сумме.</small>
      </fieldset>
      <label className="a-field"><span>Заметка (видна только в админке)</span><input className="a-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
      <div className="a-actions" style={{ gap: 8 }}>
        <button className="a-btn" type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить"}</button>
        <button className="a-btn is-ghost" type="button" onClick={() => setEditing(null)}>Отмена</button>
      </div>
    </form>
  );

  return (
    <>
      {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>{msg.text}</div>}
      {canEdit && editing === null && (
        <div style={{ marginBottom: 16 }}><button className="a-btn is-lime" type="button" onClick={() => open(null)}><Icon name="plus" /> Добавить тариф</button></div>
      )}
      {editing === "new" && editor}
      <div className="a-table-wrap">
        <table className="a-table">
          <thead><tr><th>Тариф</th><th>За отчёт</th><th>Ступени</th><th>Партнёров</th><th></th></tr></thead>
          <tbody>
            {tariffs.map((t) => (
              <tr key={t.id} style={t.archived ? { opacity: 0.55 } : undefined}>
                <td data-label="Тариф">
                  <b style={{ fontWeight: 500 }}>{t.name}</b>
                  {t.isDefault && <> <span className="a-badge s-done">по умолчанию</span></>}
                  {t.archived && <> <span className="a-badge is-plain">в архиве</span></>}
                  {t.note && <span className="sub">{t.note}</span>}
                </td>
                <td data-label="За отчёт" className="nowrap">{rub(t.fee)}</td>
                <td data-label="Ступени">{t.tiers.length ? <div>{t.tiers.map((x) => <span key={x.from} className="sub">с {x.from}-го в месяце — {rub(x.fee)}</span>)}</div> : "—"}</td>
                <td data-label="Партнёров">{t.partners}{t.isDefault && <span className="sub">и все без своего тарифа</span>}</td>
                <td data-label="">
                  {canEdit && (
                    <div className="a-row-actions">
                      {!t.archived && <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => open(t)}>Изменить</button>}
                      {!t.archived && !t.isDefault && <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => run(() => makeDefault(t.id))}>Сделать основным</button>}
                      {!t.isDefault && <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => run(() => setArchived(t.id, !t.archived))}>{t.archived ? "Вернуть" : "В архив"}</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing !== null && editing !== "new" && <div style={{ marginTop: 24 }}>{editor}</div>}
    </>
  );
}
