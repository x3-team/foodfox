"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { TagInput } from "@/components/admin/ArticleEditor";
import { AutoText, ImageInput, Toggle } from "@/components/admin/ContentEditor";
import { archiveRecipe, saveRecipe, type RecipeInput } from "../actions";

type Product = { name: string; category: string | null };

// "Филе индейки" should find "Индейка": drop the case ending of longer Russian names before matching.
const stem = (name: string) => { const n = name.toLowerCase(); return n.length >= 5 ? n.slice(0, -1) : n; };

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Tools({ index, length, onMove, onRemove, what }: { index: number; length: number; onMove: (to: number) => void; onRemove: () => void; what: string }) {
  return (
    <span className="a-edit-tools">
      <button type="button" className="a-mini" aria-label="Выше" disabled={index === 0} onClick={() => onMove(index - 1)}>↑</button>
      <button type="button" className="a-mini" aria-label="Ниже" disabled={index === length - 1} onClick={() => onMove(index + 1)}>↓</button>
      <button type="button" className="a-mini is-danger" onClick={() => window.confirm(`Удалить ${what}?`) && onRemove()}>Удалить</button>
    </span>
  );
}

/** FOX products of the recipe: what the app compares with the client's zones. Search over the 285 FOX names. */
function FoxPicker({ value, products, onChange }: { value: string[]; products: Product[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const needle = text.trim().toLowerCase();
  const found = needle.length >= 2 ? products.filter((p) => !value.includes(p.name) && p.name.toLowerCase().includes(needle)).slice(0, 12) : [];
  return (
    <>
      <div className="a-tag-input">
        {value.map((name) => <span className="a-tag" key={name}>{name}<button type="button" aria-label={`Убрать ${name}`} onClick={() => onChange(value.filter((t) => t !== name))}>×</button></span>)}
        <input value={text} aria-label="Найти продукт FOX" placeholder={value.length ? "" : "Начните вводить: индейка, рис…"} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (found[0]) { onChange([...value, found[0].name]); setText(""); } } }} />
      </div>
      {found.length > 0 && (
        <div className="a-suggest">
          {found.map((p) => <button type="button" key={p.name} onClick={() => { onChange([...value, p.name]); setText(""); }}>+ {p.name}{p.category ? <span className="faint"> · {p.category}</span> : null}</button>)}
        </div>
      )}
      {needle.length >= 2 && !found.length && <small className="faint">В справочнике FOX такого продукта нет.</small>}
    </>
  );
}

export function RecipeEditor({ id, initial, archived, products, tags }: { id: string; initial: RecipeInput; archived: boolean; products: Product[]; tags: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(initial);
  const [r, setR] = useState(initial);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const dirty = useMemo(() => JSON.stringify(r) !== JSON.stringify(saved), [r, saved]);
  const set = (patch: Partial<RecipeInput>) => setR((x) => ({ ...x, ...patch }));
  const isNew = id === "new";

  // Ingredient lines that look like a FOX product but are not linked: a hint, so the zone check is not forgotten.
  const unlinked = useMemo(() => {
    const names = new Set(r.foxProducts.map((n) => n.toLowerCase()));
    return r.ingredients
      .map((i) => products.find((p) => p.name.length >= 3 && i.name.toLowerCase().includes(stem(p.name))))
      .filter((p): p is Product => Boolean(p) && !names.has(p!.name.toLowerCase()))
      .filter((p, i, list) => list.findIndex((x) => x.name === p.name) === i);
  }, [r.ingredients, r.foxProducts, products]);

  const save = (patch?: Partial<RecipeInput>) => start(async () => {
    const next = { ...r, ...patch };
    const res = await saveRecipe(id, next);
    setMsg({ text: res.message ?? (res.ok ? "Сохранено" : "Ошибка"), error: !res.ok });
    if (!res.ok) return;
    setR(next); setSaved(next);
    if (isNew && res.id) router.replace(`/admin/app/recipes/${res.id}`);
    else router.refresh();
  });

  return (
    <>
      <div className="a-head">
        <div>
          <h1>{r.title || "Новый рецепт"}</h1>
          <p>{archived ? <span className="a-badge is-off">Архив</span> : saved.published ? <span className="a-badge s-done">В приложении</span> : <span className="a-badge">Черновик</span>}
            <span className="muted"> · Изменения видны клиентам при следующем открытии раздела «Рецепты».</span></p>
        </div>
        <div className="a-head-actions">
          {!isNew && !archived && <button className="a-btn is-ghost" type="button" disabled={pending} onClick={() => window.confirm("Убрать рецепт в архив? Он пропадёт из приложения.") && start(async () => { const res = await archiveRecipe(id, true); setMsg({ text: res.message ?? "", error: !res.ok }); router.refresh(); })}>В архив</button>}
          {archived && <button className="a-btn is-ghost" type="button" disabled={pending} onClick={() => start(async () => { const res = await archiveRecipe(id, false); setMsg({ text: res.message ?? "", error: !res.ok }); router.refresh(); })}>Вернуть из архива</button>}
          {!saved.published && !archived && <button className="a-btn is-lime" type="button" disabled={pending} onClick={() => save({ published: true })}>Опубликовать</button>}
        </div>
      </div>
      {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>{msg.text}</div>}

      <div className="a-grid a-grid-side">
        <div className="a-stack">
          <section className="a-card a-form">
            <div className="a-card-head"><h2>Основное</h2></div>
            <label className="a-field"><span>Название</span><input className="a-input" value={r.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="Гречка с кабачком" /></label>
            <label className="a-field"><span>Коротко, для карточки</span><input className="a-input" value={r.description} maxLength={300} onChange={(e) => set({ description: e.target.value })} placeholder="Сытный ужин без глютена" /></label>
            <div className="a-field"><span>Вступление</span><AutoText value={r.lead} label="Вступление" rows={3} onChange={(v) => set({ lead: v })} /></div>
            <div className="a-grid a-grid-4" style={{ gap: 12 }}>
              <label className="a-field"><span>Подготовка</span><input className="a-input" value={r.prepTime} maxLength={30} onChange={(e) => set({ prepTime: e.target.value })} placeholder="15 мин" /></label>
              <label className="a-field"><span>Готовка</span><input className="a-input" value={r.cookTime} maxLength={30} onChange={(e) => set({ cookTime: e.target.value })} placeholder="20 мин" /></label>
              <label className="a-field"><span>Порций</span><input className="a-input" inputMode="numeric" value={r.servings} onChange={(e) => set({ servings: e.target.value.replace(/\D/g, "") })} placeholder="2" /></label>
            </div>
            <div className="a-field"><span>Теги</span><TagInput value={r.tags} suggestions={tags} label="Теги" onChange={(v) => set({ tags: v })} /></div>
          </section>

          <section className="a-card a-form">
            <div className="a-card-head"><h2>Ингредиенты</h2><span className="muted">{r.ingredients.length}</span></div>
            {r.ingredients.map((ing, i) => (
              <div key={i} className="a-row a-ingredient">
                <input className="a-input" value={ing.name} placeholder="Филе индейки" aria-label={`Ингредиент ${i + 1}`} onChange={(e) => set({ ingredients: r.ingredients.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input className="a-input" value={ing.amount} placeholder="300 г" aria-label={`Количество ${i + 1}`} onChange={(e) => set({ ingredients: r.ingredients.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)) })} />
                <Tools index={i} length={r.ingredients.length} what="ингредиент" onMove={(to) => set({ ingredients: move(r.ingredients, i, to) })} onRemove={() => set({ ingredients: r.ingredients.filter((_, j) => j !== i) })} />
              </div>
            ))}
            <button className="a-btn is-ghost is-small" type="button" onClick={() => set({ ingredients: [...r.ingredients, { name: "", amount: "" }] })}>+ Ингредиент</button>
          </section>

          <section className="a-card a-form">
            <div className="a-card-head"><h2>Шаги</h2><span className="muted">{r.steps.length}</span></div>
            <div className="a-list">
              {r.steps.map((s, i) => (
                <div key={i} className="a-list-item">
                  <div className="a-list-head"><b>Шаг {i + 1}</b>
                    <Tools index={i} length={r.steps.length} what="шаг" onMove={(to) => set({ steps: move(r.steps, i, to) })} onRemove={() => set({ steps: r.steps.filter((_, j) => j !== i) })} />
                  </div>
                  <input className="a-input" value={s.title} placeholder="Подготовьте индейку" aria-label={`Заголовок шага ${i + 1}`} onChange={(e) => set({ steps: r.steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                  <AutoText value={s.body} label={`Текст шага ${i + 1}`} rows={3} onChange={(v) => set({ steps: r.steps.map((x, j) => (j === i ? { ...x, body: v } : x)) })} />
                  <details>
                    <summary className="muted">Фото шага{s.imageUrl ? ": выбрано" : " (необязательно)"}</summary>
                    <ImageInput value={{ src: s.imageUrl ?? "" }} onChange={(img) => set({ steps: r.steps.map((x, j) => (j === i ? { ...x, imageUrl: img.src || undefined } : x)) })} />
                    {s.imageUrl && <button type="button" className="a-mini is-danger" onClick={() => set({ steps: r.steps.map((x, j) => (j === i ? { ...x, imageUrl: undefined } : x)) })}>Убрать фото</button>}
                  </details>
                </div>
              ))}
            </div>
            <button className="a-btn is-ghost is-small" type="button" onClick={() => set({ steps: [...r.steps, { title: "", body: "" }] })}>+ Шаг</button>
          </section>

          <section className="a-card a-form">
            <div className="a-card-head"><h2>Советы</h2></div>
            {r.tips.map((t, i) => (
              <div key={i} className="a-row a-ingredient is-tip">
                <AutoText value={t} label={`Совет ${i + 1}`} rows={2} onChange={(v) => set({ tips: r.tips.map((x, j) => (j === i ? v : x)) })} />
                <Tools index={i} length={r.tips.length} what="совет" onMove={(to) => set({ tips: move(r.tips, i, to) })} onRemove={() => set({ tips: r.tips.filter((_, j) => j !== i) })} />
              </div>
            ))}
            <button className="a-btn is-ghost is-small" type="button" onClick={() => set({ tips: [...r.tips, ""] })}>+ Совет</button>
          </section>
        </div>

        <div className="a-stack">
          <section className="a-card a-form">
            <div className="a-card-head"><h2>Публикация</h2></div>
            <div className="a-split-row"><span>Показывать в приложении</span><Toggle checked={r.published} label="Показывать в приложении" onChange={(v) => set({ published: v })} /></div>
            <small className="muted">Для публикации нужны фото и хотя бы один шаг.</small>
          </section>
          <section className="a-card a-form">
            <div className="a-card-head"><h2>Фото</h2></div>
            <ImageInput value={{ src: r.photoUrl }} onChange={(img) => set({ photoUrl: img.src })} />
            <small className="muted">Горизонтальное, от 1200 px по ширине. Загружается в медиатеку сайта.</small>
          </section>
          <section className="a-card a-form">
            <div className="a-card-head"><h2>Продукты FOX</h2><span className="muted">{r.foxProducts.length}</span></div>
            <p className="muted">По ним приложение проверяет рецепт по отчёту клиента: красная зона даёт предупреждение, жёлтая — подсказку про ротацию.</p>
            <FoxPicker value={r.foxProducts} products={products} onChange={(v) => set({ foxProducts: v })} />
            {unlinked.length > 0 && (
              <div className="a-note">В ингредиентах есть {unlinked.map((p) => p.name).join(", ")}, но не в списке.{" "}
                <button type="button" className="a-link" onClick={() => set({ foxProducts: [...r.foxProducts, ...unlinked.map((p) => p.name)] })}>Добавить</button>
              </div>
            )}
            {!r.foxProducts.length && <div className="a-note">Без продуктов рецепт показывается всем как подходящий.</div>}
          </section>
          <section className="a-card">
            <div className="a-card-head"><h2>Карточка в приложении</h2></div>
            <div className="a-recipe-preview">
              {r.photoUrl ? <img src={r.photoUrl} alt="" /> : <div className="a-image-empty">Нет фото</div>}
              <b>{r.title || "Название"}</b>
              <span className="muted">{r.description || "Короткое описание"}</span>
              <span className="a-badges">{r.tags.slice(0, 3).map((t) => <span key={t} className="a-tag">{t}</span>)}</span>
            </div>
          </section>
        </div>
      </div>

      <div className={`a-savebar${dirty ? " is-on" : ""}`}>
        <span>Есть несохранённые изменения</span>
        <div className="a-actions">
          <button className="a-btn is-ghost is-small" type="button" style={{ color: "inherit" }} disabled={pending} onClick={() => setR(saved)}>Отменить</button>
          <button className="a-btn is-lime is-small" type="button" disabled={pending} onClick={() => save()}>{pending ? "Сохраняем…" : isNew ? "Создать" : "Сохранить"}</button>
        </div>
      </div>
    </>
  );
}
