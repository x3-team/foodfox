"use client";

import { useRef, useState } from "react";

const PAGES = [
  "/figma/report/p4.webp",
  "/figma/report/p2.webp",
  "/figma/report/p4.webp",
];

const MARKERS = [
  { n: 1, title: "Шапка отчёта", text: "Идентификатор пациента, дата, лаборатория, QR на электронную версию", x: 7.4, y: 5.7 },
  { n: 2, title: "Сводка по зонам", text: "Сколько позиций попало в каждую зону", x: 77.8, y: 17.1 },
  { n: 3, title: "Таблица семейства", text: "Название продукта, значение U/mL и шкала реактивности", x: 11.1, y: 42.9 },
  { n: 4, title: "Отдельные белки", text: "Казеин, альфа- и бета-фракции, глютеновые компоненты", x: 55.6, y: 61.4 },
  { n: 5, title: "Контрольные параметры", text: "Внутренние контроли и anti-CCD-канал", x: 14.8, y: 85.7 },
];

const FAQ = [
  {
    q: "Нужно ли исключить всё, что попало в красную и жёлтую зоны?",
    a: "На первом этапе продукты из красной и жёлтой зон временно исключают. Если оставить часть позиций, оценить результат изменения питания будет сложно. Через несколько недель жёлтую зону возвращают по одному. Элиминацию важно проводить с полноценными заменами.",
  },
  {
    q: "Может ли результат FOX измениться со временем?",
    a: "Да. Уровень IgG зависит от состава рациона и частоты употребления продуктов, поэтому повторный тест через несколько месяцев может показать новый профиль.",
  },
  {
    q: "Мне уже делали тесты на аллергию. Нужен ли FOX?",
    a: "Тесты на аллергию смотрят IgE и риск немедленной реакции. FOX измеряет пищеспецифические IgG — это другой вопрос. Результат не заменяет аллергообследование и не оценивает риск анафилаксии.",
  },
  {
    q: "Почему IgG-тесты иногда критикуют?",
    a: "Критикуют попытку поставить диагноз или пожизненный запрет по одному числу. FOX показывает полуколичественный сигнал внутри одного отчёта. Решение остаётся за специалистом, а элиминацию проверяют возвращением продуктов.",
  },
  {
    q: "Нужно ли готовиться к забору крови?",
    a: "Специальной подготовки страница не назначает. Условия забора уточняют в лаборатории-партнёре — от них зависит, как читать контрольные параметры отчёта.",
  },
];

export function ReportViewer() {
  const [page, setPage] = useState(0);
  const [marker, setMarker] = useState(1);
  const [dir, setDir] = useState(0);
  const busy = useRef(false);

  // R02 (Figma note): crossfade 250 мс + 16px shift in the paging direction; clicks are ignored while it runs; ←/→ page.
  function go(next: number) {
    if (busy.current || next < 0 || next >= PAGES.length || next === page) return;
    busy.current = true;
    window.setTimeout(() => { busy.current = false; }, 250);
    setDir(next > page ? 1 : -1);
    setPage(next);
    setMarker(1);
  }

  return (
    <div className="rf-anatomy">
      <div className="rf-viewer" onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); go(page + 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); go(page - 1); }
      }}>
        <div className="rf-sheet">
          <img key={page} className={dir ? (dir > 0 ? "rf-in-next" : "rf-in-prev") : undefined} src={PAGES[page]} alt="" />
          {MARKERS.map((item) => (
            <button
              key={item.n}
              type="button"
              className={`rf-pin${marker === item.n ? " is-on" : ""}`}
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              aria-pressed={marker === item.n}
              onClick={() => setMarker(item.n)}
            >
              {item.n}
            </button>
          ))}
        </div>
        <div className="rf-viewer-nav">
          <button type="button" className="rf-icon-btn" aria-label="Предыдущая страница отчёта" onClick={() => go(page - 1)} disabled={page === 0}>
            <img src="/icons/arrow-left.svg" alt="" width={16} height={16} />
          </button>
          <p>Страница {page + 1} из 3</p>
          <button type="button" className="rf-icon-btn" aria-label="Следующая страница отчёта" onClick={() => go(page + 1)} disabled={page === PAGES.length - 1}>
            <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
          </button>
        </div>
      </div>
      <div className="rf-markers">
        {MARKERS.map((item) => (
          <button key={item.n} type="button" className={`rf-marker${marker === item.n ? " is-on" : ""}`} aria-pressed={marker === item.n} onClick={() => setMarker(item.n)}>
            <span className={`rf-pin${marker === item.n ? " is-on" : ""}`}>{item.n}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReportFaq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" data-s="faq" className="rf-sec rf-faq">
      <span className="rf-num">07</span>
      <h2 className="rf-h2">Частые вопросы</h2>
      <div className="rf-faq-list">
      {FAQ.map((item, index) => {
        const on = open === index;
        return (
          <div className={`rf-faq-item${on ? " is-open" : ""}`} key={item.q}>
            <button type="button" aria-expanded={on} onClick={() => setOpen(on ? -1 : index)}>
              <span>{item.q}</span>
              <img src="/icons/chevron-down.svg" alt="" width={20} height={20} />
            </button>
            {/* S7: one open, height 300 мс, the answer always in the DOM. */}
            <div className="rf-faq-a" inert={!on}><div><p>{item.a}</p></div></div>
          </div>
        );
      })}
      </div>
    </section>
  );
}
