"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveContent } from "@/app/admin/(panel)/content/actions";
import { publishFromLead, rejectLead } from "@/app/admin/(panel)/reviews/actions";
import { ago } from "@/lib/admin/format";
import type { Review } from "@/lib/site-data/reviews";
import { ImageInput, Modal, Toggle } from "./ContentEditor";
import { Icon } from "./Icon";

type InboxItem = { id: string; name: string; city: string; who: string; text: string; createdAt: string };

const BLANK: Review = { id: "", kind: "Текст", who: "Пациенты", tag: "Общее самочувствие", photo: "", video: false, title: "", name: "", text: "" };

export function ReviewsManager({ inbox, list }: { inbox: InboxItem[]; list: Review[] }) {
  const router = useRouter();
  const [items, setItems] = useState(list);
  const [edit, setEdit] = useState<{ index: number; review: Review; leadId?: string } | null>(null);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  useEffect(() => setItems(list), [list]);
  const tags = useMemo(() => Array.from(new Set(list.map((r) => r.tag))), [list]);
  const dirty = JSON.stringify(items) !== JSON.stringify(list);
  const say = (text: string, error = false) => { setToast({ text, error }); window.setTimeout(() => setToast(null), error ? 6000 : 2600); };

  const persist = (next: Review[]) => start(async () => {
    const r = await saveContent({ "reviews.list": next }, "Отзывы");
    say(r.message ?? "", !r.ok);
    if (r.ok) router.refresh();
  });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setItems(next);
  };

  return (
    <div className="a-stack">
      <section className="a-card">
        <div className="a-card-head"><h2>На модерации <span className="muted num">{inbox.length}</span></h2></div>
        {inbox.length ? (
          <ul className="a-feed">
            {inbox.map((item) => (
              <li key={item.id} style={{ flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                  <b style={{ fontWeight: 500 }}>{item.name || "Без имени"}</b>
                  <small>{[item.who, item.city, ago(item.createdAt)].filter(Boolean).join(" · ")}</small>
                  <p className="a-quote" style={{ marginTop: 8 }}>{item.text}</p>
                </div>
                <div className="a-actions" style={{ gap: 8, alignSelf: "center" }}>
                  <button className="a-btn is-lime is-small" type="button" onClick={() => setEdit({ index: -1, leadId: item.id, review: { ...BLANK, name: [item.name, item.city].filter(Boolean).join(", ") || "Гость", who: item.who === "Специалист" ? "Специалисты" : "Пациенты", text: item.text } })}>Опубликовать…</button>
                  <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => window.confirm("Отклонить отзыв? Он не появится на сайте.") && start(async () => { const r = await rejectLead(item.id); say(r.message); router.refresh(); })}>Отклонить</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Новых отзывов нет.</p>}
      </section>

      <section className="a-card">
        <div className="a-card-head">
          <h2>Опубликованные <span className="muted num">{items.filter((r) => !r.hidden).length} из {items.length}</span></h2>
          <button className="a-btn is-ghost is-small" type="button" onClick={() => setEdit({ index: -1, review: { ...BLANK } })}><Icon name="plus" size={16} /> Добавить</button>
        </div>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead><tr><th>Отзыв</th><th>Тип</th><th>Тема</th><th>На сайте</th><th></th></tr></thead>
            <tbody>
              {items.map((r, index) => (
                <tr key={r.id}>
                  <td className="a-cell-main a-clip"><b style={{ fontWeight: 500 }}>{r.name}</b><span className="sub">{r.title || r.text}</span></td>
                  <td data-label="Тип">{r.video ? "Видео" : "Текст"} · {r.who}</td>
                  <td data-label="Тема">{r.tag}</td>
                  <td data-label="На сайте"><Toggle checked={!r.hidden} label={`Показывать ${r.name}`} onChange={(v) => setItems(items.map((x, i) => (i === index ? { ...x, hidden: !v || undefined } : x)))} /></td>
                  <td data-label="">
                    <div className="a-row-actions" style={{ position: "relative", zIndex: 1 }}>
                      <button type="button" className="a-mini" aria-label="Выше" disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
                      <button type="button" className="a-mini" aria-label="Ниже" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>↓</button>
                      <button type="button" className="a-mini" onClick={() => setEdit({ index, review: r })}>Изменить</button>
                      <button type="button" className="a-mini is-danger" onClick={() => window.confirm(`Удалить отзыв «${r.name}»?`) && setItems(items.filter((_, i) => i !== index))}>Удалить</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={`a-savebar${dirty ? " is-on" : ""}`}>
        <span>Порядок и видимость изменены</span>
        <div className="a-actions" style={{ gap: 8 }}>
          <button className="a-btn is-ghost is-small" style={{ color: "#f8f9f6", borderColor: "rgba(248,249,246,.3)" }} type="button" onClick={() => setItems(list)}>Отменить</button>
          <button className="a-btn is-lime" type="button" disabled={pending} onClick={() => persist(items)}>Сохранить и опубликовать</button>
        </div>
      </div>

      {edit && (
        <ReviewForm
          initial={edit.review}
          tags={tags}
          fromLead={Boolean(edit.leadId)}
          onClose={() => setEdit(null)}
          onSave={(review) => start(async () => {
            if (edit.leadId) {
              const r = await publishFromLead(edit.leadId, review);
              say(r.message ?? "", !r.ok);
              if (r.ok) { setEdit(null); router.refresh(); }
              return;
            }
            const next = edit.index >= 0 ? items.map((x, i) => (i === edit.index ? review : x)) : [{ ...review, id: `r-${Date.now()}` }, ...items];
            const r = await saveContent({ "reviews.list": next }, "Отзывы");
            say(r.message ?? "", !r.ok);
            if (r.ok) { setEdit(null); router.refresh(); }
          })}
          pending={pending}
        />
      )}
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}

function ReviewForm({ initial, tags, fromLead, onClose, onSave, pending }: { initial: Review; tags: string[]; fromLead: boolean; onClose: () => void; onSave: (r: Review) => void; pending: boolean }) {
  const [r, setR] = useState(initial);
  const set = <K extends keyof Review>(key: K, value: Review[K]) => setR((prev) => ({ ...prev, [key]: value }));
  return (
    <Modal title={fromLead ? "Публикация отзыва" : initial.name ? `Отзыв: ${initial.name}` : "Новый отзыв"} onClose={onClose}>
      <div className="a-card a-form">
        <div className="a-row">
          <label className="a-field"><span>Имя и подпись</span><input className="a-input" value={r.name} onChange={(e) => set("name", e.target.value)} placeholder="Ольга, 29 лет" /></label>
          <label className="a-field"><span>Кто</span>
            <select className="a-input" value={r.who} onChange={(e) => set("who", e.target.value)}><option>Пациенты</option><option>Специалисты</option></select>
          </label>
          <label className="a-field"><span>Тема</span>
            <input className="a-input" list="review-tags" value={r.tag} onChange={(e) => set("tag", e.target.value)} />
            <datalist id="review-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
        </div>
        {r.who === "Специалисты" && <label className="a-field"><span>Должность</span><input className="a-input" value={r.role ?? ""} onChange={(e) => set("role", e.target.value)} placeholder="Нутрициолог" /></label>}
        {!fromLead && <div className="a-field"><span>Видеоотзыв</span><Toggle checked={r.video} label="Видео" onChange={(v) => set("video", v)} /></div>}
        {r.video ? (
          <>
            <label className="a-field"><span>Заголовок</span><input className="a-input" value={r.title} onChange={(e) => set("title", e.target.value)} /></label>
            <div className="a-field"><span>Обложка видео</span><ImageInput value={{ src: r.photo || "/figma/reviews/r1.webp" }} onChange={(v) => set("photo", v.src)} /></div>
          </>
        ) : (
          <label className="a-field"><span>Текст</span><textarea className="a-input" rows={6} value={r.text} onChange={(e) => set("text", e.target.value)} /><small>Можно поправить опечатки, смысл не меняйте.</small></label>
        )}
        <div className="a-actions">
          <button className="a-btn is-lime" type="button" disabled={pending} onClick={() => onSave(r)}>{pending ? "Публикуем…" : "Опубликовать"}</button>
          <button className="a-btn is-ghost" type="button" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </Modal>
  );
}
