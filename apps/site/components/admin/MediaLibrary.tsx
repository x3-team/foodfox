"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/app/admin/api/media/route";
import { deleteMedia, saveAlt, usage } from "@/app/admin/(panel)/media/actions";
import { Icon } from "./Icon";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf";

function size(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

type Props = { onPick?: (item: MediaItem) => void; kind?: "image" | "file" };

/** The media library: drop zone, search, grid, details panel. With onPick it works as the picker of the editors. */
export function MediaLibrary({ onPick, kind }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const say = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), error ? 6000 : 2600);
  };

  const load = useCallback(async (text = "") => {
    setLoading(true);
    const params = new URLSearchParams();
    if (text) params.set("q", text);
    if (kind) params.set("kind", kind);
    const res = await fetch(`/admin/api/media?${params}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({ items: [] }));
    setItems(data.items ?? []);
    setLoading(false);
  }, [kind]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query, load]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    const form = new FormData();
    list.forEach((file) => form.append("files", file));
    try {
      const res = await fetch("/admin/api/media", { method: "POST", body: form });
      const data = await res.json();
      if (data.items?.length) {
        setItems((prev) => [...data.items, ...prev]);
        say(`Загружено: ${data.items.length}`);
        if (onPick && data.items.length === 1) setCurrent(data.items[0]);
      }
      if (data.errors?.length) say(data.errors.join("; "), true);
    } catch {
      say("Не загрузилось, проверьте соединение", true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="a-media">
      <div
        className={`a-drop${drag ? " is-drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); }}
      >
        <Icon name="upload" size={24} />
        <div>
          <b>{busy ? "Загружаем…" : "Перетащите файлы сюда"}</b>
          <span className="muted">JPG, PNG, WebP, GIF, AVIF или PDF до 20 МБ. Для картинок сами сделаем WebP нужных размеров.</span>
        </div>
        <button className="a-btn is-small" type="button" disabled={busy} onClick={() => input.current?.click()}>Выбрать файлы</button>
        <input ref={input} type="file" multiple accept={kind === "image" ? ACCEPT.replace(",application/pdf", "") : ACCEPT} hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
      </div>

      <div className="a-filters" style={{ marginTop: 16 }}>
        <label className="a-field is-search"><span className="sr">Поиск</span><input className="a-input" placeholder="Поиск по имени файла или описанию" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      </div>

      <div className={`a-media-body${current ? " has-panel" : ""}`}>
        {loading && !items.length ? <p className="muted">Загружаем…</p> : items.length === 0 ? (
          <div className="a-empty"><b>Файлов пока нет</b>Загрузите первый — он появится здесь.</div>
        ) : (
          <ul className="a-media-grid">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" aria-pressed={current?.id === item.id} onClick={() => setCurrent(item)} onDoubleClick={() => onPick?.(item)}>
                  {item.mime.startsWith("image/") ? <img src={item.thumb} alt={item.alt} loading="lazy" /> : <span className="a-file-ico">PDF</span>}
                  <span className="a-media-name">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {current && (
          <MediaPanel
            key={current.id}
            item={current}
            onPick={onPick}
            onClose={() => setCurrent(null)}
            onSaved={(next) => { setItems((prev) => prev.map((i) => (i.id === next.id ? next : i))); setCurrent(next); }}
            onDeleted={(id) => { setItems((prev) => prev.filter((i) => i.id !== id)); setCurrent(null); }}
            say={say}
          />
        )}
      </div>
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}

function MediaPanel({ item, onPick, onClose, onSaved, onDeleted, say }: {
  item: MediaItem; onPick?: (item: MediaItem) => void; onClose: () => void;
  onSaved: (item: MediaItem) => void; onDeleted: (id: string) => void; say: (text: string, error?: boolean) => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const [used, setUsed] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => { void usage(item.id).then(setUsed).catch(() => setUsed([])); }, [item.id]);
  const isImage = item.mime.startsWith("image/");
  const absolute = typeof window === "undefined" ? item.src : `${window.location.origin}${item.src}`;

  return (
    <aside className="a-card a-media-panel" aria-label="Файл">
      <div className="a-card-head">
        <h3 style={{ overflowWrap: "anywhere" }}>{item.name}</h3>
        <button type="button" className="a-btn is-ghost is-small" onClick={onClose} aria-label="Закрыть"><Icon name="close" size={16} /></button>
      </div>
      {isImage ? <img className="a-media-preview" src={item.src} alt={alt} /> : <a className="a-link" href={item.url} target="_blank" rel="noreferrer">Открыть файл</a>}
      <dl className="a-dl" style={{ gridTemplateColumns: "96px minmax(0,1fr)", margin: "16px 0", fontSize: 14 }}>
        <dt>Размер</dt><dd>{size(item.size)}{item.width ? ` · ${item.width}×${item.height}` : ""}</dd>
        <dt>Загружен</dt><dd>{new Date(item.createdAt).toLocaleString("ru-RU")}</dd>
        <dt>Где</dt><dd>{used === null ? "проверяем…" : used.length ? used.join(", ") : "нигде не используется"}</dd>
      </dl>
      {isImage && (
        <label className="a-field" style={{ marginBottom: 12 }}>
          <span>Описание (alt) — для незрячих и поисковиков</span>
          <input className="a-input" value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={() => alt !== item.alt && void saveAlt(item.id, alt).then((r) => { if (r.ok) onSaved({ ...item, alt }); else say(r.message ?? "Ошибка", true); })} />
        </label>
      )}
      <div className="a-actions" style={{ gap: 8 }}>
        {onPick && <button className="a-btn is-lime" type="button" onClick={() => onPick({ ...item, alt })}>Выбрать</button>}
        <button className="a-btn is-ghost is-small" type="button" onClick={() => { void navigator.clipboard?.writeText(absolute); say("Ссылка скопирована"); }}><Icon name="copy" size={16} /> Ссылка</button>
        <button className="a-btn is-danger is-small" type="button" disabled={pending || Boolean(used?.length)} title={used?.length ? "Сначала уберите файл со страниц" : undefined}
          onClick={() => {
            if (!window.confirm(`Удалить ${item.name}?`)) return;
            setPending(true);
            void deleteMedia(item.id).then((r) => { setPending(false); if (r.ok) { onDeleted(item.id); say("Файл удалён"); } else say(r.message ?? "Ошибка", true); });
          }}>
          <Icon name="trash" size={16} /> Удалить
        </button>
      </div>
    </aside>
  );
}
