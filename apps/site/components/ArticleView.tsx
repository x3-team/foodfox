"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ArticleCard, RevealNoScript, scrollPageTo, usePress, useReveal } from "@/components/ArticleCard";
import { BottomSheet } from "@/components/BottomSheet";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  DISCLAIMER,
  UPDATED,
  categoryLabel,
  type Article,
  type Block,
} from "@/lib/content";
import { useBlog } from "@/components/ContentProvider";

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "p") return <p key={index}>{block.text}</p>;
        if (block.type === "h2")
          return (
            <h2 id={block.id} key={index}>
              {block.text}
            </h2>
          );
        if (block.type === "list")
          return (
            <ul key={index}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        if (block.type === "callout")
          return (
            <aside className="callout" key={index}>
              <strong>{block.title}</strong>
              <p>{block.text}</p>
            </aside>
          );
        if (block.type === "figure")
          return (
            <figure className="figure rv rv-24" key={index}>
              <img src={block.src} alt="" />
              <figcaption>{block.caption}</figcaption>
            </figure>
          );
        if (block.type === "table")
          return (
            <TableBlock key={index}>
              <table>
                <thead>
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.join()}>
                      {row.map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableBlock>
          );
        if (block.type === "quote")
          return (
            <blockquote className="quote rv rv-24" key={index}>
              <p>«{block.text}»</p>
              <cite>{block.by}</cite>
            </blockquote>
          );
        return (
          <aside className="article-cta rv rv-24" key={index}>
            <img className="bokeh" src="/figma/course/cta-bg.webp" srcSet="/figma/course/cta-bg.webp 1024w, /figma/course/cta-bg@2x.webp 2048w, /figma/course/cta-bg@3x.webp 2880w" sizes="100vw" alt="" />
            <div className="shade" />
            <h2>{block.title}</h2>
            <p>{block.text}</p>
            <div className="actions">
              <Link className="btn btn-light" href="/contacts">
                {block.primary}
              </Link>
              {/* Article / CTA (1070:256): the second action is a Link / Arrow, not an outlined button. */}
              <Link className="text-link cta-arrow" href="/labs">
                {block.secondary} <img src="/icons/arrow-right-light.svg" alt="" />
              </Link>
            </div>
          </aside>
        );
      })}
    </>
  );
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
// «12 августа 2026» → «12.08.2026» (mobile meta line in 1313:5686).
function dotDate(value: string) {
  const [day, month, year] = value.split(" ");
  const index = MONTHS.indexOf(month);
  return index < 0 ? value : `${day.padStart(2, "0")}.${String(index + 1).padStart(2, "0")}.${year}`;
}

export function ArticleView({ article }: { article: Article }) {
  const { articles, authorBySlug } = useBlog();
  const author = authorBySlug(article.author)!;
  const headings = article.blocks?.filter((block) => block.type === "h2") ?? [];
  const useToc = headings.length >= 3;
  const [active, setActive] = useState(headings[0] && headings[0].type === "h2" ? headings[0].id : "");
  const [toast, setToast] = useState<"" | "in" | "out">("");
  const toastTimers = useRef<number[]>([]);
  const [copied, setCopied] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLElement>(null);
  // B3: a click on a ToC item makes it active at once and freezes the marker until the scroll ends (it used to run
  // through every item in between during the smooth scroll). `end` — native smooth scroll, held until it settles;
  // otherwise the lock covers the 400 мс scripted scroll of M01.
  // After the jump the clicked item stays active until the reader scrolls on their own (a short section would
  // otherwise hand the marker to the next heading, which also sits above the 40% line).
  const tocLock = useRef<{ id: string; until: number; end: boolean; idle?: boolean } | null>(null);
  const pinToc = (id: string, ms: number, end: boolean) => {
    tocLock.current = { id, until: performance.now() + ms, end };
    setActive(id);
  };
  const [marker, setMarker] = useState({ top: 0, height: 0 });
  const [slide, setSlide] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const barRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const relatedRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);
  // B4: images, table, callout quote and CTA enter at 80% of the viewport (opacity + y 24, 600 мс), once.
  // Paragraphs never wait. A04: «Также рекомендуем» enters like the feed (S04).
  useReveal(bodyRef, article.slug, { line: 0.8 });
  useReveal(relatedRef, article.slug);
  usePress(relatedRef, ".card");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);  const sameCategory = articles.filter((item) => item.slug !== article.slug && item.category === article.category);
  const related = [...sameCategory, ...articles.filter((item) => item.slug !== article.slug && item.category !== article.category)].slice(0, 4);
  const more = articles.filter((item) => item.author === author.slug && item.slug !== article.slug).slice(0, 3);
  // Aside / Read next (1070:299): three editor picks — report guide, first-signs article, labs; the current
  // article is never linked to itself, its slot falls back to a material of the same category.
  const firstSigns = articles.find((item) => item.slug === "pervye-priznaki-pishchevoy-neperenosimosti");
  const fallback = [...more, ...related].find((item) => item.slug !== firstSigns?.slug);
  const readNext = [
    { href: "/report", title: "Как читать отчёт FOX: три зоны реактивности" },
    firstSigns && firstSigns.slug !== article.slug
      ? { href: `/blog/${firstSigns.slug}`, title: "Первые признаки пищевой непереносимости" }
      : fallback && { href: `/blog/${fallback.slug}`, title: fallback.title },
    { href: "/labs", title: "Где сдать тест: 1500+ лабораторий" },
  ].filter(Boolean) as Array<{ href: string; title: string }>;

  // B1 progress + B3 active heading + B7 aside CTA in one rAF-throttled pass — no React render per scroll event:
  // the bar is written straight to the DOM (scaleX, no transition — it follows the scroll), the active item
  // re-renders only when it changes.
  useEffect(() => {
    const nodes = headings.flatMap((block) => (block.type === "h2" ? [document.getElementById(block.id)] : [])).filter(Boolean) as HTMLElement[];
    const body = document.getElementById("article-body");
    const end = document.getElementById("author-end");
    const card = asideRef.current;
    const cover = document.querySelector<HTMLElement>(".article-cover");
    let frame = 0;
    let lastActive = "";
    let lastOff: boolean | null = null;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (body && end && barRef.current) {
        const start = body.getBoundingClientRect().top + y;
        const finish = end.getBoundingClientRect().top + y;
        const value = Math.max(0, Math.min(1, (y + 120 - start) / Math.max(1, finish - start)));
        barRef.current.style.transform = `scaleX(${value})`;
      }
      // B3: the active item switches when its heading crosses 40% of the viewport (IO rootMargin −120px 0 −60% 0).
      const hit = [...nodes].reverse().find((node) => node.getBoundingClientRect().top < window.innerHeight * 0.4);
      let id = hit ? hit.id : nodes[0]?.id ?? "";
      const lock = tocLock.current;
      if (lock && (lock.idle || performance.now() < lock.until)) id = lock.id;
      else if (lock && !lock.end) {
        // scripted 400 мс scroll is over — hold the item until the reader's own scroll
        lock.idle = true;
        id = lock.id;
      } else tocLock.current = null;
      if (id !== lastActive) {
        lastActive = id;
        setActive(id);
      }
      // B7: the sticky aside CTA shows up once the cover has gone by and hides when the author block is < 200 px away
      // (it would repeat that block's CTA). Only where the aside is sticky (desktop); below 1101 it sits under the text.
      if (card && end && cover && card.parentElement && getComputedStyle(card.parentElement).position === "sticky") {
        const off = cover.getBoundingClientRect().bottom > window.innerHeight * 0.5 || end.getBoundingClientRect().top - card.getBoundingClientRect().bottom < 200;
        if (off !== lastOff) {
          lastOff = off;
          card.classList.toggle("is-off", off);
        }
      } else if (card && lastOff !== false) {
        lastOff = false;
        card.classList.remove("is-off");
      }
    };
    // The end of the native smooth scroll = no scroll event for 160 мс (`scrollend` also fires mid-way here).
    let quiet = 0;
    const settle = () => {
      const lock = tocLock.current;
      if (lock?.end) {
        lock.end = false;
        lock.idle = true;
        lock.until = performance.now();
      }
    };
    const onScroll = () => {
      const lock = tocLock.current;
      if (lock?.idle && performance.now() > lock.until + 100) tocLock.current = null;
      if (lock?.end) {
        window.clearTimeout(quiet);
        quiet = window.setTimeout(settle, 160);
      }
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(quiet);
      window.removeEventListener("resize", onScroll);
    };
  }, [article.slug]);

  // ToC / Item (1063:159): the lime marker follows the active item. Items wrap to 1–2 lines, so measure them.
  useEffect(() => {
    const measure = () => {
      const link = tocRef.current?.querySelector<HTMLElement>(`a[href="#${active}"]`);
      if (link) setMarker({ top: link.offsetTop, height: link.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  useEffect(() => {
    const node = railRef.current;
    if (!node) return;
    const onScroll = () => {
      const cards = [...node.children] as HTMLElement[];
      if (!cards.length) return;
      let best = 0;
      let dist = Infinity;
      cards.forEach((card, index) => {
        const delta = Math.abs(card.offsetLeft - node.scrollLeft);
        if (delta < dist) {
          dist = delta;
          best = index;
        }
      });
      setSlide(best);
    };
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [article.slug, related.length]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard can be unavailable */
    }
    setCopied(true);
    // B6: toast in (opacity + y 12→0, 200 мс), auto-hide after 2.5 с with a 150 мс exit; a second copy restarts it.
    toastTimers.current.forEach((id) => window.clearTimeout(id));
    setToast("in");
    toastTimers.current = [
      window.setTimeout(() => setCopied(false), 2000),
      window.setTimeout(() => setToast("out"), 2500),
      window.setTimeout(() => setToast(""), 2650),
    ];
  }

  const shareUrl = `https://foodfox.yuri.guru/blog/${article.slug}`;
  // Share / Bar (Figma 1076:645 under the TOC, 1313:5686 after the article body): Telegram, VK, copy link.
  const shareBar = (
    <div className="art-share">
      <span>Поделиться</span>
      <div>
        <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`} target="_blank" rel="noreferrer" aria-label="Поделиться в Telegram"><img src="/icons/share/telegram.svg" alt="" /></a>
        <a href={`https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" aria-label="Поделиться во ВКонтакте"><img src="/icons/share/vk.svg" alt="" /></a>
        <button type="button" onClick={copyLink} aria-label="Скопировать ссылку" className={copied ? "is-copied" : undefined}><img src="/icons/share/copy.svg" alt="" /></button>
      </div>
    </div>
  );
  const lead = article.excerpt;
  const tocItems = headings.flatMap((block) => (block.type === "h2" ? [block] : []));
  const tocIndex = Math.max(0, tocItems.findIndex((block) => block.id === active));

  return (
    <>
      <Header />
      <RevealNoScript />
      <div className="progress" aria-hidden>
        <span ref={barRef} />
      </div>
      <main className="blog-page blog-article">
        {/* Mobile frame 1313:5686: collapsed sticky contents bar under the progress line. */}
        {useToc && (
          <div className={`art-toc-m${tocOpen ? " is-open" : ""}`}>
            <button type="button" aria-expanded={tocOpen} onClick={() => setTocOpen((value) => !value)}>
              <span>
                <small>Содержание · {tocIndex + 1} из {tocItems.length}</small>
                <strong>{tocItems[tocIndex]?.text}</strong>
              </span>
              <img src="/icons/chevron-down.svg" alt="" />
            </button>
            {tocOpen && phone && (
              // M01: on the phone the contents open as a bottom sheet (slide-up 320 мс, scrim 45%, swipe down / tap to close);
              // a tap on a section closes it and scrolls smoothly to the heading.
              <BottomSheet label="Содержание статьи" className="art-toc-sheet" onClose={() => setTocOpen(false)} portal>
                <p className="art-toc-sheet-h">Содержание</p>
                <nav aria-label="Содержание статьи">
                  {tocItems.map((block) => (
                    <a
                      key={block.id}
                      href={"#" + block.id}
                      className={active === block.id ? "is-active" : ""}
                      onClick={(event) => {
                        event.preventDefault();
                        setTocOpen(false);
                        pinToc(block.id, 450, false);
                        window.history.replaceState(null, "", "#" + block.id);
                        // M01: 400 мс to the heading, which stops under the sticky contents bar (its scroll-margin).
                        const heading = document.getElementById(block.id);
                        if (heading) scrollPageTo(heading.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(heading).scrollMarginTop) || 0));
                      }}
                    >
                      {block.text}
                    </a>
                  ))}
                </nav>
              </BottomSheet>
            )}
            {tocOpen && !phone && (
              <nav aria-label="Содержание статьи">
                {headings.map(
                  (block) =>
                    block.type === "h2" && (
                      <a key={block.id} href={`#${block.id}`} className={active === block.id ? "is-active" : ""} onClick={() => { setTocOpen(false); pinToc(block.id, 2000, true); }}>
                        {block.text}
                      </a>
                    ),
                )}
              </nav>
            )}
          </div>
        )}
        <article>
          <header className="wrap article-top">
            <p className="crumbs rise">
              <Link href="/">Главная</Link>
              <span className="sep">/</span>
              <Link href="/blog">Блог</Link>
              <span className="sep">/</span>
              <span aria-current="page">{article.title.length > 60 ? `${article.title.slice(0, 57)}…` : article.title}</span>
            </p>
            <div className="article-meta rise rise-d1">
              <span className="tag">{categoryLabel(article.category)}</span>
              <span className="tag">~{article.minutes} минут чтения</span>
              <span className="tag art-date-tag">Обновлено {UPDATED}</span>
              <span className="art-date-m">Обновлено {dotDate(UPDATED)}</span>
            </div>
            <h1 className="rise rise-d2">{article.title}</h1>
            <Link href={`/blog/authors/${author.slug}`} className="author rise rise-d3">
              <img className="avatar m" src={author.avatar} alt="" />
              <span>
                <strong style={{ fontSize: 16 }}>{author.name}</strong>
                <span className="role">{author.role}</span>
              </span>
            </Link>
          </header>
          <div className="wrap">
            <div className="article-cover">
              <img src={article.cover} alt="" />
            </div>
          </div>
          <div className="wrap article-grid" ref={bodyRef}>
            <nav className="toc" aria-label="Содержание" ref={tocRef}>
              {useToc && (
                <>
                  <p>Содержание</p>
                  <i
                    className="toc-marker"
                    style={{ top: 0, height: marker.height, transform: `translateY(${marker.top}px)` }}
                  />
                  {headings.map(
                    (block) =>
                      block.type === "h2" && (
                        <a key={block.id} href={`#${block.id}`} className={active === block.id ? "is-active" : ""} onClick={() => pinToc(block.id, 2000, true)}>
                          {block.text}
                        </a>
                      ),
                  )}
                </>
              )}
              <div className="art-share-d">{shareBar}</div>
            </nav>
            <div className="prose" id="article-body">
              <p className="dek">{lead}</p>
              {article.blocks ? (
                <Blocks blocks={article.blocks} />
              ) : (
                <>
                  <h2 id="sut">В чём суть</h2>
                  <p>
                    {article.excerpt} Материал готовит {author.name}. Уровни в отчёте FOX называются как есть: низкий, средний и повышенный IgG. Повышенный уровень — не запрет навсегда и не диагноз.
                  </p>
                  <h2 id="chto-delat">Что с этим делать</h2>
                  <p>
                    Решение о рационе принимает специалист вместе с человеком. Тест не заменяет приём и не отвечает на вопрос об аллергии: аллергия — это IgE и быстрая реакция, FOX смотрит пищеспецифические IgG.
                  </p>
                  <h2 id="granitsy">Границы</h2>
                  <p>
                    Если симптомы сильные, появились внезапно или сопровождаются потерей веса — начинать нужно с очного приёма. Цена теста устанавливается лабораторией и в этой статье не публикуется.
                  </p>
                </>
              )}
              <aside className="disclaimer">
                <p>
                  <strong style={{ color: "var(--ink)" }}>Дисклеймер<span className="d-only">.</span> </strong>
                  {DISCLAIMER}
                </p>
              </aside>
              <div className="author-block" id="author-end">
                <img className="avatar l" src={author.avatar} alt="" />
                <div>
                  <h2>{author.name}</h2>
                  <p>{author.role}{author.slug === "kseniya-ellinskaya" ? " · 21 год клинической практики" : ""}</p>
                  <p>{author.bio}</p>
                  <p>
                    <Link className="text-link" href={`/blog/authors/${author.slug}`}>
                      Все статьи автора ({articles.filter((item) => item.author === author.slug).length}) <img src="/icons/arrow-right.svg" alt="" />
                    </Link>
                  </p>
                </div>
              </div>
              <div className="art-share-m"><p>Поделиться статьёй</p>{shareBar}</div>
            </div>
            <aside className="aside">
              <div className="aside-card is-off" ref={asideRef}>
                <img className="bokeh" src="/figma/course/cta-bg.webp" srcSet="/figma/course/cta-bg.webp 1024w, /figma/course/cta-bg@2x.webp 2048w, /figma/course/cta-bg@3x.webp 2880w" sizes="100vw" alt="" />
                <div className="shade" />
                <h2>Записаться на тест</h2>
                <p>286 продуктов, один забор крови, результат через 7–10 дней. Стоимость устанавливает лаборатория.</p>
                <div className="actions">
                  <Link className="btn btn-light" href="/contacts">
                    Выбрать лабораторию
                  </Link>
                </div>
              </div>
              <div className="next-reads">
                <h2>Читать дальше</h2>
                {readNext.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <span>{item.title}</span>
                    <img src="/icons/arrow-right.svg" alt="" />
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </article>
        <section className="wrap related article-related" ref={relatedRef}>
          <div className="related-head">
            <h2>Также рекомендуем</h2>
            <Link className="text-link" href="/blog">
              Все материалы <img src="/icons/arrow-right.svg" alt="" />
            </Link>
          </div>
          <div className="grid rv-g" data-allow-x ref={railRef}>
            {related.map((item, index) => (
              <ArticleCard key={item.slug} article={item} index={index} />
            ))}
          </div>
          <p className="related-count">{slide + 1} / {related.length}</p>
          <div className="related-dots" aria-hidden="true">
            {related.map((item, index) => (
              <i key={item.slug} className={index === slide ? "is-on" : ""} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
      {toast && (
        <div className={`toast art-toast${toast === "out" ? " is-out" : ""}`} role="status" aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8.5L6.5 12L13 4.5" stroke="#E7F551" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ссылка скопирована
        </div>
      )}
    </>
  );
}

/**
 * M02: a table wider than the phone lives in its own scroller (the next column peeks out). Under it — «← свайпните →»;
 * the hint fades out (200 мс) after the first horizontal swipe and is not shown again in this session.
 */
function TableBlock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<"off" | "on" | "gone">("off");
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let seen = false;
    try { seen = sessionStorage.getItem("fox-table-swipe") === "1"; } catch { /* storage blocked */ }
    const wide = () => node.scrollWidth > node.clientWidth + 4;
    if (!seen && wide()) setHint("on");
    const onScroll = () => {
      if (node.scrollLeft < 8) return;
      node.removeEventListener("scroll", onScroll);
      try { sessionStorage.setItem("fox-table-swipe", "1"); } catch { /* storage blocked */ }
      setHint((value) => (value === "on" ? "gone" : value));
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="table-block rv rv-24">
      <div className="table-wrap" ref={ref}>{children}</div>
      {hint !== "off" && <p className={`table-swipe${hint === "gone" ? " is-gone" : ""}`} aria-hidden="true">← свайпните →</p>}
    </div>
  );
}
