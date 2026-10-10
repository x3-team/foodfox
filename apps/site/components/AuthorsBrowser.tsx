"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gone = shown.filter((author) => !next.some((item) => item.slug === author.slug)).map((author) => author.slug);
    if (reduce || !gone.length) {
      snapshot();
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

  // FLIP: cards that stay slide from their old place to the new one; new cards fade/scale in.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || !rects.current.size) return;
    grid.querySelectorAll<HTMLElement>("[data-author]").forEach((node) => {
      const before = rects.current.get(node.dataset.author!);
      if (!before) {
        node.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 250, easing: "cubic-bezier(.2,.7,.2,1)" });
        return;
      }
      const after = node.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (dx || dy) {
        node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.7,.2,1)" });
      }
    });
    rects.current.clear();
  }, [shown]);

  const countLabel =
    role === "doctor"
      ? `${list.length} ${plural(list.length, "врач", "врача", "врачей")}`
      : `${list.length} ${plural(list.length, "автор", "автора", "авторов")}`;

  return (
    <>
      <Header />
      <main className="blog-page blog-authors">
        <section className="wrap authors-head" data-s="au01">
          <p className="crumbs">
            <Link href="/blog">Главная</Link>
            <span className="sep">/</span>
            <Link href="/blog">Блог</Link>
            <span className="sep">/</span>
            <span aria-current="page">Авторы</span>
          </p>
          <div className="hero-row">
            <h1>Авторы блога</h1>
            <div className="intro">
              <p>
                Врачи и нутрициологи, которые готовят материалы. Каждый автор — практикующий специалист с указанной квалификацией; научный редактор проверяет текст.
              </p>
              <Link className="text-link" href="/contacts">
                Как мы проверяем материалы <img src="/icons/arrow-right.svg" alt="" />
              </Link>
            </div>
          </div>
          <div className="filter-row">
            <div className="chips">
              {ROLE_FILTERS.map((item) => (
                <button key={item.id} className={`chip${role === item.id ? " is-active" : ""}`} aria-pressed={role === item.id} onClick={() => pick(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="meta-line" aria-live="polite">{countLabel}</p>
          </div>
        </section>
        <section className="wrap author-grid" data-s="au02" ref={gridRef}>
          {shown.map((author) => (
            <Link
              key={author.slug}
              href={`/blog/authors/${author.slug}`}
              className={`author-card${leaving.includes(author.slug) ? " is-leaving" : ""}`}
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
            <img className="bokeh" src="/figma/course/cta-bg.webp" alt="" />
            <div className="shade" />
            <div>
              <h2>Работаете с пациентами? Пройдите курс FOX для специалистов</h2>
              <p>6 уроков от лекторов с этой страницы: как устроен тест, как читать отчёт и как применять его в практике. Бесплатно, с сертификатом.</p>
            </div>
            <Link className="btn btn-light" href="/contacts">
              О курсе
            </Link>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}
