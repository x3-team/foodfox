"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ROLE_FILTERS, articles, authors, materialsWord } from "@/lib/content";

export function AuthorsBrowser() {
  const [role, setRole] = useState("all");
  const list = useMemo(() => {
    const filtered = authors.filter((author) => author.listed !== false && (role === "all" || author.roles.includes(role as never)));
    return [...filtered].sort((a, b) => Number(b.slug === "svetlana-kanevskaya") - Number(a.slug === "svetlana-kanevskaya"));
  }, [role]);

  return (
    <>
      <Header />
      <main>
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
                <button key={item.id} className={`chip${role === item.id ? " is-active" : ""}`} onClick={() => setRole(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="meta-line">
              {list.length}{" "}
              {list.length % 10 === 1 && list.length % 100 !== 11
                ? "автор"
                : list.length % 10 >= 2 && list.length % 10 <= 4 && (list.length % 100 < 10 || list.length % 100 >= 20)
                  ? "автора"
                  : "авторов"}
            </p>
          </div>
        </section>
        <section className="wrap author-grid" data-s="au02">
          {list.map((author) => (
            <Link key={author.slug} href={`/blog/authors/${author.slug}`} className="author-card">
              <div className="shot">
                <img src={author.portrait} alt="" />
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
