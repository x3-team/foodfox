"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArticleCard, SkeletonGrid } from "@/components/ArticleCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  CATEGORIES,
  TAGS,
  UPDATED,
  articles,
  authorBySlug,
  categoryLabel,
  matchesQuery,
  materialsWord,
  searchTopics,
  type Article,
  type Category,
} from "@/lib/content";

const PAGE_SIZE = 6;

function pageList(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "…"> = [1];
  if (current > 3) items.push("…");
  for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n++) items.push(n);
  if (current < total - 2) items.push("…");
  items.push(total);
  return items;
}

export function BlogFeed() {
  const router = useRouter();
  const params = useSearchParams();
  const category = (params.get("category") as Category | null) ?? "all";
  const tags = (params.get("tag") ?? "").split(",").filter(Boolean);
  const query = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  const [draftQuery, setDraftQuery] = useState(query);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState(query);
  const [activeSuggest, setActiveSuggest] = useState(0);
  const [tagOpen, setTagOpen] = useState(false);
  const [draftTags, setDraftTags] = useState(tags);
  const [leaving, setLeaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [skeleton, setSkeleton] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => setDraftQuery(query), [query]);
  useEffect(() => setDraftTags(tags), [tags.join("|")]);

  useEffect(() => {
    const id = window.setTimeout(() => setSuggestQuery(draftQuery), 250);
    return () => window.clearTimeout(id);
  }, [draftQuery]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSuggestOpen(false);
      if (!tagRef.current?.contains(event.target as Node)) setTagOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const node = ctaRef.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const img = node.querySelector<HTMLElement>(".bokeh");
    if (!img) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const progress = 1 - rect.top / window.innerHeight;
      img.style.setProperty("--shift", `${Math.max(-24, Math.min(0, -24 * progress))}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = useMemo(() => {
    return articles.filter((article) => {
      if (category !== "all" && article.category !== category) return false;
      if (tags.length && !tags.every((tag) => article.tags.includes(tag))) return false;
      return matchesQuery(article, query);
    });
  }, [category, tags.join("|"), query]);

  const showFeatured = category === "all" && tags.length === 0 && !query.trim();
  const gridArticles = filtered.filter((article) => (showFeatured ? !article.featured : true));
  const totalPages = Math.max(1, Math.ceil(gridArticles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = gridArticles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const suggestions = searchTopics(suggestQuery);
  const featured = articles.find((article) => article.featured);
  const featuredAuthor = featured ? authorBySlug(featured.author) : undefined;

  function write(next: { category?: string; tag?: string[]; q?: string; page?: number }, scroll = false) {
    const cat = next.category ?? category;
    const nextTags = next.tag ?? tags;
    const q = next.q ?? query;
    const nextPage = next.page ?? 1;
    const search = new URLSearchParams();
    if (cat !== "all") search.set("category", cat);
    if (nextTags.length) search.set("tag", nextTags.join(","));
    if (q.trim()) search.set("q", q.trim());
    if (nextPage > 1) search.set("page", String(nextPage));
    const href = search.toString() ? `/blog?${search}` : "/blog";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const go = () => {
      router.push(href, { scroll: false });
      if (scroll) {
        gridRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        window.setTimeout(() => {
          gridRef.current?.querySelector<HTMLElement>("a")?.focus();
        }, reduce ? 0 : 420);
      }
    };
    if (reduce) {
      go();
      return;
    }
    setLeaving(true);
    const started = performance.now();
    window.setTimeout(() => {
      const slow = performance.now() - started > 300;
      if (slow) setSkeleton(true);
      go();
      window.setTimeout(() => {
        setSkeleton(false);
        setLeaving(false);
      }, slow ? 360 : 40);
    }, 200);
  }

  const pendingCount = useMemo(() => {
    return articles.filter((article) => {
      if (category !== "all" && article.category !== category) return false;
      if (draftTags.length && !draftTags.every((tag) => article.tags.includes(tag))) return false;
      return matchesQuery(article, query);
    }).length;
  }, [category, draftTags.join("|"), query]);

  const countLabel = (() => {
    const n = filtered.length;
    const base = `${n} ${materialsWord(n)}`;
    if (category === "all" && !tags.length && !query) return `${base} · обновлено ${UPDATED}`;
    const bits = [base];
    if (category !== "all") bits[0] = `${base} в «${categoryLabel(category)}»`;
    if (tags.length) bits.push(`теги: ${tags.join(", ")}`);
    if (query) bits.push(`запрос «${query}»`);
    return bits.join(" · ");
  })();

  const filtersOn = category !== "all" || tags.length > 0 || Boolean(query.trim());

  return (
    <>
      <Header />
      <main>
        <section className="wrap hero" data-s="b01">
          <p className="crumbs rise">
            <Link href="/blog">Главная</Link>
            <span className="sep">/</span>
            <span aria-current="page">Блог</span>
          </p>
          <div className="hero-row">
            <h1 className="rise rise-d1">Блог о пищевой непереносимости</h1>
            <div className="intro rise rise-d2">
              <p>Статьи врачей и нутрициологов: как понять свои симптомы, что показывает тест и что делать с результатом.</p>
              <div className="intro-links">
                <Link className="text-link" href="/blog/authors">
                  Все авторы <img src="/icons/arrow-right.svg" alt="" />
                </Link>
                <a className="text-link" href="https://t.me/foxfoodxplorer" target="_blank" rel="noreferrer">
                  Telegram-канал <img src="/icons/arrow-up-right.svg" alt="" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap filters" data-s="b02" aria-label="Фильтры">
          <div className="filter-row">
            <div className="chips" role="tablist" aria-label="Категории">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  className={`chip${category === item.id ? " is-active" : ""}`}
                  aria-pressed={category === item.id}
                  onClick={() => write({ category: item.id, page: 1 })}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="tools">
              <div className="tag-wrap" ref={tagRef}>
                <button
                  className="tag-trigger"
                  aria-expanded={tagOpen}
                  aria-haspopup="listbox"
                  onClick={() => {
                    setDraftTags(tags);
                    setTagOpen((v) => !v);
                    setSuggestOpen(false);
                  }}
                >
                  {tags.length ? `Теги · ${tags.length}` : "Все теги"}
                  <img src="/icons/chevron-down.svg" alt="" />
                </button>
                {tagOpen && (
                  <div className="popover" role="listbox" aria-label="Теги" aria-multiselectable>
                    {TAGS.map((tag) => {
                      const on = draftTags.includes(tag);
                      const count = articles.filter((a) => a.tags.includes(tag)).length;
                      return (
                        <button
                          key={tag}
                          role="option"
                          aria-selected={on}
                          className="tag-row"
                          onClick={() =>
                            setDraftTags((current) =>
                              current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
                            )
                          }
                        >
                          <span style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <i className={`check${on ? " on" : ""}`} />
                            {tag}
                          </span>
                          <span className="count">{count}</span>
                        </button>
                      );
                    })}
                    <div className="popover-foot">
                      <button className="text-link" onClick={() => setDraftTags([])}>
                        Сбросить
                      </button>
                      <button
                        className="btn btn-dark"
                        onClick={() => {
                          setTagOpen(false);
                          write({ tag: draftTags, page: 1 });
                        }}
                      >
                        Показать {pendingCount} →
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="search-wrap" ref={searchRef}>
                <label className="search">
                  <img src="/icons/search.svg" alt="" />
                  <input
                    value={draftQuery}
                    placeholder="Поиск по статьям"
                    aria-label="Поиск по статьям"
                    aria-expanded={suggestOpen}
                    aria-autocomplete="list"
                    onChange={(event) => {
                      setDraftQuery(event.target.value);
                      setSuggestOpen(true);
                      setActiveSuggest(0);
                    }}
                    onFocus={() => setSuggestOpen(true)}
                    onKeyDown={(event) => {
                      const options = suggestions.length + 1;
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setActiveSuggest((n) => (n + 1) % options);
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveSuggest((n) => (n - 1 + options) % options);
                      } else if (event.key === "Enter") {
                        event.preventDefault();
                        const picked = suggestions[activeSuggest];
                        const next = picked ? picked.label : draftQuery;
                        setSuggestOpen(false);
                        setDraftQuery(next);
                        write({ q: next, page: 1 });
                      } else if (event.key === "Escape") {
                        setDraftQuery("");
                        setSuggestOpen(false);
                        write({ q: "", page: 1 });
                      }
                    }}
                  />
                </label>
                {suggestOpen && suggestQuery.trim().length >= 3 && (
                  <div className="popover" role="listbox">
                    {suggestions.map((item, index) => (
                      <button
                        key={item.label}
                        role="option"
                        className={`suggest-row${index === activeSuggest ? " is-active" : ""}`}
                        onMouseEnter={() => setActiveSuggest(index)}
                        onClick={() => {
                          setDraftQuery(item.label);
                          setSuggestOpen(false);
                          write({ q: item.label, page: 1 });
                        }}
                      >
                        <span>
                          <strong style={{ fontWeight: suggestQuery && item.label.toLowerCase().includes(suggestQuery.toLowerCase()) ? 500 : 400 }}>
                            {item.label}
                          </strong>
                          {item.hint && <em className="hint">{item.hint}</em>}
                        </span>
                        <span className="count">{item.count}</span>
                      </button>
                    ))}
                    <button
                      className={`suggest-row${activeSuggest === suggestions.length ? " is-active" : ""}`}
                      onClick={() => {
                        setSuggestOpen(false);
                        write({ q: draftQuery, page: 1 });
                      }}
                    >
                      <span>Все результаты по «{suggestQuery.trim()}»</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="meta-line">
            <span>{countLabel}</span>
            {filtersOn && (
              <button
                onClick={() => {
                  setDraftQuery("");
                  setDraftTags([]);
                  write({ category: "all", tag: [], q: "", page: 1 });
                }}
              >
                Сбросить фильтры
              </button>
            )}
          </p>
        </section>

        <div className={`wrap featured-slot${showFeatured ? "" : " is-collapsed"}`}>
          <div>
            {featured && featuredAuthor && (
              <Link href={`/blog/${featured.slug}`} className="featured featured-in">
                <img className="featured-bg" src="/blog/featured-bg.png" alt="" />
                <div className="featured-shade" />
                <div className="featured-photo">
                  <img src={featured.cover} alt="" />
                </div>
                <div className="featured-copy">
                  <div>
                    <div className="tags">
                      <span className="tag tag-lime">
                        <img src="/icons/pin.svg" alt="" /> Закреплено
                      </span>
                      <span className="tag tag-dark">~{featured.minutes} минут</span>
                      <span className="tag tag-dark">{categoryLabel(featured.category)}</span>
                    </div>
                    <h2>{featured.title}</h2>
                    <p className="lead">{featured.excerpt}</p>
                  </div>
                  <div className="featured-bottom">
                    <span className="author on-dark">
                      <img className="avatar m" src={featuredAuthor.avatar} alt="" />
                      <span>
                        <strong>{featuredAuthor.name}</strong>
                        <span className="role">{featuredAuthor.role}</span>
                      </span>
                    </span>
                    <span className="text-link read-link">
                      Читать <img src="/icons/arrow-right-light.svg" alt="" />
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        <section className="wrap grid-section" data-s="b03" id="feed" ref={gridRef}>
          {skeleton ? (
            <SkeletonGrid />
          ) : pageItems.length === 0 ? (
            <div className="empty">
              <h2>Ничего не нашлось</h2>
              <p>
                {query
                  ? `По запросу «${query}»${category !== "all" || tags.length ? " с выбранными фильтрами" : ""} материалов нет. Попробуйте другую формулировку или сбросьте фильтры.`
                  : "С выбранными фильтрами материалов нет. Сбросьте фильтры, чтобы увидеть ленту."}
              </p>
              <button
                className="btn btn-dark"
                onClick={() => {
                  setDraftQuery("");
                  setDraftTags([]);
                  write({ category: "all", tag: [], q: "", page: 1 });
                }}
              >
                Смотреть все материалы
              </button>
            </div>
          ) : (
            <div className={`grid blog-grid${leaving ? " is-leaving" : ""}${expanded ? " is-more" : ""}`}>
              {pageItems.map((article: Article, index) => (
                <span key={article.slug} className={leaving ? "is-out-wrap" : undefined}>
                  <ArticleCard article={article} index={index} />
                </span>
              ))}
            </div>
          )}
          {pageItems.length > 4 && !expanded && (
            <button className="btn btn-ghost blog-more" type="button" onClick={() => setExpanded(true)}>Показать ещё</button>
          )}
          {pageItems.length > 0 && (
            <nav className="pager" aria-label="Страницы">
              <button className="page-btn arrow" aria-label="Предыдущая страница" disabled={safePage === 1} onClick={() => write({ page: safePage - 1 }, true)}>
                <img src="/icons/arrow-left.svg" alt="" />
              </button>
              {pageList(safePage, totalPages).map((item, index) =>
                item === "…" ? (
                  <span className="ellipsis" key={`gap-${index}`}>
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    className={`page-btn${item === safePage ? " is-current" : ""}`}
                    aria-current={item === safePage ? "page" : undefined}
                    onClick={() => write({ page: item }, true)}
                  >
                    {item}
                  </button>
                ),
              )}
              <button className="page-btn arrow" aria-label="Следующая страница" disabled={safePage === totalPages} onClick={() => write({ page: safePage + 1 }, true)}>
                <img src="/icons/arrow-right.svg" alt="" />
              </button>
            </nav>
          )}
        </section>

        <section className="wrap cta-band" data-s="b04">
          <article className="cta" ref={ctaRef}>
            <img className="bokeh" src="/blog/footer-bokeh.png" alt="" />
            <div className="shade" />
            <div>
              <h2>Не уверены, что симптомы связаны с едой?</h2>
              <p>Симптом-чекер за 2 минуты соберёт список жалоб для разговора со специалистом. Без регистрации — данные остаются в вашем браузере.</p>
            </div>
            <Link className="btn btn-light" href="/contacts">
              Проверить симптомы
            </Link>
          </article>
        </section>
      </main>
      <Footer />
      <style>{`.is-leaving .card { animation: leave 200ms var(--ease) both; }`}</style>
    </>
  );
}
