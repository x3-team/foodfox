"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveSeo } from "@/app/admin/(panel)/seo/actions";
import type { SeoRow } from "@/lib/cms/seo";
import { ImageInput, Modal, Toggle } from "./ContentEditor";

type PageInfo = { path: string; label: string; title: string; description: string; group: string };
const EMPTY = { title: "", description: "", og_image: "", canonical: "", noindex: false, in_sitemap: true };

export function SeoManager({ pages, saved }: { pages: PageInfo[]; saved: Record<string, SeoRow> }) {
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<PageInfo | null>(null);
  const list = useMemo(() => {
    const text = query.trim().toLowerCase();
    return text ? pages.filter((p) => `${p.label} ${p.path}`.toLowerCase().includes(text)) : pages;
  }, [pages, query]);
  const groups = Array.from(new Set(list.map((p) => p.group)));

  return (
    <>
      <div className="a-filters"><label className="a-field is-search"><span className="sr">Поиск</span><input className="a-input" placeholder="Поиск по названию или адресу" value={query} onChange={(e) => setQuery(e.target.value)} /></label></div>
      {groups.map((group) => (
        <section key={group} style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 12px" }}>{group}</h2>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead><tr><th>Страница</th><th>Title</th><th>Индексация</th><th></th></tr></thead>
              <tbody>
                {list.filter((p) => p.group === group).map((p) => {
                  const row = saved[p.path];
                  return (
                    <tr key={p.path}>
                      <td className="a-cell-main a-clip"><b style={{ fontWeight: 500 }}>{p.label}</b><span className="sub">{p.path}</span></td>
                      <td data-label="Title" className="a-clip"><span className="sub" style={{ color: row?.title ? "var(--a-ink)" : undefined }}>{row?.title || p.title}</span></td>
                      <td data-label="Индексация">{row?.noindex ? <span className="a-badge is-off">noindex</span> : row && !row.in_sitemap ? <span className="a-badge">вне sitemap</span> : <span className="a-badge s-done">открыта</span>}</td>
                      <td data-label="" style={{ textAlign: "right" }}><button className="a-btn is-ghost is-small" type="button" onClick={() => setEdit(p)} style={{ position: "relative", zIndex: 1 }}>{row ? "Изменить" : "Настроить"}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {edit && <SeoForm page={edit} row={saved[edit.path]} onClose={() => setEdit(null)} />}
    </>
  );
}

function SeoForm({ page, row, onClose }: { page: PageInfo; row?: SeoRow; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY, ...(row ?? {}), path: page.path });
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const title = form.title || page.title;
  const description = form.description || page.description;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal title={`SEO: ${page.label}`} onClose={onClose}>
      <div className="a-grid a-grid-side">
        <div className="a-card a-form">
          {error && <div className="a-error">{error}</div>}
          <label className="a-field">
            <span>Title <span className={title.length > 60 ? "a-over" : "faint"}>· {title.length}/60</span></span>
            <input className="a-input" value={form.title} placeholder={page.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="a-field">
            <span>Description <span className={description.length > 160 ? "a-over" : "faint"}>· {description.length}/160</span></span>
            <textarea className="a-input" rows={3} style={{ minHeight: 0 }} value={form.description} placeholder={page.description || "Не задано — поисковик возьмёт текст со страницы"} onChange={(e) => set("description", e.target.value)} />
          </label>
          <div className="a-field">
            <span>Картинка для соцсетей (1200×630)</span>
            {form.og_image ? <ImageInput value={{ src: form.og_image }} onChange={(v) => set("og_image", v.src)} /> : <ImageInput value={{ src: "/figma/home/hero-desktop.jpg" }} onChange={(v) => set("og_image", v.src)} />}
            {form.og_image && <button type="button" className="a-mini" style={{ alignSelf: "flex-start" }} onClick={() => set("og_image", "")}>Убрать картинку</button>}
          </div>
          <label className="a-field"><span>Canonical</span><input className="a-input" value={form.canonical} placeholder={`https://foodfox.yuri.guru${page.path}`} onChange={(e) => set("canonical", e.target.value)} /></label>
          <div className="a-row">
            <div className="a-field"><span>Закрыть от индексации (noindex)</span><Toggle checked={form.noindex} label="noindex" onChange={(v) => set("noindex", v)} /></div>
            <div className="a-field"><span>Включать в sitemap.xml</span><Toggle checked={form.in_sitemap} label="sitemap" onChange={(v) => set("in_sitemap", v)} /></div>
          </div>
          <div className="a-actions">
            <button className="a-btn" type="button" disabled={pending} onClick={() => start(async () => {
              const r = await saveSeo(form as SeoRow);
              if (!r.ok) { setError(r.message ?? "Ошибка"); return; }
              router.refresh();
              onClose();
            })}>{pending ? "Сохраняем…" : "Сохранить"}</button>
            <button className="a-btn is-ghost" type="button" onClick={onClose}>Отмена</button>
          </div>
        </div>
        <div className="a-card">
          <div className="a-label" style={{ marginBottom: 12 }}>Так страница выглядит в поиске</div>
          <div className="a-snippet">
            <small>foodfox.yuri.guru › {page.path.split("/").filter(Boolean).join(" › ") || ""}</small>
            <b>{title.length > 60 ? `${title.slice(0, 58)}…` : title}</b>
            <p>{description ? (description.length > 160 ? `${description.slice(0, 157)}…` : description) : "Описание не задано: поисковик подберёт фрагмент текста со страницы."}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
