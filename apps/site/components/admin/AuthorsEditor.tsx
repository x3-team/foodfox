"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveContent } from "@/app/admin/(panel)/content/actions";
import { BLOG_AUTHORS_KEY, type AuthorPatch } from "@/lib/cms/blog";
import { AutoText, ImageInput, Toggle } from "./ContentEditor";

type Row = { slug: string; name: string; role: string; bio: string; avatar: string; portrait: string; listed: boolean; count: number };

/* Authors are fixed in code (their pages, experience and education live there); the admin changes how they are
   shown. Only the fields that differ from the code are stored. */
export function AuthorsEditor({ authors, saved }: { authors: Row[]; saved: AuthorPatch[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [rows, setRows] = useState(authors);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const say = (text: string, error = false) => { setToast({ text, error }); window.setTimeout(() => setToast(null), error ? 6000 : 2600); };
  const set = (slug: string, change: Partial<Row>) => setRows(rows.map((r) => (r.slug === slug ? { ...r, ...change } : r)));

  const save = (row: Row) => start(async () => {
    const patch: AuthorPatch = { slug: row.slug, name: row.name, role: row.role, bio: row.bio, avatar: row.avatar, portrait: row.portrait, listed: row.listed };
    const next = [...saved.filter((p) => p.slug !== row.slug), patch];
    const r = await saveContent({ [BLOG_AUTHORS_KEY]: next }, `Блог · автор ${row.name}`);
    say(r.message ?? "", !r.ok);
    if (r.ok) router.refresh();
  });

  return (
    <div className="a-list">
      {rows.map((row) => {
        const before = authors.find((a) => a.slug === row.slug)!;
        const dirty = JSON.stringify(before) !== JSON.stringify(row);
        const isOpen = open === row.slug;
        return (
          <div key={row.slug} className={`a-list-item${isOpen ? " is-open" : ""}`} style={{ background: "#fff", padding: "16px 20px", borderRadius: 16 }}>
            <button type="button" className="a-list-toggle" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : row.slug)}>
              <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <img src={row.avatar} alt="" width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover", flex: "none" }} />
                <span style={{ minWidth: 0 }}><b style={{ fontWeight: 500 }}>{row.name}</b><small className="muted" style={{ display: "block", fontSize: 13 }}>{row.role} · материалов: {row.count}{row.listed ? "" : " · скрыт из списка авторов"}</small></span>
              </span>
              <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="a-form" style={{ marginTop: 12 }}>
                <div className="a-row">
                  <label className="a-field"><span>Имя</span><input className="a-input" value={row.name} onChange={(e) => set(row.slug, { name: e.target.value })} /></label>
                  <label className="a-field"><span>Должность</span><input className="a-input" value={row.role} onChange={(e) => set(row.slug, { role: e.target.value })} /></label>
                </div>
                <label className="a-field"><span>О себе</span><AutoText value={row.bio} label="О себе" onChange={(bio) => set(row.slug, { bio })} /></label>
                <div className="a-row">
                  <div className="a-field"><span>Аватар (круглый, в статьях)</span><ImageInput value={{ src: row.avatar }} onChange={(img) => set(row.slug, { avatar: img.src })} /></div>
                  <div className="a-field"><span>Портрет (страница автора)</span><ImageInput value={{ src: row.portrait }} onChange={(img) => set(row.slug, { portrait: img.src })} /></div>
                </div>
                <div className="a-field"><span>Показывать в списке авторов</span><Toggle checked={row.listed} label="Показывать в списке" onChange={(listed) => set(row.slug, { listed })} /></div>
                <div className="a-actions" style={{ gap: 8 }}>
                  <button className="a-btn" type="button" disabled={!dirty || pending} onClick={() => save(row)}>{pending ? "Сохраняем…" : "Сохранить"}</button>
                  {dirty && <button className="a-btn is-ghost" type="button" onClick={() => set(row.slug, before)}>Отменить</button>}
                  <a className="a-btn is-ghost" href={`/blog/authors/${row.slug}`} target="_blank" rel="noreferrer">Страница автора ↗</a>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}
