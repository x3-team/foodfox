"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveContent } from "@/app/admin/(panel)/content/actions";
import { BLOG_ARTICLES_KEY, type BlogArticle } from "@/lib/cms/blog";
import { Toggle } from "./ContentEditor";

type Props = { list: BlogArticle[]; isDefault: boolean; categories: Array<{ id: string; label: string }>; authors: Record<string, string> };

export function BlogList({ list, categories, authors }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(list);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | "live" | "draft">("all");
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  useEffect(() => setItems(list), [list]);
  const dirty = JSON.stringify(items) !== JSON.stringify(list);
  const label = (id: string) => categories.find((c) => c.id === id)?.label ?? id;
  const say = (text: string, error = false) => { setToast({ text, error }); window.setTimeout(() => setToast(null), error ? 6000 : 2600); };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((article, index) => ({ article, index }))
      .filter(({ article }) => (category === "all" || article.category === category)
        && (status === "all" || (status === "draft") === Boolean(article.draft))
        && (!q || `${article.title} ${article.excerpt} ${article.tags.join(" ")} ${article.slug}`.toLowerCase().includes(q)));
  }, [items, query, category, status]);
  const filtering = Boolean(query.trim()) || category !== "all" || status !== "all";

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setItems(next);
  };
  const patch = (index: number, change: Partial<BlogArticle>) => setItems(items.map((a, i) => (i === index ? { ...a, ...change } : a)));

  return (
    <div className="a-stack">
      <div className="a-chips" role="group" aria-label="Статус">
        {([["all", "Все", items.length], ["live", "На сайте", items.filter((a) => !a.draft).length], ["draft", "Черновики", items.filter((a) => a.draft).length]] as const).map(([id, text, n]) => (
          <button key={id} type="button" className="a-chip" aria-current={status === id} onClick={() => setStatus(id)}>{text} <i>{n}</i></button>
        ))}
      </div>
      <div className="a-filters">
        <label className="a-field is-search"><span className="sr">Поиск</span><input className="a-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Заголовок, тег или адрес" /></label>
        <label className="a-field"><span className="sr">Рубрика</span>
          <select className="a-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Все рубрики</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
      </div>
      <section>
        {shown.length ? (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead><tr><th>Статья</th><th>Рубрика</th><th>Автор</th><th>На сайте</th><th></th></tr></thead>
              <tbody>
                {shown.map(({ article: a, index }) => (
                  <tr key={a.slug}>
                    <td className="a-cell-main">
                      <div className="a-article-cell">
                        <img src={a.cover} alt="" loading="lazy" />
                        <div style={{ minWidth: 0 }}>
                          <Link href={`/admin/blog/${a.slug}`}>{a.title}</Link>
                          <span className="sub">/blog/{a.slug} · {a.minutes} мин{a.blocks?.length ? "" : " · текст не заполнен"}</span>
                          <span className="a-badges">
                            {a.featured && !a.draft && <span className="a-badge s-in_progress">Главная в ленте</span>}
                            {a.draft && <span className="a-badge s-spam">Черновик</span>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Рубрика">{label(a.category)}</td>
                    <td data-label="Автор">{authors[a.author] ?? a.author}</td>
                    <td data-label="На сайте" style={{ position: "relative", zIndex: 1 }}><Toggle checked={!a.draft} label={`Показывать «${a.title}»`} onChange={(v) => patch(index, { draft: v ? undefined : true })} /></td>
                    <td data-label="">
                      <div className="a-row-actions" style={{ position: "relative", zIndex: 1, flexWrap: "nowrap", maxWidth: "none" }}>
                        {!filtering && <>
                          <button type="button" className="a-mini" aria-label="Выше" disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
                          <button type="button" className="a-mini" aria-label="Ниже" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>↓</button>
                        </>}
                        <Link className="a-mini" href={`/admin/blog/${a.slug}`}>Изменить</Link>
                        <button type="button" className="a-mini is-danger" onClick={() => window.confirm(`Удалить статью «${a.title}»? Адрес /blog/${a.slug} перестанет открываться.`) && setItems(items.filter((_, i) => i !== index))}>Удалить</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="a-card"><p className="muted">Ничего не нашлось.</p></div>}
      </section>
      {filtering && <p className="faint" style={{ fontSize: 13 }}>Порядок меняется, когда фильтры сброшены.</p>}

      <div className={`a-savebar${dirty ? " is-on" : ""}`}>
        <span>Порядок, видимость или состав статей изменены</span>
        <div className="a-actions" style={{ gap: 8 }}>
          <button className="a-btn is-ghost is-small" style={{ color: "#f8f9f6", borderColor: "rgba(248,249,246,.3)" }} type="button" onClick={() => setItems(list)}>Отменить</button>
          <button className="a-btn is-lime" type="button" disabled={pending} onClick={() => start(async () => {
            const r = await saveContent({ [BLOG_ARTICLES_KEY]: items }, "Блог");
            say(r.message ?? "", !r.ok);
            if (r.ok) router.refresh();
          })}>Сохранить и опубликовать</button>
        </div>
      </div>
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}
