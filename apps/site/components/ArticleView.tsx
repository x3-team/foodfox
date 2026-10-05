"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  DISCLAIMER,
  UPDATED,
  articles,
  authorBySlug,
  categoryLabel,
  type Article,
  type Block,
} from "@/lib/content";

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
            <figure className="figure reveal" key={index}>
              <img src={block.src} alt="" />
              <figcaption>{block.caption}</figcaption>
            </figure>
          );
        if (block.type === "table")
          return (
            <div className="table-wrap reveal" key={index}>
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
            </div>
          );
        if (block.type === "quote")
          return (
            <blockquote className="quote reveal" key={index}>
              <p>«{block.text}»</p>
              <cite>{block.by}</cite>
            </blockquote>
          );
        return (
          <aside className="article-cta reveal" key={index}>
            <img className="bokeh" src="/blog/footer-bokeh.png" alt="" />
            <div className="shade" />
            <h2>{block.title}</h2>
            <p>{block.text}</p>
            <div className="actions">
              <Link className="btn btn-light" href="/contacts">
                {block.primary}
              </Link>
              <Link className="btn btn-ghost" href="/contacts" style={{ color: "var(--paper)", borderColor: "rgba(248,249,246,.35)" }}>
                {block.secondary}
              </Link>
            </div>
          </aside>
        );
      })}
    </>
  );
}

export function ArticleView({ article }: { article: Article }) {
  const author = authorBySlug(article.author)!;
  const headings = article.blocks?.filter((block) => block.type === "h2") ?? [];
  const useToc = headings.length >= 3;
  const [active, setActive] = useState(headings[0] && headings[0].type === "h2" ? headings[0].id : "");
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const sameCategory = articles.filter((item) => item.slug !== article.slug && item.category === article.category);
  const related = [...sameCategory, ...articles.filter((item) => item.slug !== article.slug && item.category !== article.category)].slice(0, 4);
  const more = articles.filter((item) => item.author === author.slug && item.slug !== article.slug).slice(0, 3);

  useEffect(() => {
    const nodes = headings.flatMap((block) => (block.type === "h2" ? [document.getElementById(block.id)] : [])).filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      const body = document.getElementById("article-body");
      const end = document.getElementById("author-end");
      if (body && end) {
        const start = body.getBoundingClientRect().top + window.scrollY;
        const finish = end.getBoundingClientRect().top + window.scrollY;
        const value = (window.scrollY + 120 - start) / Math.max(1, finish - start);
        setProgress(Math.max(0, Math.min(1, value)));
      }
      const marker = [...nodes].reverse().find((node) => node.getBoundingClientRect().top < 160);
      if (marker) setActive(marker.id);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [article.slug]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard can be unavailable */
    }
    setCopied(true);
    setToast(true);
    window.setTimeout(() => setCopied(false), 2000);
    window.setTimeout(() => setToast(false), 2500);
  }

  const lead = article.excerpt;

  return (
    <>
      <Header />
      <div className="progress" aria-hidden>
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <main>
        <article>
          <header className="wrap article-top">
            <p className="crumbs rise">
              <Link href="/blog">Главная</Link>
              <span className="sep">/</span>
              <Link href="/blog">Блог</Link>
              <span className="sep">/</span>
              <span aria-current="page">{article.title.length > 60 ? `${article.title.slice(0, 57)}…` : article.title}</span>
            </p>
            <div className="article-meta rise rise-d1">
              <span className="tag">{categoryLabel(article.category)}</span>
              <span className="tag">~{article.minutes} минут чтения</span>
              <span className="tag">Обновлено {UPDATED}</span>
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
          <div className="wrap article-grid">
            <nav className="toc" aria-label="Содержание">
              {useToc && (
                <>
                  <p>Содержание</p>
                  <i
                    className="toc-marker"
                    style={{
                      height: 36,
                      transform: `translateY(${Math.max(0, headings.findIndex((b) => b.type === "h2" && b.id === active)) * 36}px)`,
                    }}
                  />
                  {headings.map(
                    (block) =>
                      block.type === "h2" && (
                        <a key={block.id} href={`#${block.id}`} className={active === block.id ? "is-active" : ""}>
                          {block.text}
                        </a>
                      ),
                  )}
                </>
              )}
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
                  <strong style={{ color: "var(--ink)" }}>Дисклеймер. </strong>
                  {DISCLAIMER}
                </p>
              </aside>
              <div className="share">
                <span>Поделиться</span>
                <button type="button" onClick={copyLink} aria-label="Скопировать ссылку">
                  {copied ? "✓" : "↗"}
                </button>
              </div>
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
            </div>
            <aside className="aside">
              <div className="aside-card">
                <img className="bokeh" src="/blog/footer-bokeh.png" alt="" />
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
                {(more.length ? more : related).slice(0, 3).map((item) => (
                  <Link key={item.slug} href={`/blog/${item.slug}`}>
                    {item.title}
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </article>
        <section className="wrap related">
          <div className="related-head">
            <h2>Также рекомендуем</h2>
            <Link className="text-link" href="/blog">
              Все материалы <img src="/icons/arrow-right.svg" alt="" />
            </Link>
          </div>
          <div className="grid">
            {related.map((item, index) => (
              <ArticleCard key={item.slug} article={item} index={index} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
      {toast && (
        <div className="toast" role="status">
          Ссылка скопирована
        </div>
      )}
    </>
  );
}
