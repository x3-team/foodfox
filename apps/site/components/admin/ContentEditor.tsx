"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { fieldHistory, revisionValue, saveContent } from "@/app/admin/(panel)/content/actions";
import type { Field, ImageValue, ItemField, Section } from "@/lib/cms/registry";
import { Icon } from "./Icon";
import { MediaLibrary } from "./MediaLibrary";
import { isLarge, uploadLarge } from "./upload";
import type { MediaItem } from "@/lib/admin/media";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Props = { label: string; sections: Section[]; saved: Record<string, unknown> };

/** Editor for a group of registry fields: edits locally, publishes only what changed, warns about unsaved work. */
export function ContentEditor({ label, sections, saved }: Props) {
  const router = useRouter();
  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const initial = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f.key in saved ? saved[f.key] : f.default])), [fields, saved]);
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [history, setHistory] = useState<Field | null>(null);
  useEffect(() => setValues(initial), [initial]);

  const dirty = fields.filter((f) => !same(values[f.key], initial[f.key]));
  useEffect(() => {
    if (!dirty.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty.length]);

  const set = (key: string, value: unknown) => setValues((prev) => ({ ...prev, [key]: value }));
  const say = (text: string, error = false) => { setToast({ text, error }); window.setTimeout(() => setToast(null), error ? 6000 : 2600); };

  const save = () => start(async () => {
    const changes = Object.fromEntries(dirty.map((f) => [f.key, values[f.key]]));
    const result = await saveContent(changes, label);
    say(result.message ?? (result.ok ? "Сохранено" : "Ошибка"), !result.ok);
    if (result.ok) router.refresh();
  });

  return (
    <div className="a-stack a-editor">
      {sections.map((section) => (
        <section key={section.title} className="a-card">
          <div className="a-card-head"><h2>{section.title}</h2></div>
          <div className="a-form">
            {section.fields.map((field) => {
              const changed = !same(values[field.key], field.default);
              return (
                <div key={field.key} className={`a-edit-field${!same(values[field.key], initial[field.key]) ? " is-dirty" : ""}`}>
                  <div className="a-edit-top">
                    <span className="a-label">{field.label}</span>
                    <span className="a-edit-tools">
                      {changed && <span className="a-badge is-plain s-in_progress">изменено</span>}
                      <button type="button" className="a-mini" onClick={() => setHistory(field)}>История</button>
                      {changed && <button type="button" className="a-mini" onClick={() => set(field.key, field.default)}>Вернуть исходное</button>}
                    </span>
                  </div>
                  <FieldInput field={field} value={values[field.key]} onChange={(v) => set(field.key, v)} />
                  {field.hint && <small className="faint">{field.hint}</small>}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className={`a-savebar${dirty.length ? " is-on" : ""}`} role="region" aria-label="Сохранение">
        <span>{dirty.length ? `Не сохранено: ${dirty.length}` : "Все изменения сохранены"}</span>
        <div className="a-actions" style={{ gap: 8 }}>
          {dirty.length > 0 && <button className="a-btn is-ghost is-small" style={{ color: "#f8f9f6", borderColor: "rgba(248,249,246,.3)" }} type="button" onClick={() => setValues(initial)}>Отменить</button>}
          <button className="a-btn is-lime" type="button" disabled={pending || !dirty.length} onClick={save}>{pending ? "Публикуем…" : "Сохранить и опубликовать"}</button>
        </div>
      </div>

      {history && (
        <HistoryModal field={history} onClose={() => setHistory(null)} onRestore={(value) => { set(history.key, value); setHistory(null); say("Версия подставлена — сохраните, чтобы опубликовать"); }} />
      )}
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}

export function FieldInput({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  switch (field.type) {
    case "text":
    case "url": {
      const v = String(value ?? "");
      return (
        <div className="a-count-wrap">
          <input className="a-input" type={field.type === "url" ? "url" : "text"} value={v} onChange={(e) => onChange(e.target.value)} aria-label={field.label} />
          {"max" in field && field.max ? <span className={`a-counter${v.length > field.max ? " is-over" : ""}`}>{v.length}/{field.max}</span> : null}
        </div>
      );
    }
    case "textarea":
    case "lines":
      return <AutoText value={String(value ?? "")} onChange={onChange} label={field.label} rows={field.type === "lines" ? 3 : 3} />;
    case "number":
      return <input className="a-input" type="number" min={0} value={Number(value ?? 0)} onChange={(e) => onChange(e.target.valueAsNumber || 0)} aria-label={field.label} style={{ maxWidth: 220 }} />;
    case "boolean":
      return <Toggle checked={Boolean(value)} onChange={onChange} label={field.label} />;
    case "image":
      return <ImageInput value={value as ImageValue} onChange={onChange} />;
    case "qa":
      return <QaInput value={(value as Array<[string, string]>) ?? []} onChange={onChange} />;
    case "list":
      return <ListInput field={field} value={(value as Array<Record<string, unknown>>) ?? []} onChange={onChange} />;
  }
}

export function AutoText({ value, onChange, label, rows = 3 }: { value: string; onChange: (v: string) => void; label: string; rows?: number }) {
  // Grows with the text at any width, so nothing hides behind the scroll of a narrow field.
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight + 2, 640)}px`; };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [value]);
  return <textarea ref={ref} className="a-input" style={{ minHeight: 0, resize: "vertical" }} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="a-toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
      <span>{checked ? "Да" : "Нет"}</span>
      <span className="sr">{label}</span>
    </label>
  );
}

export function ImageInput({ value, onChange }: { value: ImageValue; onChange: (v: ImageValue) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="a-image-field">
      {value?.src ? <img src={value.src} alt="" /> : <div className="a-image-empty">Картинка не выбрана</div>}
      <div className="a-actions" style={{ gap: 8 }}>
        <button className="a-btn is-ghost is-small" type="button" onClick={() => setOpen(true)}><Icon name="media" size={16} /> Выбрать из медиатеки</button>
        <span className="faint" style={{ fontSize: 13, overflowWrap: "anywhere" }}>{value?.src}</span>
      </div>
      {open && (
        <Modal title="Выберите картинку" onClose={() => setOpen(false)}>
          <MediaLibrary kind="image" onPick={(item) => { onChange({ src: item.src, srcSet: item.srcSet || undefined, alt: item.alt || undefined }); setOpen(false); }} />
        </Modal>
      )}
    </div>
  );
}

/** A video or a PDF of one list item: upload right here (chunks with progress for big files), pick from the library,
    replace or remove. The value is the file's /media URL. */
export function FileInput({ kind, value, label, onChange }: { kind: "video" | "pdf"; value: string; label: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<number | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    setError("");
    setShare(0);
    try {
      let item: MediaItem;
      if (isLarge(file)) item = await uploadLarge(file, setShare);
      else {
        const form = new FormData();
        form.append("files", file);
        const data = await (await fetch("/admin/api/media", { method: "POST", body: form })).json();
        if (!data.items?.[0]) throw new Error(data.errors?.[0] ?? "Не загрузилось");
        item = data.items[0];
      }
      onChange(item.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не загрузилось");
    } finally {
      setShare(null);
      if (input.current) input.current.value = "";
    }
  };
  const name = value ? value.split("/").pop() : "";
  return (
    <div className="a-file-field">
      {value && kind === "video" && <video src={value} controls preload="metadata" />}
      <div className="a-actions" style={{ gap: 8 }}>
        {value ? <a className="a-link" href={value} target="_blank" rel="noreferrer">{kind === "video" ? "Видео" : "Конспект"} · {name}</a> : <span className="muted">{kind === "video" ? "Видео не загружено" : "PDF не загружен"}</span>}
      </div>
      {share !== null && (
        <span className="a-progress" role="progressbar" aria-label={`Загрузка: ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
          <i style={{ width: `${share * 100}%` }} /><small>Загружаем · {Math.floor(share * 100)}%</small>
        </span>
      )}
      {error && <div className="a-error" role="alert">{error}</div>}
      <div className="a-actions" style={{ gap: 8, marginTop: share !== null ? 24 : 0 }}>
        <button className="a-btn is-ghost is-small" type="button" disabled={share !== null} onClick={() => input.current?.click()}>
          <Icon name="upload" size={16} /> {value ? "Заменить" : "Загрузить"}
        </button>
        <button className="a-btn is-ghost is-small" type="button" disabled={share !== null} onClick={() => setOpen(true)}><Icon name="media" size={16} /> Из медиатеки</button>
        {value && <button className="a-mini is-danger" type="button" disabled={share !== null} onClick={() => window.confirm("Убрать файл из урока? Сам файл останется в медиатеке.") && onChange("")}>Убрать</button>}
        <input ref={input} type="file" hidden accept={kind === "video" ? "video/mp4,video/webm" : "application/pdf"} aria-label={label} onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
      </div>
      {open && (
        <Modal title={kind === "video" ? "Выберите видео" : "Выберите PDF"} onClose={() => setOpen(false)}>
          <MediaLibrary kind={kind === "video" ? "video" : "file"} onPick={(item) => { onChange(item.url); setOpen(false); }} />
        </Modal>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);
  return (
    <div className="a-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-modal-box">
        <div className="a-modal-head"><h2>{title}</h2><button type="button" className="a-btn is-ghost is-small" onClick={onClose} aria-label="Закрыть"><Icon name="close" size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function QaInput({ value, onChange }: { value: Array<[string, string]>; onChange: (v: Array<[string, string]>) => void }) {
  return (
    <div className="a-list">
      {value.map(([question, answer], index) => (
        <div key={index} className="a-list-item">
          <div className="a-list-head">
            <b>Вопрос {index + 1}</b>
            <span className="a-edit-tools">
              <button type="button" className="a-mini" aria-label="Выше" disabled={index === 0} onClick={() => onChange(move(value, index, index - 1))}>↑</button>
              <button type="button" className="a-mini" aria-label="Ниже" disabled={index === value.length - 1} onClick={() => onChange(move(value, index, index + 1))}>↓</button>
              <button type="button" className="a-mini is-danger" onClick={() => window.confirm("Удалить вопрос?") && onChange(value.filter((_, i) => i !== index))}>Удалить</button>
            </span>
          </div>
          <input className="a-input" value={question} placeholder="Вопрос" aria-label={`Вопрос ${index + 1}`} onChange={(e) => onChange(value.map((p, i) => (i === index ? [e.target.value, p[1]] : p)))} />
          <AutoText value={answer} label={`Ответ ${index + 1}`} rows={2} onChange={(v) => onChange(value.map((p, i) => (i === index ? [p[0], v] : p)))} />
        </div>
      ))}
      <button type="button" className="a-btn is-ghost is-small" onClick={() => onChange([...value, ["", ""]])}><Icon name="plus" size={16} /> Добавить вопрос</button>
    </div>
  );
}

function ListInput({ field, value, onChange }: { field: Extract<Field, { type: "list" }>; value: Array<Record<string, unknown>>; onChange: (v: Array<Record<string, unknown>>) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const titleOf = (item: Record<string, unknown>) => String(item.title ?? item.name ?? "");
  const setItem = (index: number, name: string, v: unknown) => onChange(value.map((item, i) => (i === index ? { ...item, [name]: v } : item)));
  return (
    <div className="a-list">
      {value.map((item, index) => (
        <div key={index} className={`a-list-item${open === index ? " is-open" : ""}`}>
          <button type="button" className="a-list-toggle" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>
            <span><span className="faint">{field.itemTitle} {index + 1}</span> {titleOf(item)}</span>
            <span aria-hidden="true">{open === index ? "−" : "+"}</span>
          </button>
          {open === index && (
            <div className="a-form" style={{ gap: 16, marginTop: 12 }}>
              {field.of.map((f: ItemField) => f.type === "video" || f.type === "pdf" ? (
                <div key={f.name} className="a-field">
                  <span>{f.label}</span>
                  <FileInput kind={f.type} value={String(item[f.name] ?? "")} label={`${field.itemTitle} ${index + 1}: ${f.label}`} onChange={(v) => setItem(index, f.name, v || undefined)} />
                  {f.hint && <small className="faint">{f.hint}</small>}
                </div>
              ) : (
                <label key={f.name} className="a-field">
                  <span>{f.label}</span>
                  {f.readonly ? <input className="a-input" value={String(item[f.name] ?? "")} readOnly disabled />
                    : f.type === "textarea" ? <AutoText value={String(item[f.name] ?? "")} label={f.label} rows={2} onChange={(v) => setItem(index, f.name, v)} />
                    : f.type === "number" ? <input className="a-input" type="number" min={0} value={Number(item[f.name] ?? 0)} onChange={(e) => setItem(index, f.name, e.target.valueAsNumber || 0)} style={{ maxWidth: 200 }} />
                    : f.type === "boolean" ? <Toggle checked={Boolean(item[f.name])} label={f.label} onChange={(v) => setItem(index, f.name, v)} />
                    : f.type === "qa" ? <QaInput value={(item[f.name] as Array<[string, string]>) ?? []} onChange={(v) => setItem(index, f.name, v)} />
                    : <input className="a-input" type={f.type === "url" ? "url" : "text"} value={String(item[f.name] ?? "")} onChange={(e) => setItem(index, f.name, e.target.value)} />}
                </label>
              ))}
              {!field.fixed && (
                <div className="a-actions" style={{ gap: 8 }}>
                  <button type="button" className="a-mini" disabled={index === 0} onClick={() => { onChange(move(value, index, index - 1)); setOpen(index - 1); }}>↑ Выше</button>
                  <button type="button" className="a-mini" disabled={index === value.length - 1} onClick={() => { onChange(move(value, index, index + 1)); setOpen(index + 1); }}>↓ Ниже</button>
                  <button type="button" className="a-mini is-danger" onClick={() => window.confirm("Удалить?") && onChange(value.filter((_, i) => i !== index))}>Удалить</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function preview(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value === true ? "Да" : value === false ? "Нет" : String(value);
  if (Array.isArray(value)) return `${value.length} элементов: ${value.slice(0, 2).map((v) => (Array.isArray(v) ? v[0] : (v as Record<string, unknown>).title ?? (v as Record<string, unknown>).name ?? "")).join("; ")}…`;
  const img = value as ImageValue;
  return img.src ?? JSON.stringify(value);
}

function HistoryModal({ field, onClose, onRestore }: { field: Field; onClose: () => void; onRestore: (value: unknown) => void }) {
  const [rows, setRows] = useState<Array<{ id: string; value: unknown; created_at: string; author_name: string }> | null>(null);
  useEffect(() => { void fieldHistory(field.key).then(setRows).catch(() => setRows([])); }, [field.key]);
  return (
    <Modal title={`История: ${field.label}`} onClose={onClose}>
      <ul className="a-feed a-card" style={{ padding: "8px 24px" }}>
        <li>
          <div style={{ flex: 1, minWidth: 0 }}>
            <small>Исходный текст из макета</small>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{preview(field.default)}</p>
          </div>
          <button type="button" className="a-btn is-ghost is-small" onClick={() => onRestore(field.default)}>Вернуть</button>
        </li>
        {rows === null && <li className="muted">Загружаем…</li>}
        {rows?.map((row) => (
          <li key={row.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <small>{new Date(row.created_at).toLocaleString("ru-RU")} · {row.author_name}</small>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{preview(row.value)}</p>
            </div>
            <button type="button" className="a-btn is-ghost is-small" onClick={() => void revisionValue(row.id).then((r) => r && onRestore(r.value))}>Вернуть</button>
          </li>
        ))}
        {rows?.length === 0 && <li className="muted">Поле ещё не меняли.</li>}
      </ul>
    </Modal>
  );
}
