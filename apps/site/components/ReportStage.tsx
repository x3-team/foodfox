"use client";

import { useState } from "react";

const PAGES = [
  { title: "Молочная группа", text: "Казеин, молоко и сыворотка — отдельные строки." },
  { title: "Злаки", text: "Пшеница, рожь и овёс не складываются в один «глютен»." },
  { title: "Сводка зон", text: "Низкий, средний и повышенный — с названием, не только цветом." },
];

const UML = [
  { cls: "low", title: "Низкий", value: "< 10 U/mL", text: "Можно оставить в рационе." },
  { cls: "mid", title: "Средний", value: "10–20 U/mL", text: "Ротация и наблюдение." },
  { cls: "high", title: "Повышенный", value: "> 20 U/mL", text: "Временное исключение, не запрет навсегда." },
];

export function ReportStage() {
  const [page, setPage] = useState(0);
  const [turn, setTurn] = useState(false);

  function go(next: number) {
    if (next < 0 || next >= PAGES.length || next === page) return;
    setTurn(true);
    window.setTimeout(() => {
      setPage(next);
      setTurn(false);
    }, 520);
  }

  return (
    <div>
      <div className="flip" data-report-flip>
        <div className={`flip-page${turn ? " is-turning" : ""}`}>
          <img src="/blog/cover-report.png" alt="" />
          <div>
            <p>Страница {page + 1} из {PAGES.length}</p>
            <h3>{PAGES[page].title}</h3>
            <p>{PAGES[page].text}</p>
          </div>
        </div>
        <div className="flip-nav">
          <button type="button" className="page-btn arrow" aria-label="Предыдущая страница отчёта" onClick={() => go(page - 1)} disabled={page === 0}>
            <img src="/icons/arrow-left.svg" alt="" />
          </button>
          <button type="button" className="page-btn arrow" aria-label="Следующая страница отчёта" onClick={() => go(page + 1)} disabled={page === PAGES.length - 1}>
            <img src="/icons/arrow-right.svg" alt="" />
          </button>
        </div>
      </div>
      <div className="uml" data-uml>
        {UML.map((card) => (
          <article className={`uml-card ${card.cls}`} key={card.title}>
            <h3>{card.title}</h3>
            <strong>{card.value}</strong>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
