"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { CATEGORIES, type Article } from "@/lib/content";

const STEP = 6;

export function AuthorPosts({ posts }: { posts: Article[] }) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(STEP);
  const gridRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(
    () => posts.filter((item) => filter === "all" || item.category === filter),
    [posts, filter],
  );
  useEffect(() => setLimit(STEP), [filter]);
  // M50: pagination is replaced by «Показать ещё»; new cards come in a cascade and focus moves to the first one.
  const more = () => {
    const from = limit;
    setLimit(limit + STEP);
    window.requestAnimationFrame(() => {
      const cards = [...(gridRef.current?.children ?? [])].slice(from) as HTMLElement[];
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cards.forEach((card, index) => card.animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: reduce ? 100 : 300, delay: reduce ? 0 : index * 60, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
      const link = cards[0]?.querySelector<HTMLElement>("a");
      link?.focus({ preventScroll: true });
    });
  };
  return (
    <section className="wrap related">
      <div className="related-head">
        <h2>{shown.length} публикаций</h2>
        <div className="chips" data-allow-x>
          {CATEGORIES.map((item) => (
            <button key={item.id} type="button" className={`chip${filter === item.id ? " is-active" : ""}`} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid" ref={gridRef}>
        {shown.slice(0, limit).map((article, index) => (
          <ArticleCard key={article.slug} article={article} index={index} />
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
