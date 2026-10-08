"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "@/app/not-found/frame.css";

// Figma 1286:1908 E02: tile caption is the route itself; icon on a tinted 52px square.
const TILES = [
  ["О тесте FOX", "/", "play", "#edf3d9"],
  ["Где сдать тест", "/labs", "pin", "#f6fbc8"],
  ["Как читать отчёт", "/report", "file-text", "#fbf0d8"],
  ["Блог", "/blog", "doc", "#d7d8cd"],
  ["Вопросы и ответы", "/faq", "message", "#f8e3de"],
  ["Специалистам", "/specialists", "award", "#d7d8cd"],
];

export function NotFoundView() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [phone, setPhone] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.title = "Страница не найдена — FOX Food Xplorer";
    searchRef.current?.focus();
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return (
    <>
      <Header />
      <main>
        <section data-s="e01">
          <div className="wrap e01">
            <h1 className="e-a11y">Страница не найдена</h1>
            <p className="crumbs e-crumbs"><Link href="/">Главная</Link><span className="sep">/</span><span aria-current="page">404</span></p>
            <div className="e01-copy">
              <p className="e-badge">Ошибка 404</p>
              <h1>Такой страницы нет</h1>
              <p>Может, ссылка устарела или в адресе опечатка. Поищите по сайту или выберите <span className="d-only">один из популярных разделов</span><span className="m-only">раздел</span> ниже.</p>
              <form
                className="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  router.push(`/blog?q=${encodeURIComponent(q)}`);
                }}
              >
                <img src="/icons/search.svg" alt="" />
                <input ref={searchRef} value={q} onChange={(event) => setQ(event.target.value)} aria-label="Поиск по сайту" placeholder={phone ? "Например: где сдать тест" : "Например: «где сдать тест в Казани»"} />
              </form>
              <div className="e-actions">
                <Link className="btn btn-dark" href="/">На главную</Link>
                <button className="btn btn-ghost" type="button" onClick={() => window.dispatchEvent(new CustomEvent("fox:toast", { detail: "Спасибо, ссылку записали" }))}>Сообщить о битой ссылке</button>
              </div>
            </div>
            <div className="e-plate">
              <img src="/figma/not-found/plate.jpg" alt="" />
              <p className="e-four" aria-hidden>404</p>
              <p className="e-chip">Здесь пусто — как на этой тарелке</p>
            </div>
          </div>
        </section>
        <section data-s="e02">
          <div className="wrap e02">
            <h2>Куда чаще всего идут<span className="d-only"> с этого места</span></h2>
            <div className="e-tiles">
              {TILES.map(([title, href, icon, tint]) => (
                <Link key={href} href={href}>
                  <span className="e-ico" style={{ background: `${tint} url(/icons/nf/${icon}.svg) center / 22px no-repeat` }} aria-hidden />
                  <span className="e-txt"><h3>{title}</h3><p>{href}</p></span>
                  <img className="e-arrow" src="/icons/arrow-right.svg" alt="" />
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
