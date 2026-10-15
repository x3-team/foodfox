"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArticleCard, RevealNoScript, SkeletonGrid, scrollPageTo, usePress, useReveal } from "@/components/ArticleCard";
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
// power2.inOut — FLIP of the cards that stay (A2 / U02)
const FLIP_EASE = "cubic-bezier(.45, 0, .55, 1)";

function feedList(category: string, tags: string[], query: string) {
  return articles.filter((article) => {
    if (category !== "all" && article.category !== category) return false;
    if (tags.length && !tags.every((tag) => article.tags.includes(tag))) return false;
    return matchesQuery(article, query);
  });
}

function pageSlice(category: string, tags: string[], query: string, page: number) {
  const featured = category === "all" && tags.length === 0 && !query.trim();
  const list = feedList(category, tags, query).filter((article) => (featured ? !article.featured : true));
  const total = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safe = Math.min(page, total);
  return list.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE);
}

function pageList(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "…"> = [1];
  if (current > 3) items.push("…");
  for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n++) items.push(n);
  if (current < total - 2) items.push("…");
  items.push(total);
  return items;
}

/**
 * The URL filters (?category, ?tag, ?q, ?page) are read by this tiny child inside its own Suspense boundary, so the
 * rest of the feed is rendered on the server (static HTML of the full feed, entrance from the first paint) instead of
 * the whole page bailing out to client rendering because of useSearchParams.
 */
function SearchParamsSync({ onChange }: { onChange: (value: URLSearchParams) => void }) {
  const search = useSearchParams();
  const value = search.toString();
  useEffect(() => onChange(new URLSearchParams(value)), [value, onChange]);
  return null;
}

export function BlogFeed() {
  const router = useRouter();
  const [params, setParams] = useState(() => new URLSearchParams());
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
  // A2: cards fading out (opacity→0 + scale .98, 200 мс) — keyed by the list they belong to, so they come back
  // only if that list is still on screen.
  const [out, setOut] = useState<{ list: string; slugs: string[] | "all" } | null>(null);
  const [fast, setFast] = useState(false);
  // S02: the tapped chip fills right away (150 мс), not after the 200 мс fade-out and the URL update.
  const [pendingCat, setPendingCat] = useState<string | null>(null);
  useEffect(() => setPendingCat(null), [category]);
  const shownCat = pendingCat ?? category;
  const [expanded, setExpanded] = useState(false);
  const flipRects = useRef<Map<string, DOMRect> | null>(null);
  const holdTimer = useRef(0);
  const [skeleton, setSkeleton] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  // Phone (≤767): M05 / M06 / M07 differ from the desktop notes (A2 / A6) — suggestions from 2 characters, cards
  // leave in 120 мс.
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const minSuggest = phone ? 2 : 3;

  useEffect(() => setDraftQuery(query), [query]);
  useEffect(() => setDraftTags(tags), [tags.join("|")]);

  useEffect(() => {
    const id = window.setTimeout(() => setSuggestQuery(draftQuery), 250);
    return () => window.clearTimeout(id);
  }, [draftQuery]);

  // Esc закрывает меню тегов (подсказки поиска закрываются в onKeyDown поля)
  useEffect(() => {
    if (!tagOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTagOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tagOpen]);

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

  const filtered = useMemo(() => feedList(category, tags, query), [category, tags.join("|"), query]);

  const showFeatured = category === "all" && tags.length === 0 && !query.trim();
  const gridArticles = filtered.filter((article) => (showFeatured ? !article.featured : true));
  const totalPages = Math.max(1, Math.ceil(gridArticles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = gridArticles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const listKey = `${category}|${tags.join(",")}|${query}|${safePage}`;
  // The grid is rebuilt (fresh entrance for every card) unless only the tags changed — then cards keep their nodes and FLIP.
  const gridKey = `${category}|${query}|${safePage}`;
  const outSlugs = out && out.list === listKey ? out.slugs : null;

  // A1 / S04: cards enter when they cross 85% of the viewport, stagger 80 мс in a row, once.
  // After a filter or a page change: 400 мс, stagger 60 мс (A2).
  // M07 «Показать ещё» (phone): the next cards come in a cascade, step 60 мс.
  useReveal(gridRef, `${listKey}|${skeleton}|${expanded}`, { fast: fast || expanded, cascade: expanded });
  usePress(gridRef, ".card");

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const rects = flipRects.current;
    flipRects.current = null;
    if (grid && grid.style.minHeight) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(() => { grid.style.minHeight = ""; }, 760);
    }
    if (!grid || !rects) return;
    grid.querySelectorAll<HTMLElement>(".card[data-slug]").forEach((card) => {
      const before = rects.get(card.dataset.slug!);
      if (!before) return;
      card.classList.add("is-shown", "is-instant");
      const after = card.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (dx || dy) card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 400, easing: FLIP_EASE });
    });
  }, [listKey]);
  const suggestions = searchTopics(suggestQuery, minSuggest);
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
    // S05: the page buttons first bring the top of the grid into view (smooth, ~400 мс), the crossfade runs meanwhile,
    // then focus goes to the first new card (without another scroll jump).
    // The header comes back while the page scrolls up, so the grid stops under it (not behind it).
    if (scroll && gridRef.current) {
      const header = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 72;
      scrollPageTo(gridRef.current.getBoundingClientRect().top + window.scrollY - header - 16, 400);
    }
    const go = () => {
      router.push(href, { scroll: false });
      if (scroll) {
        window.setTimeout(() => {
          gridRef.current?.querySelector<HTMLElement>("a.card")?.focus({ preventScroll: true });
        }, reduce ? 0 : 420);
      }
    };
    if (reduce) {
      go();
      return;
    }
    const grid = gridRef.current;
    const currentList = listKey;
    // A2: the section keeps its height for the whole swap — the footer does not jump while cards leave and enter.
    if (grid) {
      window.clearTimeout(holdTimer.current);
      grid.style.minHeight = `${grid.offsetHeight}px`;
    }
    // Only the tags change → the cards that stay slide to their new places (FLIP 400 мс), only the others fade out.
    const tagOnly = cat === category && q === query && nextPage === safePage && nextTags.join("|") !== tags.join("|");
    if (tagOnly && grid) {
      const keep = new Set(pageSlice(cat, nextTags, q, nextPage).map((article) => article.slug));
      const rects = new Map<string, DOMRect>();
      grid.querySelectorAll<HTMLElement>(".card[data-slug]").forEach((card) => {
        if (keep.has(card.dataset.slug!)) rects.set(card.dataset.slug!, card.getBoundingClientRect());
      });
      flipRects.current = rects;
      setOut({ list: currentList, slugs: pageItems.filter((article) => !keep.has(article.slug)).map((article) => article.slug) });
    } else {
      flipRects.current = null;
      setOut({ list: currentList, slugs: "all" });
    }
    setFast(true);
    const started = performance.now();
    // A2: the old cards leave in 200 мс (opacity + scale .98); M05 (phone): fade-out 120 мс.
    const leaveMs = window.matchMedia("(max-width: 767px)").matches ? 120 : 200;
    window.setTimeout(() => {
      const slow = performance.now() - started > 300;
      if (slow) setSkeleton(true);
      go();
      if (slow) window.setTimeout(() => setSkeleton(false), 360);
    }, leaveMs);
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
  // M05: the counter's new number slides in — only on a change, never on the first paint.
  const prevCount = useRef<number | null>(null);
  const countSwap = prevCount.current !== null && prevCount.current !== filtered.length;
  useEffect(() => {
    prevCount.current = filtered.length;
  }, [filtered.length]);

  return (
    <>
      <Header />
      <RevealNoScript />
      <Suspense fallback={null}>
        <SearchParamsSync onChange={setParams} />
      </Suspense>
      <main className="blog-page blog-feed">
        <section className="wrap hero" data-s="b01">
          <p className="crumbs rise">
            <Link href="/blog">Главная</Link>
            <span className="sep">/</span>
            <span aria-current="page">Блог</span>
          </p>
          <div className="hero-row">
            <h1 className="rise rise-d1">Блог о пищевой непереносимости</h1>
            <div className="intro">
              <p className="rise rise-d2">Статьи врачей и нутрициологов: как понять свои симптомы, что показывает тест и что делать с результатом.</p>
              <div className="intro-links rise rise-d3">
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
          <div className="filter-row rise rise-d4">
            <div className="chips" role="tablist" aria-label="Категории">
              {CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  className={`chip${shownCat === item.id ? " is-active" : ""}`}
                  aria-pressed={shownCat === item.id}
                  onClick={(event) => {
                    // M05: on the swipeable chip row the tapped chip scrolls into the middle of the row.
                    const row = event.currentTarget.parentElement;
                    if (row && row.scrollWidth > row.clientWidth + 1) {
                      const chip = event.currentTarget;
                      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
                    }
                    if (item.id !== category) setPendingCat(item.id);
                    write({ category: item.id, page: 1 });
                  }}
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
                  {/* F1 (1080:1739): the trigger keeps «Все теги» while tags are on — the choice is in the meta line. */}
                  Все теги
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
                          <i className={`check${on ? " on" : ""}`} />
                          <span className="tag-label">{tag}</span>
                          <span className="count">{count}</span>
                        </button>
                      );
                    })}
                    <div className="popover-foot">
                      <button className="tag-reset" onClick={() => setDraftTags([])}>
                        Сбросить
                      </button>
                      <button
                        className="tag-apply"
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
                      setTagOpen(false);
                      setActiveSuggest(0);
                    }}
                    onFocus={(event) => {
                      setSuggestOpen(true);
                      setTagOpen(false);
                      // M06: on a phone the page turns so the field sits right under the header (room for the
                      // suggestions above the keyboard).
                      if (window.matchMedia("(max-width: 767px)").matches) {
                        const field = event.currentTarget.closest(".search") ?? event.currentTarget;
                        const header = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 64;
                        const top = field.getBoundingClientRect().top - Math.max(0, header) - 12;
                        if (Math.abs(top) > 4) {
                          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                          window.scrollTo({ top: window.scrollY + top, behavior: reduce ? "auto" : "smooth" });
                        }
                      }
                    }}
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
                {suggestOpen && suggestQuery.trim().length >= minSuggest && (
                  <div className="popover suggest-pop" role="listbox">
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
                        <img src="/icons/search.svg" alt="" />
                        {/* F2: «лактаза · фермент» — the hint sits on the same line after a middle dot. */}
                        <span className="suggest-label">{item.hint ? `${item.label} · ${item.hint}` : item.label}</span>
                        <span className="count">{item.count}</span>
                      </button>
                    ))}
                    <button
                      className={`suggest-row suggest-all${activeSuggest === suggestions.length ? " is-active" : ""}`}
                      onClick={() => {
                        setSuggestOpen(false);
                        write({ q: draftQuery, page: 1 });
                      }}
                    >
                      <span>Все результаты по «{suggestQuery.trim()}»</span>
                      <img src="/icons/arrow-right.svg" alt="" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="meta-line rise rise-d4">
            {/* Mobile frame shows only «N материалов»; the update date stays on desktop. Keyed by the count, so a new
                number slides up (M05, phone) instead of just swapping. */}
            <span>
              <span key={filtered.length} className={`meta-count${countSwap ? " is-swap" : ""}`}>{countLabel.split(" · обновлено")[0]}</span>
              {countLabel.includes(" · обновлено") && <span className="d-only"> · обновлено{countLabel.split(" · обновлено")[1]}</span>}
            </span>
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
                <img className="featured-bg" src="/figma/course/hero-bg.webp" srcSet="/figma/course/hero-bg.webp 736w, /figma/course/hero-bg@2x.webp 1472w" sizes="100vw" alt="" />
                <div className="featured-shade" />
                <div className="featured-photo">
                  <img className="photo-in" src={featured.cover} alt="" />
                </div>
                <div className="featured-copy">
                  <div>
                    <div className="tags">
                      <span className="tag tag-lime">
                        <img src="/icons/pin.svg" alt="" /> Закреплено<span className="m-only">&nbsp;· редакция советует</span>
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
            <div className="empty" aria-live="polite">
              <h2>Ничего не нашлось</h2>
              <p>
                {query
                  ? `По запросу «${query}»${category !== "all" || tags.length ? " с выбранными фильтрами" : ""} материалов нет. Попробуйте другую формулировку или сбросьте фильтры.`
                  : "С выбранными фильтрами материалов нет. Сбросьте фильтры, чтобы увидеть ленту."}
              </p>
              {/* F3 (1080:1971): «Сбросить фильтры» drops category and tags but keeps the query
                  (when only a query is set it clears that); «Смотреть все материалы» resets everything. */}
              <div className="empty-actions">
                <button
                  className="btn btn-dark"
                  onClick={() => {
                    setDraftTags([]);
                    if (category === "all" && !tags.length) {
                      setDraftQuery("");
                      write({ q: "", page: 1 });
                    } else write({ category: "all", tag: [], page: 1 });
                  }}
                >
                  Сбросить фильтры
                </button>
                <button
                  className="btn btn-ghost empty-all"
                  onClick={() => {
                    setDraftQuery("");
                    setDraftTags([]);
                    write({ category: "all", tag: [], q: "", page: 1 });
                  }}
                >
                  Смотреть все материалы
                </button>
              </div>
            </div>
          ) : (
            <div key={gridKey} className={`grid blog-grid${outSlugs ? " is-leaving" : ""}${expanded ? " is-more" : ""}`}>
              {pageItems.map((article: Article) => (
                <span key={article.slug} className={outSlugs === "all" || outSlugs?.includes(article.slug) ? "is-out-wrap" : undefined}>
                  <ArticleCard article={article} />
                </span>
              ))}
            </div>
          )}
          {pageItems.length > 4 && !expanded && (
            <button className="btn blog-more" type="button" onClick={() => setExpanded(true)}>Показать ещё</button>
          )}
          {pageItems.length > 0 && (
            <p className="blog-shown">Показано {expanded || pageItems.length <= 4 ? pageItems.length : Math.min(4, pageItems.length)} из {gridArticles.length}</p>
          )}
          {/* M07: when everything is on screen the button gives way to the closing line (phone only). */}
          {pageItems.length > 0 && (expanded || pageItems.length <= 4) && safePage === totalPages && (
            <p className="blog-end">
              Вы дочитали всё — <a href="https://t.me/foxfoodxplorer" target="_blank" rel="noreferrer">подпишитесь на Telegram</a>
            </p>
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
            <img className="bokeh" src="/figma/course/cta-bg.webp" srcSet="/figma/course/cta-bg.webp 1024w, /figma/course/cta-bg@2x.webp 2048w" sizes="100vw" alt="" />
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
    </>
  );
}
