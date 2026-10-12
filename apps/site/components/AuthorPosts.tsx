"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArticleCard, RevealNoScript, useReveal } from "@/components/ArticleCard";
import { CATEGORIES, type Article } from "@/lib/content";

const STEP = 6;

export function AuthorPosts({ posts }: { posts: Article[] }) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(STEP);
  const [leaving, setLeaving] = useState(false);
  const [touched, setTouched] = useState<"" | "filter" | "more">("");
  const gridRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const shown = useMemo(
    () => posts.filter((item) => filter === "all" || item.category === filter),
    [posts, filter],
  );
  useEffect(() => setLimit(STEP), [filter]);
  // R02 / A1: cards enter at 85% of the viewport, stagger 80 мс in a row; after a filter — 400 мс / 60 мс;
  // M50 «Показать ещё» — the new cards come in a cascade (step 60 мс) and focus moves to the first one.
  useReveal(gridRef, `${filter}|${limit}`, { fast: touched !== "", cascade: touched === "more" });
  useEffect(() => {
    // A2: the grid keeps its height while the cards swap, then lets go
    const grid = sectionRef.current;
    if (!grid?.style.minHeight) return;
    const id = window.setTimeout(() => { grid.style.minHeight = ""; }, 760);
    return () => window.clearTimeout(id);
  }, [filter]);
  // R02 = S02: old cards opacity→0 + scale .98 (200 мс), then the new set enters.
  const pick = (id: string) => {
    if (id === filter) return;
    setTouched("filter");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFilter(id);
      return;
    }
    const grid = sectionRef.current;
    if (grid) grid.style.minHeight = `${grid.offsetHeight}px`;
    setLeaving(true);
    window.setTimeout(() => {
      setLeaving(false);
      setFilter(id);
    }, 200);
  };
  const more = () => {
    const from = limit;
    setTouched("more");
    setLimit(limit + STEP);
    window.requestAnimationFrame(() => {
      const cards = [...(gridRef.current?.children ?? [])].slice(from) as HTMLElement[];
      cards[0]?.focus({ preventScroll: true });
    });
  };
  return (
    <section className="wrap related" ref={sectionRef}>
      <RevealNoScript />
      <div className="related-head">
        <h2>{shown.length} публикаций</h2>
        <div className="chips" data-allow-x>
          {CATEGORIES.map((item) => (
            <button key={item.id} type="button" className={`chip${filter === item.id ? " is-active" : ""}`} onClick={() => pick(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`grid${leaving ? " is-leaving" : ""}`} ref={gridRef} key={filter}>
        {shown.slice(0, limit).map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
      {shown.length > limit && (
        <p className="author-more">
          <button type="button" className="btn btn-light" onClick={more}>Показать ещё</button>
        </p>
      )}
    </section>
  );
}

/**
 * M50: «Подписаться» opens the Telegram channel in a new tab; when the visitor comes back to this tab
 * the toast «Вы подписаны» appears (the site cannot see Telegram, so it reacts to the return, not to a confirmed subscription).
 */
export function SubscribeLink({ className, children }: { className: string; children: React.ReactNode }) {
  const pending = useRef(false);
  useEffect(() => {
    const back = () => {
      if (document.visibilityState !== "visible" || !pending.current) return;
      pending.current = false;
      window.dispatchEvent(new CustomEvent("fox:toast", { detail: "Вы подписаны" }));
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, []);
  return (
    <a className={className} href="https://t.me/foxfoodxplorer" target="_blank" rel="noreferrer" onClick={() => { pending.current = true; }}>
      {children}
    </a>
  );
}
