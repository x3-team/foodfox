"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteArticle, saveArticle } from "@/app/admin/(panel)/blog/actions";
import type { BlogArticle } from "@/lib/cms/blog";
import type { Block, Category } from "@/lib/content";
import { AutoText, ImageInput, Toggle } from "./ContentEditor";
import { Icon } from "./Icon";

type Props = {
  original: BlogArticle | null;
  taken: string[];
  categories: Array<{ id: string; label: string }>;
  authors: Array<{ slug: string; name: string }>;
  tags: string[];
};

const BLOCKS: Array<{ type: Block["type"]; label: string; blank: Block }> = [
  { type: "p", label: "Абзац", blank: { type: "p", text: "" } },
  { type: "h2", label: "Подзаголовок", blank: { type: "h2", id: "", text: "" } },
  { type: "list", label: "Список", blank: { type: "list", items: [] } },
  { type: "callout", label: "Врезка", blank: { type: "callout", title: "", text: "" } },
  { type: "quote", label: "Цитата", blank: { type: "quote", text: "", by: "" } },
  { type: "figure", label: "Картинка", blank: { type: "figure", src: "", caption: "" } },
  { type: "table", label: "Таблица", blank: { type: "table", headers: ["", ""], rows: [] } },
  { type: "cta", label: "Призыв записаться", blank: { type: "cta", title: "Сдайте тест FOX", text: "", primary: "Записаться", secondary: "Найти лабораторию" } },
];
const blockLabel = (type: string) => BLOCKS.find((b) => b.type === type)?.label ?? type;

const LAT: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
export function slugify(text: string) {
  return text.toLowerCase().split("").map((ch) => LAT[ch] ?? ch).join("").replace(/[^a-z0-9]+/g, "-").slice(0, 72).replace(/^-+|-+$/g, "");
}

function textOf(blocks: Block[] = []) {
  return blocks.map((b) => ("text" in b ? b.text : b.type === "list" ? b.items.join(" ") : b.type === "table" ? b.rows.flat().join(" ") : "")).join(" ");
}

export function ArticleEditor({ original, taken, categories, authors, tags }: Props) {
  const router = useRouter();
  const blank: BlogArticle = useMemo(() => ({
    slug: "", title: "", excerpt: "", category: categories[0].id as Category, tags: [], minutes: 5, author: authors[0].slug, cover: "",
    draft: true, blocks: [{ type: "p", text: "" }],
  }), [categories, authors]);
  const start0 = original ?? blank;
  const [a, setA] = useState<BlogArticle>(start0);
  const [slugTouched, setSlugTouched] = useState(Boolean(original));
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const dirty = JSON.stringify(a) !== JSON.stringify(start0);
  const set = (change: Partial<BlogArticle>) => setA((cur) => ({ ...cur, ...change }));
  const say = (text: string, error = false) => { setToast({ text, error }); window.setTimeout(() => setToast(null), error ? 6000 : 2600); };

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const words = textOf(a.blocks).split(/\s+/).filter(Boolean).length;
  const estimate = Math.max(1, Math.round(words / 180));
  const slugBusy = taken.includes(a.slug);
  const slugChanged = original && !original.draft && original.slug !== a.slug;
  const blocks = a.blocks ?? [];
  const setBlock = (index: number, change: Partial<Block>) => set({ blocks: blocks.map((b, i) => (i === index ? ({ ...b, ...change } as Block) : b)) });
  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const next = blocks.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    set({ blocks: next });
  };

  const save = (draft?: boolean) => start(async () => {
    const article = { ...a, ...(draft === undefined ? {} : { draft: draft || undefined }) };
    const r = await saveArticle(original?.slug ?? null, article);
    say(r.message ?? "", !r.ok);
    if (!r.ok) return;
    setA(article);
    if (!original || original.slug !== article.slug) router.replace(`/admin/blog/${article.slug}`);
    else router.refresh();
  });

  return (
    <>
      <div className="a-head">
        <div>
          <h1>{a.title || "Новая статья"}</h1>
          <p>{a.draft ? "Черновик — на сайте не виден" : <>На сайте: <a className="a-link" href={`/blog/${original?.slug ?? a.slug}`} target="_blank" rel="noreferrer">/blog/{original?.slug ?? a.slug} ↗</a></>}</p>
        </div>
        <div className="a-head-actions">
          {original && (
            <button className="a-btn is-ghost" type="button" disabled={pending} onClick={() => window.confirm(`Удалить статью «${original.title}»?`) && start(async () => {
              const r = await deleteArticle(original.slug);
              if (r.ok) router.push("/admin/blog"); else say(r.message ?? "", true);
            })}><Icon name="trash" size={18} /> Удалить</button>
          )}
        </div>
      </div>

      <div className="a-grid a-grid-side">
        <div className="a-stack">
          <section className="a-card">
            <div className="a-form">
              <label className="a-field"><span>Заголовок</span>
                <AutoText value={a.title} label="Заголовок" rows={1} onChange={(title) => set({ title: title.replace(/\n/g, " "), ...(slugTouched ? {} : { slug: slugify(title) }) })} />
              </label>
              <label className="a-field"><span>Анонс — под заголовком и в карточке ленты</span>
                <AutoText value={a.excerpt} label="Анонс" rows={2} onChange={(excerpt) => set({ excerpt })} />
                <small className={a.excerpt.length > 300 ? "a-over" : ""}>{a.excerpt.length} / 300</small>
              </label>
            </div>
          </section>

          <section className="a-card">
            <div className="a-card-head"><h2>Текст статьи</h2><span className="muted">{words} слов · ≈ {estimate} мин</span></div>
            <div className="a-blocks">
              {!blocks.length && <p className="a-note">Блоков пока нет: на сайте под анонсом стоит общий текст про отчёт FOX. Добавьте абзацы и подзаголовки — подзаголовки сами попадут в оглавление.</p>}
              {blocks.map((b, index) => (
                <div className="a-block" key={index}>
                  <div className="a-block-head">
                    <b>{blockLabel(b.type)}</b>
                    <span className="a-edit-tools">
                      <button type="button" className="a-mini" aria-label="Выше" disabled={index === 0} onClick={() => moveBlock(index, index - 1)}>↑</button>
                      <button type="button" className="a-mini" aria-label="Ниже" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, index + 1)}>↓</button>
                      <button type="button" className="a-mini is-danger" onClick={() => set({ blocks: blocks.filter((_, i) => i !== index) })}>Убрать</button>
                    </span>
                  </div>
                  <BlockInput block={b} onChange={(change) => setBlock(index, change)} />
                </div>
              ))}
              <div className="a-block-add">
                <span>Добавить блок</span>
                {BLOCKS.map((b) => (
                  <button key={b.type} type="button" className="a-btn is-ghost is-small" onClick={() => set({ blocks: [...blocks, structuredClone(b.blank)] })}><Icon name="plus" size={14} /> {b.label}</button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="a-card a-sticky">
          <div className="a-form">
            <div className="a-field"><span>Показывать на сайте</span><Toggle checked={!a.draft} label="Показывать на сайте" onChange={(v) => set({ draft: v ? undefined : true })} /></div>
            <div className="a-field"><span>Главная статья ленты /blog</span><Toggle checked={Boolean(a.featured)} label="Главная статья" onChange={(v) => set({ featured: v || undefined })} /><small>Большая карточка над лентой. Главная может быть одна.</small></div>
            <label className="a-field"><span>Адрес</span>
              <div className="a-slug"><span>/blog/</span><input className="a-input" value={a.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }); }} /></div>
              {slugBusy ? <small className="a-over">Такой адрес уже есть</small> : slugChanged ? <small className="a-over">Старая ссылка /blog/{original!.slug} перестанет работать</small> : <small>Латиница, цифры и дефисы</small>}
            </label>
            <div className="a-field"><span>Обложка</span><ImageInput value={{ src: a.cover }} onChange={(img) => set({ cover: img.src })} /></div>
            <div className="a-row">
              <label className="a-field"><span>Рубрика</span>
                <select className="a-input" value={a.category} onChange={(e) => set({ category: e.target.value as Category })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label className="a-field"><span>Минут чтения</span>
                <input className="a-input" type="number" min={1} max={120} value={a.minutes} onChange={(e) => set({ minutes: e.target.valueAsNumber || 1 })} />
                {words > 50 && estimate !== a.minutes && <button type="button" className="a-mini" style={{ alignSelf: "flex-start" }} onClick={() => set({ minutes: estimate })}>по тексту ≈ {estimate}</button>}
              </label>
            </div>
            <label className="a-field"><span>Автор</span>
              <select className="a-input" value={a.author} onChange={(e) => set({ author: e.target.value })}>
                {authors.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
              </select>
            </label>
            <div className="a-field"><span>Теги — фильтры ленты</span><TagInput value={a.tags} suggestions={tags} label="Теги" onChange={(v) => set({ tags: v })} /></div>
            <div className="a-field"><span>Синонимы для поиска</span><TagInput value={a.synonyms ?? []} suggestions={[]} label="Синонимы" onChange={(v) => set({ synonyms: v.length ? v : undefined })} /><small>Слова, по которым статью найдут в поиске блога.</small></div>
          </div>
        </aside>
      </div>

      <div className={`a-savebar${dirty || !original ? " is-on" : ""}`}>
        <span>{original ? "Есть несохранённые изменения" : "Новая статья"}</span>
        <div className="a-actions" style={{ gap: 8 }}>
          {original && <button className="a-btn is-ghost is-small" style={{ color: "#f8f9f6", borderColor: "rgba(248,249,246,.3)" }} type="button" onClick={() => setA(start0)}>Отменить</button>}
          {a.draft && <button className="a-btn is-ghost is-small" style={{ color: "#f8f9f6", borderColor: "rgba(248,249,246,.3)" }} type="button" disabled={pending || slugBusy} onClick={() => save(true)}>Сохранить черновик</button>}
          <button className="a-btn is-lime" type="button" disabled={pending || slugBusy} onClick={() => save(false)}>{pending ? "Сохраняем…" : "Опубликовать"}</button>
        </div>
      </div>
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </>
  );
}

function BlockInput({ block, onChange }: { block: Block; onChange: (change: Partial<Block>) => void }) {
  const input = (label: string, value: string, key: string) => (
    <label className="a-field"><span>{label}</span><input className="a-input" value={value} onChange={(e) => onChange({ [key]: e.target.value } as Partial<Block>)} /></label>
  );
  switch (block.type) {
    case "p": return <AutoText value={block.text} label="Абзац" onChange={(text) => onChange({ text })} />;
    // The anchor for the table of contents follows the text until someone links to it (an existing id stays).
    case "h2": return <input className="a-input" value={block.text} aria-label="Подзаголовок" onChange={(e) => onChange({ text: e.target.value, ...(!block.id || block.id === slugify(block.text).slice(0, 40) ? { id: slugify(e.target.value).slice(0, 40) } : {}) })} />;
    case "list": return (
      <label className="a-field"><span>По пункту на строку</span>
        <AutoText value={block.items.join("\n")} label="Пункты списка" onChange={(v) => onChange({ items: v.split("\n") })} />
      </label>
    );
    case "callout": return <>{input("Заголовок врезки", block.title, "title")}<AutoText value={block.text} label="Текст врезки" rows={2} onChange={(text) => onChange({ text })} /></>;
    case "quote": return <><AutoText value={block.text} label="Цитата" rows={2} onChange={(text) => onChange({ text })} />{input("Чья цитата", block.by, "by")}</>;
    case "figure": return <><ImageInput value={{ src: block.src }} onChange={(img) => onChange({ src: img.src })} />{input("Подпись", block.caption, "caption")}</>;
    case "table": return (
      <>
        <label className="a-field"><span>Заголовки столбцов через «|»</span>
          <input className="a-input" value={block.headers.join(" | ")} onChange={(e) => onChange({ headers: e.target.value.split(/\s*\|\s*/) })} />
        </label>
        <label className="a-field"><span>Строки: по строке таблицы на строку, ячейки через «|»</span>
          <AutoText value={block.rows.map((r) => r.join(" | ")).join("\n")} label="Строки таблицы" onChange={(v) => onChange({ rows: v.split("\n").map((line) => line.split(/\s*\|\s*/)) })} />
        </label>
      </>
    );
    case "cta": return (
      <>
        {input("Заголовок", block.title, "title")}
        <AutoText value={block.text} label="Текст" rows={2} onChange={(text) => onChange({ text })} />
        <div className="a-row">{input("Кнопка (ведёт на /contacts)", block.primary, "primary")}{input("Ссылка (ведёт на /labs)", block.secondary, "secondary")}</div>
      </>
    );
  }
}

function TagInput({ value, suggestions, label, onChange }: { value: string[]; suggestions: string[]; label: string; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const tag = raw.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };
  const rest = suggestions.filter((s) => !value.includes(s));
  return (
    <>
      <div className="a-tag-input">
        {value.map((tag) => <span className="a-tag" key={tag}>{tag}<button type="button" aria-label={`Убрать ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>×</button></span>)}
        <input value={draft} aria-label={label} placeholder={value.length ? "" : "Введите и нажмите Enter"} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1)); }}
          onBlur={() => draft && add(draft)} />
      </div>
      {rest.length > 0 && <div className="a-suggest">{rest.map((s) => <button type="button" key={s} onClick={() => add(s)}>+ {s}</button>)}</div>}
    </>
  );
}
