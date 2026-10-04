"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const TILES = [
  ["Где сдать тест", "/labs", "/blog/cover-lab.png"],
  ["Как читать отчёт", "/report", "/blog/cover-report.png"],
  ["Блог", "/blog", "/blog/cover-plate.jpg"],
  ["Специалистам", "/specialists", "/blog/cover-story.png"],
];

export function NotFoundView() {
  const router = useRouter();
  const [q, setQ] = useState("");
  useEffect(() => {
    document.title = "Страница не найдена — FOX Food Xplorer";
  }, []);
  return (
    <>
      <Header />
      <main className="wrap band" style={{ minHeight: "70vh" }}>
        <p className="crumbs">404</p>
        <h1 className="page-title">Страница не найдена</h1>
        <p className="lead">Такого адреса нет. Поиск по материалам или один из частых разделов.</p>
        <form
          className="search"
          style={{ marginTop: 20, width: "min(480px, 100%)" }}
          onSubmit={(event) => {
            event.preventDefault();
            router.push(`/blog?q=${encodeURIComponent(q)}`);
          }}
        >
          <img src="/icons/search.svg" alt="" />
          <input value={q} onChange={(event) => setQ(event.target.value)} aria-label="Поиск по сайту" placeholder="Поиск по сайту" />
        </form>
        <h2>Куда чаще всего идут</h2>
        <div className="cards-4">
          {TILES.map(([title, href, src]) => (
            <Link className="panel" key={href} href={href}>
              <img src={src} alt="" style={{ height: 120, width: "100%", objectFit: "cover", borderRadius: 12 }} />
              <h3>{title}</h3>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
