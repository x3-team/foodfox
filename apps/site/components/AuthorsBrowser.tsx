"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RevealNoScript, usePress, useReveal } from "@/components/ArticleCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ROLE_FILTERS, articles, authors, materialsWord } from "@/lib/content";

// U1 (1081:2214): the filter lives in the URL (?role=doctors).
const ROLE_PARAM: Record<string, string> = {
  doctor: "doctors",
  nutritionist: "nutritionists",
  degree: "degree",
  lecturer: "lecturers",
  editorial: "editorial",
};

function plural(n: number, one: string, few: string, many: string) {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
  return many;
}

function filterAuthors(role: string) {
  const filtered = authors.filter((author) => author.listed !== false && (role === "all" || author.roles.includes(role as never)));
  return [...filtered].sort((a, b) => Number(b.slug === "svetlana-kanevskaya") - Number(a.slug === "svetlana-kanevskaya"));
}

export function AuthorsBrowser() {
  const [role, setRole] = useState("all");
  const list = useMemo(() => filterAuthors(role), [role]);
  // Cards on screen: the new list plus the ones that are still fading out (opacity + scale .96, then removed).
  const [shown, setShown] = useState(list);
  const [leaving, setLeaving] = useState<string[]>([]);
  const gridRef = useRef<HTMLElement>(null);
  const rects = useRef(new Map<string, DOMRect>());
  const [filtered, setFiltered] = useState(false);
  // C1 / U03: cards enter row by row at 85% of the viewport (opacity, y 32→0, 600 мс, stagger 80 мс), once;
  // after a role switch the new cards come in the faster 400 мс variant (C3).
  useReveal(gridRef, shown.map((author) => author.slug).join("|"), { fast: filtered });
  usePress(gridRef, ".author-card");
  // M49 (phone): the role chips stick under the header while the grid scrolls. The whole head is the sticky box (the
  // chip row alone would be stuck only inside the head); it is lifted by the height above the chips, so only the
  // chip row stays on screen.
  const headRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const head = headRef.current;
    const row = head?.querySelector<HTMLElement>(".filter-row");
    if (!head || !row) return;
    const sync = () => head.style.setProperty("--fr-off", `${row.offsetTop - 8}px`);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("role");
    const id = Object.keys(ROLE_PARAM).find((key) => ROLE_PARAM[key] === value);
    if (id) {
      setRole(id);
      setShown(filterAuthors(id));
    }
  }, []);

  function snapshot() {
    rects.current.clear();
    gridRef.current?.querySelectorAll<HTMLElement>("[data-author]").forEach((node) => {
      rects.current.set(node.dataset.author!, node.getBoundingClientRect());
    });
  }

  function pick(id: string) {
    if (id === role) return;
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("role");
    else url.searchParams.set("role", ROLE_PARAM[id]);
    window.history.replaceState(window.history.state, "", url);
    const next = filterAuthors(id);
    setRole(id);
    setFiltered(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gone = shown.filter((author) => !next.some((item) => item.slug === author.slug)).map((author) => author.slug);
    if (reduce || !gone.length) {
      if (reduce) rects.current.clear();
      else snapshot();
      setLeaving([]);
      setShown(next);
      return;
    }
    setLeaving(gone);
    window.setTimeout(() => {
      snapshot();
      setLeaving([]);
      setShown(next);
    }, 200);
  }

  // C3 / U02: cards that stay slide from their old place to the new one — 400 мс power2.inOut (M49 phone: 240 мс);
  // new cards are left to useReveal (opacity + y, 400 мс). Reduced motion: instant re-order (no FLIP).
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || !rects.current.size) return;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    grid.querySelectorAll<HTMLElement>("[data-author]").forEach((node) => {
      const before = rects.current.get(node.dataset.author!);
      if (!before) return;
      node.classList.add("is-shown", "is-instant");
      const after = node.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (dx || dy) {
        node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: phone ? 240 : 400, easing: "cubic-bezier(.45, 0, .55, 1)" });
      }
    });
    rects.current.clear();
  }, [shown]);

  const countLabel =
    role === "doctor"
      ? `${list.length} ${plural(list.length, "врач", "врача", "врачей")}`
      : `${list.length} ${plural(list.length, "автор", "автора", "авторов")}`;
  const prevLabel = useRef<string | null>(null);
  const countSwap = prevLabel.current !== null && prevLabel.current !== countLabel;
  useEffect(() => {
    prevLabel.current = countLabel;
  }, [countLabel]);

  return (
    <>
      <Header />
      <RevealNoScript />
      <main className="blog-page blog-authors">
        <section className="wrap authors-head" data-s="au01" ref={headRef}>
          <p className="crumbs rise">
            <Link href="/">Главная</Link>
            <span className="sep">/</span>
            <Link href="/blog">Блог</Link>
            <span className="sep">/</span>
            <span aria-current="page">Авторы</span>
          </p>
          <div className="hero-row">
            <h1 className="rise rise-d1">Авторы блога</h1>
            <div className="intro">
              <p className="rise rise-d2">
                Врачи и нутрициологи, которые готовят материалы. Каждый автор — практикующий специалист с указанной квалификацией; научный редактор проверяет текст.
              </p>
              <Link className="text-link rise rise-d3" href="/contacts">
                Как мы проверяем материалы <img src="/icons/arrow-right.svg" alt="" />
              </Link>
            </div>
          </div>
          <div className="filter-row rise rise-d4">
            <div className="chips">
              {ROLE_FILTERS.map((item) => (
                <button key={item.id} className={`chip${role === item.id ? " is-active" : ""}`} aria-pressed={role === item.id} onClick={() => pick(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            {/* M49 (phone): the counter's new value slides up; C3 (desktop): it just changes (CSS). */}
            <p className="meta-line" aria-live="polite"><span key={countLabel} className={`meta-count${countSwap ? " is-swap" : ""}`}>{countLabel}</span></p>
          </div>
        </section>
        {/* No data-s here: the cards enter one by one (useReveal), not as one block with the global section entrance. */}
        <section className="wrap author-grid" ref={gridRef}>
          {shown.map((author) => (
            <Link
              key={author.slug}
              href={`/blog/authors/${author.slug}`}
              className={`author-card rv${leaving.includes(author.slug) ? " is-leaving" : ""}`}
              data-author={author.slug}
            >
              <div className="shot">
                <img src={author.portrait} alt="" />
                {/* U1: hover — the same round arrow as on article cards. */}
                <span className="hover-arrow" aria-hidden>
                  <img src="/icons/arrow-up-right.svg" alt="" />
                </span>
              </div>
              <div>
                <h2>{author.name}</h2>
                <p>{author.role}</p>
                <div className="tags" style={{ marginTop: 12 }}>
                  <span className="tag">{articles.filter((item) => item.author === author.slug).length} {materialsWord(articles.filter((item) => item.author === author.slug).length)}</span>
                  {author.lecturer && <span className="tag">{author.lecturer}</span>}
                </div>
              </div>
            </Link>
          ))}
        </section>
        <section className="wrap cta-band" data-s="au03">
          <article className="cta">
            <img className="bokeh" src="/figma/course/cta-bg.webp" srcSet="/figma/course/cta-bg.webp 1024w, /figma/course/cta-bg@2x.webp 2048w, /figma/course/cta-bg@3x.webp 2880w" sizes="100vw" alt="" />
            <div className="shade" />
            <div>
              <h2>Работаете с пациентами? Пройдите курс FOX для специалистов</h2>
              <p>6 уроков от лекторов с этой страницы: как устроен тест, как читать отчёт и как применять его в практике. Бесплатно, с сертификатом.</p>
            </div>
            <Link className="btn btn-light" href="/course">
              О курсе
            </Link>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}
