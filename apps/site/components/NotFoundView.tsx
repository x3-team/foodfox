"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "@/app/not-found/frame.css";

const TILES = [
  ["О тесте FOX", "/", "Что измеряет тест и чем он не является"],
  ["Где сдать тест", "/labs", "Сети-партнёры и отделения"],
  ["Как читать отчёт", "/report", "Пример страниц и шкалы"],
  ["Блог", "/blog", "Материалы редакции"],
  ["Вопросы и ответы", "/faq", "Подготовка, сроки, критика IgG"],
  ["Специалистам", "/specialists", "Курс и материалы для приёма"],
];

export function NotFoundView() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.title = "Страница не найдена — FOX Food Xplorer";
    searchRef.current?.focus();
  }, []);
  return (
    <>
      <Header />
      <main>
        <section data-s="e01">
          <div className="wrap e01">
            <h1 className="e-a11y">Страница не найдена</h1>
            <div className="e01-copy">
              <p className="e-badge">Ошибка 404</p>
              <h1>Такой страницы нет</h1>
              <p>Может, ссылка устарела или в адресе опечатка. Поищите по сайту или выберите один из популярных разделов ниже.</p>
              <form
                className="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  router.push(`/blog?q=${encodeURIComponent(q)}`);
                }}
              >
                <img src="/icons/search.svg" alt="" />
                <input ref={searchRef} value={q} onChange={(event) => setQ(event.target.value)} aria-label="Поиск по сайту" placeholder="Например: «где сдать тест в Казани»" />
              </form>
              <div className="e-actions">
                <Link className="btn btn-dark" href="/">На главную</Link>
                <button className="btn btn-ghost" type="button" onClick={() => window.dispatchEvent(new CustomEvent("fox:toast", { detail: "Спасибо, ссылку записали" }))}>Сообщить о битой ссылке</button>
              </div>
            </div>
            <div className="e-plate">
              <img src="/figma/not-found/plate.jpg" alt="" />
              <p className="e-four" aria-hidden>404</p>
              <p className="e-chip">Здесь пусто</p>
            </div>
          </div>
        </section>
        <section data-s="e02">
          <div className="wrap e02">
            <h2>Куда чаще всего идут с этого места</h2>
            <div className="e-tiles">
              {TILES.map(([title, href, text]) => (
                <Link key={href} href={href}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
