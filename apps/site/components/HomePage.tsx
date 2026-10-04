"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { articles } from "@/lib/content";

const SYMPTOMS = [
  {
    id: "gut",
    title: "ЖКТ",
    specialist: "гастроэнтеролог",
    items: ["Вздутие после еды", "Тяжесть в животе", "Боль или спазмы", "Нестабильный стул", "Диарея или запор", "Диагностированный СРК"],
  },
  {
    id: "skin",
    title: "Кожа",
    specialist: "дерматолог",
    items: ["Высыпания", "Акне", "Зуд или покраснение", "Атопический дерматит", "Сухость и шелушение", "Медленное восстановление кожи"],
  },
  {
    id: "weight",
    title: "Вес и отёчность",
    specialist: "эндокринолог",
    items: ["Трудности со снижением веса", "Стойкая отёчность", "Одутловатость лица по утрам"],
  },
  {
    id: "well",
    title: "Общее самочувствие",
    specialist: "терапевт",
    items: ["Постоянная усталость", "Сонливость после еды", "Головные боли", "Нарушения сна", "Перепады настроения"],
  },
];

const SCALE_WORDS = "До 20% людей живут с пищевой непереносимостью и не знают об этом".split(" ");

const DECK = [
  ["Узнайте причину, а не симптомы", "Реакция на продукт проявляется через 3–72 часа. Поэтому связь с едой легко потерять."],
  ["Симптомы маскируются под другие состояния", "Усталость, высыпания и тяжесть после еды часто списывают на стресс, возраст или работу."],
  ["Не предрасположенность, а текущее состояние", "В отличие от генетических тестов, FOX показывает IgG сейчас — и этот снимок может измениться."],
];

const GROUPS = ["Все 286", "Молочные", "Яйца", "Мясо", "Рыба и морепродукты", "Злаки и семена", "Бобовые", "Овощи", "Фрукты", "Орехи", "Специи", "Грибы", "Суперфуды", "Компоненты БАДов"];

const PRODUCTS: Array<{ name: string; group: string; aka?: string[]; compound?: string }> = [
  { name: "Казеин", group: "Молочные", aka: ["bos d 8"] },
  { name: "Альфа-лактальбумин", group: "Молочные" },
  { name: "Бета-лактоглобулин", group: "Молочные" },
  { name: "Коровье молоко", group: "Молочные" },
  { name: "Овечий сыр", group: "Молочные" },
  { name: "Козье молоко", group: "Молочные" },
  { name: "Куриное яйцо, белок", group: "Яйца" },
  { name: "Куриное яйцо, желток", group: "Яйца" },
  { name: "Пшеница", group: "Злаки и семена" },
  { name: "Глютен", group: "Злаки и семена" },
  { name: "Гречка", group: "Злаки и семена", aka: ["гречневая"] },
  { name: "Рис", group: "Злаки и семена" },
  { name: "Овёс", group: "Злаки и семена" },
  { name: "Кукуруза", group: "Злаки и семена" },
  { name: "Соя", group: "Бобовые" },
  { name: "Горох", group: "Бобовые" },
  { name: "Томат", group: "Овощи" },
  { name: "Картофель", group: "Овощи" },
  { name: "Банан", group: "Фрукты" },
  { name: "Яблоко", group: "Фрукты" },
  { name: "Авокадо", group: "Фрукты" },
  { name: "Миндаль", group: "Орехи" },
  { name: "Грецкий орех", group: "Орехи", aka: ["грецкие"] },
  { name: "Кешью", group: "Орехи" },
  { name: "Лосось", group: "Рыба и морепродукты" },
  { name: "Тунец", group: "Рыба и морепродукты" },
  { name: "Креветка", group: "Рыба и морепродукты" },
  { name: "Морской язык", group: "Рыба и морепродукты", aka: ["солея"] },
  { name: "Курица", group: "Мясо" },
  { name: "Индейка", group: "Мясо" },
  { name: "Говядина", group: "Мясо" },
  { name: "Спирулина", group: "Суперфуды" },
  { name: "Хлорелла", group: "Суперфуды" },
  { name: "Семена чиа", group: "Злаки и семена" },
  { name: "Куркума", group: "Специи" },
  { name: "Халва", group: "Компоненты БАДов", compound: "Составной продукт: в панели смотрите кунжут, мёд и сахар отдельно." },
];

const LABS: Array<[string, string]> = [
  ["Ситилаб", "/figma/labs/citilab.svg"],
  ["Гемотест", "/figma/labs/gemotest.svg"],
  ["KDL", "/figma/labs/kdl.svg"],
  ["ДНКОМ", "/figma/labs/dnkom.svg"],
  ["Инвитро", "/figma/labs/invitro.svg"],
  ["CMD", "/figma/labs/cmd.svg"],
  ["Хеликс", "/figma/labs/helix.svg"],
  ["Хромолаб", "/figma/labs/chromolab.png"],
  ["Юнимед", "/figma/labs/unimed.svg"],
];

const REPORT_SLIDES = [
  ["/figma/report/p4.png", "Точные значения", "Уровень IgG в U/mL по каждому продукту."],
  ["/figma/report/p2.png", "Группы продуктов", "13 групп вместо сплошного списка."],
  ["/figma/report/front.png", "Понятная градация", "Сразу видно, что убрать в первую очередь."],
];

let antigenAnimated = false;

const SHOWS = [
  ["286 продуктов", "Весь привычный рацион — от базовых продуктов до редких. За один забор крови."],
  ["13 групп", "Молочные, яйца, мясо, рыба, злаки, бобовые, овощи, фрукты, орехи, специи, грибы, суперфуды и компоненты добавок."],
  ["3 уровня", "Низкий, средний и повышенный IgG. Показывает, что убрать в первую очередь и что вернуть раньше."],
];

const STEPS = [
  ["ШАГ 1", "Выбрать лабораторию", "Тест есть в 9 федеральных сетях. Цену устанавливает лаборатория."],
  ["ШАГ 2", "Сдать кровь", "Без подготовки, без диеты накануне, голодать не нужно."],
  ["ШАГ 3", "Получить отчёт", "Через 7–10 дней. Сам анализ занимает около трёх часов."],
];

const FAQ = [
  ["Чем пищевая непереносимость отличается от пищевой аллергии?", "Аллергия — быстрая реакция с участием IgE: симптомы появляются в течение минут. Реакции, которые оценивает FOX, связаны с IgG и могут проявляться отложенно — через часы или дни. Тест не диагностирует аллергию — результат интерпретирует специалист."],
  ["Насколько надёжен тест FOX?", "В основе мультиплексный ELISA и европейская маркировка IVDR. Результат — карта IgG, её читает специалист."],
  ["Мне уже делали тесты на аллергию. Нужен ли FOX?", "Это разные вопросы. Если симптомы остались, специалист может предложить FOX как отдельный инструмент."],
  ["Нужно ли голодать перед забором крови?", "Нет. Специальной подготовки и диеты накануне не требуется."],
  ["Можно ли доверять IgG-тестам?", "Споры возникают, когда IgG выдают за диагноз. FOX — карта для разговора о рационе, не запрет навсегда."],
  ["Сколько ждать результат?", "7–10 дней. Сам анализ занимает около трёх часов."],
];

const REVIEWS = [
  ["Екатерина Ласковская", "Убирала молочку, потом глютен, потом всё сразу — и каждый раз наугад. Отчёт наконец дал конкретный список. Двух продуктов из него я бы не заподозрила никогда."],
  ["Игорь Потруников", "Списывал всё на возраст и работу: тяжесть после еды, вечная усталость к обеду, вздутие. Отчёт дал точку отсчёта вместо очередной догадки. Убрал три продукта, потом возвращал их по одному."],
];

function pdf(items: string[]) {
  const lines = ["FOX. Spisok dlya priema", ...items.map((item, i) => `${i + 1}. ${item}`), new Date().toLocaleDateString("ru-RU")];
  const escaped = lines.join(" | ").replace(/[()\\]/g, "");
  const stream = `BT /F1 12 Tf 40 560 Td (${escaped.slice(0, 400)}) Tj ET`;
  const body = `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}
endstream
endobj
trailer<</Root 1 0 R>>
%%EOF`;
  const blob = new Blob([body], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "fox-spisok.pdf";
  link.click();
}

export function HomePage() {
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(GROUPS[0]);
  const [picked, setPicked] = useState(PRODUCTS[0]);
  const [count, setCount] = useState(0);
  const [faq, setFaq] = useState(0);
  const [ask, setAsk] = useState(false);
  const [reportPage, setReportPage] = useState(0);
  const scaleRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const austriaRef = useRef<HTMLElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("fox-checker");
    if (saved) setChecked(JSON.parse(saved) as string[]);
  }, []);
  useEffect(() => {
    localStorage.setItem("fox-checker", JSON.stringify(checked));
  }, [checked]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const words = scaleRef.current?.querySelectorAll<HTMLElement>("[data-word]");
    const pin = scaleRef.current;
    const onScroll = () => {
      if (pin && words && !reduce) {
        const rect = pin.getBoundingClientRect();
        const total = pin.offsetHeight - window.innerHeight;
        const progress = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total));
        words.forEach((word, index) => {
          const start = index / words.length;
          const local = Math.min(1, Math.max(0, (progress - start) / (1 / words.length)));
          word.style.filter = `blur(${12 * (1 - local)}px)`;
          word.style.opacity = String(0.18 + 0.82 * local);
        });
      }
      if (!reduce && deckRef.current) {
        const cards = [...deckRef.current.querySelectorAll<HTMLElement>(".deck-card")];
        cards.forEach((card, index) => {
          const next = cards[index + 1];
          if (!next) {
            card.style.transform = "";
            card.style.filter = "";
            card.style.opacity = "1";
            return;
          }
          const overlap = card.getBoundingClientRect().bottom - next.getBoundingClientRect().top;
          const amount = Math.min(1, Math.max(0, overlap / 220));
          card.style.transform = `scale(${1 - 0.06 * amount})`;
          card.style.filter = `blur(${3 * amount}px)`;
          card.style.opacity = String(1 - 0.45 * amount);
        });
      }
      if (!reduce && austriaRef.current) {
        const img = austriaRef.current.querySelector<HTMLElement>("img.parallax");
        if (img) {
          const rect = austriaRef.current.getBoundingClientRect();
          img.style.transform = `translateY(${Math.max(-40, Math.min(40, rect.top * -0.08))}px)`;
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (antigenAnimated) {
      setCount(286);
      return;
    }
    const node = countRef.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      antigenAnimated = true;
      setCount(286);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || antigenAnimated) return;
      antigenAnimated = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 900);
        setCount(Math.round(286 * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.disconnect();
    });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const row = reviewsRef.current;
    if (!row || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stop = false;
    let paused = false;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (stop) return;
      const dt = now - last;
      last = now;
      if (!paused) {
        row.scrollLeft += (dt / 1000) * 48;
        if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 4) row.scrollLeft = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const enter = () => {
      paused = true;
    };
    const leave = () => {
      paused = false;
    };
    row.addEventListener("mouseenter", enter);
    row.addEventListener("mouseleave", leave);
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      row.removeEventListener("mouseenter", enter);
      row.removeEventListener("mouseleave", leave);
    };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((item) => {
      const inGroup = group === "Все 286" || item.group === group;
      if (!inGroup) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || (item.aka ?? []).some((aka) => aka.includes(q));
    });
  }, [query, group]);

  useEffect(() => {
    if (shown.length && !shown.some((item) => item.name === picked.name)) setPicked(shown[0]);
  }, [shown, picked.name]);

  const compound = useMemo(() => PRODUCTS.find((item) => item.compound && (item.name.toLowerCase().includes(query.trim().toLowerCase()) || query.trim().toLowerCase().includes("халв"))), [query]);

  function toggle(label: string) {
    setChecked((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]));
  }

  const ready = checked.length >= 2;
  const lead = SYMPTOMS.map((item) => ({ ...item, n: item.items.filter((label) => checked.includes(label)).length })).sort((a, b) => b.n - a.n)[0];

  return (
    <>
      <Header />
      <main>
        <section className="dark-hero" data-s="s01">
          <img className="bg" src="/blog/cover-lactose.png" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <h1 className="page-title" style={{ color: "white", maxWidth: "16em" }}>
              Узнайте, какие продукты не подходят именно вам
            </h1>
            <p className="lead" style={{ color: "rgba(248,249,246,.75)" }}>
              Персональный тест питания против болей в животе, вздутия, акне и других симптомов.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <Link className="btn btn-light" href="/labs#zapis">Записаться на тест</Link>
              <Link className="btn btn-ghost" href="/report" style={{ color: "white", borderColor: "rgba(248,249,246,.35)" }}>Пример отчёта</Link>
            </div>
            <div className="facts">
              <div><strong>1 сеанс</strong><span>сдачи крови</span></div>
              <div><strong>286</strong><span>продуктов</span></div>
              <div><strong>7–10</strong><span>дней до результата</span></div>
            </div>
          </div>
        </section>

        <section className="lab-marquee" data-s="s02" aria-label="Лаборатории">
          <p className="meta-line">Тест доступен в лабораториях:</p>
          <div className="marquee" data-allow-x>
            <div>
              {[...LABS, ...LABS].map(([name, slug], index) => (
                <Link key={`${slug}-${index}`} href="/labs">
                  <img className="lab-logo" src={slug} alt="" />
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="scale" id="scale" ref={scaleRef} data-scale data-s="s03">
          <div className="scale-pin">
            <h2 className="page-title">
              {SCALE_WORDS.map((word, index) => (
                <span data-word key={`${word}-${index}`}>{word} </span>
              ))}
            </h2>
          </div>
        </section>

        <section className="wrap deck" ref={deckRef} data-deck data-s="s04">
          {DECK.map(([title, text], index) => (
            <article className="deck-card" key={title} style={{ top: 96 + index * 12 }}>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="symptom-band" data-s="s05">
          <div className="wrap">
            <h2 className="page-title" style={{ color: "white" }}>Симптомы, при которых стоит обсудить тест со специалистом</h2>
            <div className="cards-4" style={{ marginTop: 28 }}>
              {[
                ["Кожные реакции", "Высыпания, экзема, дерматиты и зуд", "/figma/symptoms/s7.png"],
                ["Проблемы с ЖКТ", "Вздутие, газообразование, диарея, тошнота, спазмы", "/figma/symptoms/s12.png"],
                ["Самочувствие", "Усталость, слабость, тяжесть после еды, сон", "/figma/symptoms/s10.png"],
                ["Вес и отёчность", "Трудно снизить вес, стойкая отёчность, отёки лица", "/figma/symptoms/s6.png"],
              ].map(([title, text, src]) => (
                <article className="sym-card" key={title}>
                  <img src={src} alt="" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <p className="lead" style={{ color: "rgba(248,249,246,.7)" }}>
              Тест также обсуждают со специалистом при аутоиммунных заболеваниях — как часть комплексной работы с питанием. Тест не ставит диагноз.
            </p>
          </div>
        </section>

        <section className="wrap band checker" id="checker" data-s="s06">
          <p className="meta-line">Чекер симптомов · около минуты</p>
          <h2 className="page-title">Отметьте, что беспокоит вас последние 4 недели</h2>
          <p className="lead">Интерактивный список — не диагноз и не оценка риска. Он поможет собрать мысли перед консультацией.</p>
          <div className="checker-grid">
            <div className="symptom-groups">
              {SYMPTOMS.map((groupItem) => {
                const n = groupItem.items.filter((item) => checked.includes(item)).length;
                return (
                  <div className="symptom-group" key={groupItem.id}>
                    <h3>{groupItem.title} <span>{n} из {groupItem.items.length}</span></h3>
                    {groupItem.items.map((item) => (
                      <label className={`check-row${checked.includes(item) ? " is-on" : ""}`} key={item}>
                        <input type="checkbox" checked={checked.includes(item)} onChange={() => toggle(item)} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
            <aside className="panel checker-card">
              <h3>{ready ? `С чего начать: ${lead.specialist}` : checked.length === 1 ? "Отметьте ещё один признак" : "Пока ничего не отмечено"}</h3>
              <p>{ready ? "Нутрициолог подключается следом. Это не диагноз и не оценка риска." : "Порог — два признака. До него кнопка списка неактивна."}</p>
              {ready && (
                <div>
                  <h3>Что взять на приём</h3>
                  <ul>{checked.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              <button className="btn btn-dark" type="button" disabled={!ready} onClick={() => pdf(checked)}>Скачать список</button>
              <Link className="btn btn-ghost" href="/labs">Где сдать тест</Link>
            </aside>
          </div>
        </section>

        <section className="shows-band" data-s="s07" id="chto-pokazyvaet">
          <div className="orbit" aria-hidden>
            <span className="orbit-ring r1" />
            <span className="orbit-ring r2" />
            <i className="orbit-dot" style={{ left: "14%", top: "22%" }} />
            <i className="orbit-dot" style={{ left: "22%", top: "68%" }} />
            <i className="orbit-dot" style={{ right: "30%", top: "18%" }} />
            <i className="orbit-dot" style={{ right: "12%", bottom: "24%" }} />
          </div>
          <div className="wrap shows">
            <div className="shows-pin">
              <h2 className="page-title">Что показывает тест</h2>
              <div className="dots" aria-hidden>
                {SHOWS.map((_, index) => <i key={index} />)}
              </div>
            </div>
            <div className="shows-cards">
              {SHOWS.map(([title, text], index) => (
                <article className="panel show-card" key={title} style={{ opacity: index === 0 ? 1 : 0.55 }}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap band" data-s="s08">
          <h2 className="page-title">Персональная карта реакций</h2>
          <div className="cards-2" style={{ marginTop: 24 }}>
            <article className="panel">
              <img className="s08-shot" key={reportPage} src={REPORT_SLIDES[reportPage][0]} alt="" />
              <p className="meta-line">Страница {reportPage + 1} из {REPORT_SLIDES.length}</p>
              <h3>{REPORT_SLIDES[reportPage][1]}</h3>
              <p>{REPORT_SLIDES[reportPage][2]}</p>
              <div className="flip-nav">
                <button type="button" className="btn btn-ghost" onClick={() => setReportPage((n) => (n + REPORT_SLIDES.length - 1) % REPORT_SLIDES.length)}>Назад</button>
                <button type="button" className="btn btn-dark" onClick={() => setReportPage((n) => (n + 1) % REPORT_SLIDES.length)}>Дальше</button>
              </div>
            </article>
            <div className="cards-2">
              {["Точные значения", "Индивидуальные рекомендации", "Понятная градация", "Один забор"].map((title) => (
                <article className="panel" key={title}><h3>{title}</h3></article>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap band" id="kak-sdat" data-s="s09">
          <h2 className="page-title">Как сдать тест</h2>
          <div className="cards-3 steps" style={{ marginTop: 24 }}>
            {STEPS.map(([step, title, text]) => (
              <article className="step" key={step}>
                <div className="step-mask" aria-hidden />
                <div className="step-copy">
                  <p>{step}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="wrap band" id="products" data-s="s10" ref={countRef}>
          <h2 className="page-title">Продукты, которые исследует FOX</h2>
          <p className="lead">Самый частый вопрос перед тестом — «а мой продукт там есть?»</p>
          <p className="count-line"><strong data-antigen-count>{count}</strong> пищевых антигенов из 13 групп · один забор крови</p>
          <label className="search" style={{ marginTop: 20, width: "min(640px, 100%)" }}>
            <img src="/icons/search.svg" alt="" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, казеин, гречка или солея" aria-label="Поиск продукта" />
          </label>
          {compound?.compound && query.trim().length > 2 && <p className="hint">{compound.compound}</p>}
          <div className="chips" data-allow-x style={{ marginTop: 16 }}>
            {GROUPS.map((item) => (
              <button key={item} className={`chip${group === item ? " is-active" : ""}`} type="button" onClick={() => setGroup(item)}>{item}</button>
            ))}
          </div>
          <div className="checker-grid">
            <div className="product-picks" data-allow-x>
              {shown.map((item) => (
                <button type="button" className={picked.name === item.name ? "is-on" : ""} key={item.name} onClick={() => setPicked(item)}>
                  {item.name}
                </button>
              ))}
              {shown.length === 0 && <p>В показанной части панели такого запроса нет. Спросите специалиста.</p>}
            </div>
            <article className="panel">
              <h3>{picked.name}</h3>
              <p>{picked.group}. В панели это отдельная позиция, не полка целиком.</p>
              <p>Исключать продукт и подбирать замены стоит только вместе со специалистом — чтобы рацион оставался полноценным.</p>
              <p className="meta-line">Показано {PRODUCTS.length} из 286 · полный состав панели уточняет лаборатория</p>
            </article>
          </div>
        </section>

        <section className="austria" data-s="s11" ref={austriaRef}>
          <img className="parallax" src="/figma/austria/a1.png" alt="" />
          <div className="wrap">
            <h2 className="page-title">Тест разработан в Австрии</h2>
            <p className="lead">FOX разработала компания MacroArray Diagnostics (MADx), Вена. С 2016 года.</p>
            <div className="cards-4" style={{ marginTop: 24 }}>
              {[
                ["CE-IVDR", "Европейский стандарт для медизделий in vitro диагностики", "/certificates"],
                ["ISO 13485", "Качество медицинских изделий", "/certificates"],
                ["ISO 9001", "Система менеджмента качества", "/certificates"],
                ["MADx", "С 2016 года. Вена, Австрия", "/certificates"],
              ].map(([title, text, href]) => (
                <Link className="panel" key={title} href={href}><h3>{title}</h3><p>{text}</p></Link>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap band" data-s="s12">
          <h2 className="page-title">Сдайте тест в любой из 1500+ лабораторий</h2>
          <p className="lead">Цена устанавливается лабораторией. Уточняйте на официальном сайте.</p>
          <div className="lab-grid">
            {LABS.map(([name, slug]) => (
              <Link className="lab-tile" key={slug} href="/labs">
                <img className="lab-logo" src={slug} alt="" />
                {name}
              </Link>
            ))}
            <article className="lab-tile">1500+</article>
          </div>
        </section>

        <section className="wrap band" data-s="s13">
          <h2 className="page-title">Отзывы наших клиентов</h2>
          <div className="review-row" data-allow-x ref={reviewsRef}>
            {[...REVIEWS, ...REVIEWS].map(([name, text], index) => (
              <article className="panel" key={`${name}-${index}`}>
                <img className="review-shot" src={index % 2 === 0 ? "/figma/reviews/r1.png" : "/figma/reviews/r5.png"} alt="" />
                <h3>{name}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <Link className="text-link" href="/reviews">Все отзывы <img src="/icons/arrow-right.svg" alt="" /></Link>
        </section>

        <section className="wrap band" data-s="s14">
          <h2 className="page-title">Блог</h2>
          <div className="cards-4" style={{ marginTop: 24 }}>
            {articles.slice(0, 4).map((article) => (
              <Link className="panel" key={article.slug} href={`/blog/${article.slug}`}>
                <img src={article.cover} alt="" style={{ height: 140, width: "100%", objectFit: "cover", borderRadius: 12 }} />
                <h3>{article.title}</h3>
              </Link>
            ))}
          </div>
        </section>

        <section className="faq-band" data-s="s15">
          <img className="bokeh" src="/figma/symptoms/s7.png" alt="" />
          <div className="shade" />
          <div className="wrap">
          <h2 className="page-title" style={{ color: "white" }}>Частые вопросы</h2>
          <div className="stack" style={{ marginTop: 20 }}>
            {FAQ.map(([q, a], index) => (
              <button key={q} className="acc" aria-expanded={faq === index} onClick={() => setFaq(faq === index ? -1 : index)}>
                <strong>{q}</strong>
                {faq === index && <p>{a}</p>}
              </button>
            ))}
          </div>
          <Link href="/faq" style={{ color: "white" }}>Все вопросы →</Link>
          <div className="panel" style={{ marginTop: 28, background: "rgba(16,20,0,.55)", color: "white" }}>
            <h2>Остались вопросы?</h2>
            <p>Свяжитесь с нами и мы ответим в ближайшее время.</p>
            <button className="btn btn-light" type="button" onClick={() => setAsk(true)}>Связаться</button>
          </div>
          </div>
        </section>
      </main>
      <Footer />
      {ask && (
        <div className="modal-back" onClick={() => setAsk(false)}>
          <form className="modal" role="dialog" aria-label="Связаться" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); setAsk(false); }}>
            <h2>Связаться</h2>
            <label className="field">Имя<input name="name" required /></label>
            <label className="field">Email<input name="email" type="email" required /></label>
            <button className="btn btn-dark" type="submit">Отправить</button>
          </form>
        </div>
      )}
    </>
  );
}
