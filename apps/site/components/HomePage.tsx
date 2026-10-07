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
  ["ШАГ 1", "Выбрать лабораторию", "Тест есть в 9 федеральных сетях. Цену устанавливает лаборатория", "/figma/symptoms/s1.png"],
  ["ШАГ 2", "Сдать один анализ", "Без подготовки, без диеты накануне, голодать не нужно", "/figma/symptoms/s4.png"],
  ["ШАГ 3", "Получить результаты", "Через 7–10 дней. Сам анализ занимает около трёх часов", "/figma/symptoms/s5.png"],
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
  const showsRef = useRef<HTMLElement>(null);
  const [showOn, setShowOn] = useState(0);
  const [suggest, setSuggest] = useState(false);
  const [reportPage, setReportPage] = useState(0);
  const [chipsOpen, setChipsOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState("gut");
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
          card.style.borderRadius = `${32 - 8 * amount}px`;
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
    const node = showsRef.current;
    if (!node) return;
    const onScroll = () => {
      const rect = node.getBoundingClientRect();
      const total = Math.max(1, node.offsetHeight - window.innerHeight * 0.5);
      const progress = Math.min(0.999, Math.max(0, -rect.top / total));
      setShowOn(Math.min(SHOWS.length - 1, Math.floor(progress * SHOWS.length)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const row = reviewsRef.current;
    if (!row || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stop = false;
    let paused = false;
    let raf = 0;
    let last = performance.now();
    const track = row.querySelector<HTMLElement>(".review-track");
    let offset = 0;
    const tick = (now: number) => {
      if (stop) return;
      const dt = now - last;
      last = now;
      if (!paused && track) {
        offset += (dt / 1000) * 48;
        const half = track.scrollWidth / 2;
        if (half > 0 && offset >= half) offset -= half;
        track.style.transform = `translate3d(${-offset}px,0,0)`;
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

  return (
    <>
      <Header />
      <main>
        <section className="dark-hero home-hero" data-s="s01">
          <div className="hero-media">
            <picture>
              <source
                media="(max-width: 1100px)"
                srcSet="/figma/home/hero-photo-mobile.webp"
                type="image/webp"
              />
              <source media="(max-width: 1100px)" srcSet="/figma/home/hero-photo-mobile.jpg" />
              <img className="bg" src="/blog/cover-lactose.png" alt="" />
            </picture>
          </div>
          <div className="shade" aria-hidden />
          <div className="wrap inner">
            <div className="hero-top">
              <h1>
                <span className="hero-h1-mobile">Узнайте, какие продукты не подходят именно вам</span>
                <span className="hero-h1-desktop">
                  Узнайте, какие продукты
                  <br />
                  не подходят именно вам
                </span>
              </h1>
              <div className="hero-side">
                <p className="lead">Персональный тест питания против болей в животе, вздутия, акне и других симптомов</p>
                <div className="hero-actions">
                  <button className="btn btn-light hero-book-btn" type="button" onClick={() => window.dispatchEvent(new Event("fox:book"))}>
                    <span>Записаться на тест</span>
                    <span className="hero-book-plus" aria-hidden>+</span>
                  </button>
                  <Link className="hero-report-link" href="/report">
                    Пример отчёта
                  </Link>
                  <Link className="btn btn-ghost hero-report-btn" href="/report">
                    Пример отчёта
                  </Link>
                </div>
              </div>
            </div>
            <div className="facts">
              <div><strong>1 сеанс</strong><span>сдачи крови</span></div>
              <div><strong>286</strong><span>продуктов</span></div>
              <div><strong>7–10</strong><span className="facts-lines"><span>дней до</span><span>результата</span></span></div>
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
          <img className="scale-bubbles" src="/figma/home/bubbles.svg" alt="" />
          <p className="scale-note">¹ Оценка распространённости пищевой непереносимости. Источник — ссылка на исследование (предоставит клиент)</p>
        </section>

        <section className="wrap deck" ref={deckRef} data-deck data-s="s04">
          {DECK.map(([title, text], index) => (
            <article className="deck-card" key={title} style={{ top: 80 + index * 12 }}>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="symptom-band" data-s="s05">
          <div className="wrap">
            <h2 className="page-title">Симптомы, при которых стоит обсудить тест со специалистом</h2>
            <div className="cards-4 sym-row" data-allow-x>
              {[
                ["Кожные реакции", ["Высыпания", "Экзема", "Дерматиты и зуд"], "/figma/symptoms/skin.png"],
                ["Проблемы с ЖКТ", ["Вздутие живота", "Газообразование", "Диарея", "Тошнота", "Спазмы или боли"], "/figma/symptoms/gut.png"],
                ["Самочувствие", ["Хроническая усталость", "Общая слабость", "Тяжесть после еды", "Нарушения сна", "Упадок сил", "Перепады настроения"], "/figma/symptoms/well.png"],
                ["Вес и отёчность", ["Трудно снизить вес", "Стойкая отёчность", "Отёки лица по утрам", "Колебания веса"], "/figma/symptoms/s6.png"],
              ].map(([title, chips, src]) => (
                <article className="sym-card" key={title as string}>
                  <img src={src as string} alt="" />
                  <div className="sym-shade" />
                  <h3>{title as string}</h3>
                  <div className="sym-chips">
                    {(chips as string[]).map((chip) => <span key={chip}>{chip}</span>)}
                  </div>
                </article>
              ))}
            </div>
            <p className="sym-note">
              Тест также обсуждают со специалистом при аутоиммунных заболеваниях — как часть комплексной работы с питанием. Тест не ставит диагноз.
            </p>
          </div>
        </section>

        <section className="wrap band checker" id="checker" data-s="s06">
          <div className="s06-head">
            <div>
              <p className="meta-line">Чекер симптомов · около минуты</p>
              <h2 className="page-title">Отметьте, что беспокоит вас последние 4 недели</h2>
            </div>
            <p className="lead">Интерактивный список — не диагноз и не оценка риска. Он поможет собрать мысли перед консультацией и понять, с какого специалиста удобно начать разговор.</p>
          </div>
          <div className="checker-grid">
            <div className="symptom-groups">
              {SYMPTOMS.map((groupItem) => {
                const n = groupItem.items.filter((item) => checked.includes(item)).length;
                return (
                  <div className={`symptom-group${openGroup === groupItem.id ? " is-open" : ""}`} key={groupItem.id}>
                    <h3>
                      <button type="button" onClick={() => setOpenGroup(openGroup === groupItem.id ? "" : groupItem.id)}>
                        {groupItem.title} <span>{n} из {groupItem.items.length}</span>
                      </button>
                    </h3>
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
            <aside className="panel checker-card checker-dark">
              <div className="checker-top">
                <p>Ваш список</p>
                <span>{checked.length === 0 ? "пока пусто" : `${checked.length} отмечено`}</span>
              </div>
              <h3>{ready ? "С этим списком удобно начать разговор со специалистом" : checked.length === 1 ? "Отметьте ещё один признак" : "Пока ничего не отмечено"}</h3>
              <div className="checker-meters">
                {SYMPTOMS.map((item) => {
                  const n = item.items.filter((label) => checked.includes(label)).length;
                  return (
                    <p key={item.id}>
                      <span>{item.title.replace("Общее самочувствие", "Самочувствие")}</span>
                      <i><b style={{ width: `${(n / item.items.length) * 100}%` }} /></i>
                      <em>{n}/{item.items.length}</em>
                    </p>
                  );
                })}
              </div>
              <p className="checker-kicker">С чего можно начать</p>
              <ul className="checker-specs">
                <li><strong>Гастроэнтеролог</strong><small>ЖКТ</small></li>
                <li><strong>Дерматолог</strong><small>Кожа</small></li>
                <li><strong>Нутрициолог</strong><small>Питание и самочувствие</small></li>
              </ul>
              <div className="checker-bring">
                <p className="checker-kicker">Что взять на приём</p>
                <ul>
                  {(ready ? checked : ["Этот список — в PDF или на телефоне", "Результат теста FOX, если уже сдавали", "Дневник питания за 1–2 недели"]).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <button className="btn btn-dark" type="button" disabled={!ready} onClick={() => pdf(checked)}>Скачать список</button>
              <Link className="btn btn-ghost" href="/labs">Найти лабораторию рядом</Link>
              <p className="checker-fine">Чекер не ставит диагноз и не заменяет приём врача. Тест FOX интерпретирует специалист.</p>
            </aside>
          </div>
        </section>

        <section className="shows-band" data-s="s07" id="chto-pokazyvaet" ref={showsRef}>
          <div className="wrap shows">
            <div className="shows-pin">
              <h2 className="page-title">Что показывает<br />тест FOX</h2>
              <p className="lead">Определяет уровень иммуноглобулина G к каждому продукту из панели: чем выше значение, тем заметнее реакция организма на этот продукт</p>
              <button className="btn btn-dark" type="button" onClick={() => window.dispatchEvent(new Event("fox:book"))}>Записаться на тест</button>
            </div>
            <div className="shows-cards">
              {SHOWS.map(([title, text], index) => (
                <article className={`show-card${index === showOn ? " is-on" : " is-off"}`} key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  {index === 0 && (
                    <div className="antigen-dots" aria-hidden>
                      {Array.from({ length: 286 }, (_, dot) => <i key={dot} className={dot % 17 === 0 ? "is-hot" : ""} style={{ animationDelay: `${dot * 8}ms` }} />)}
                    </div>
                  )}
                  {index === 2 && (
                    <ul className="igg-levels">
                      <li><i className="low" />Низкий уровень IgG</li>
                      <li><i className="mid" />Средний уровень IgG</li>
                      <li><i className="high" />Повышенный уровень IgG</li>
                    </ul>
                  )}
                  <svg className="orbit-svg" viewBox="0 0 120 120" aria-hidden>
                    <circle className="orbit-ring" cx="60" cy="60" r="46" />
                    <circle className="orbit-ring r2" cx="60" cy="60" r="28" />
                  </svg>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section data-s="s08">
          <div className="wrap">
            <article className="s08-card">
              <div className="s08-copy">
                <h2>Получите персональную карту реакций на 286 продуктов</h2>
                <p>Уровень IgG по каждому продукту, разложенный по тринадцати категориям еды. Из отчёта видно, что убрать из рациона в первую очередь, а что трогать не нужно</p>
                <Link className="btn btn-light" href="/report">Пример результата</Link>
              </div>
              <div className="s08-stack">
                <button type="button" className="s08-nav prev" aria-label="Предыдущая страница отчёта" onClick={() => setReportPage((n) => (n + REPORT_SLIDES.length - 1) % REPORT_SLIDES.length)} />
                <img src="/figma/report/p2.png" alt="" />
                <img src="/figma/report/p4.png" alt="" />
                <img className="s08-shot" key={reportPage} src={REPORT_SLIDES[reportPage][0]} alt="" />
                <button type="button" className="s08-nav next" aria-label="Следующая страница отчёта" onClick={() => setReportPage((n) => (n + 1) % REPORT_SLIDES.length)} />
              </div>
              <div className="s08-glass">
                {[
                  ["Точные значения", "Уровень IgG в U/mL по каждому продукту"],
                  ["Индивидуальные рекомендации", "Как исключить триггерные продукты из рациона"],
                  ["Понятная градация", "Сразу видно, что убрать в первую очередь"],
                ].map(([title, text]) => (
                  <article key={title}><h3>{title}</h3><p>{text}</p></article>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="wrap band" id="kak-sdat" data-s="s09">
          <h2 className="page-title">Как сдать тест</h2>
          <div className="cards-3 steps">
            {STEPS.map(([step, title, text], index) => (
              <article className={`step ${index === 0 ? "is-green" : "is-paper"}`} key={step}>
                <div className="step-mask" aria-hidden />
                <div className="step-copy">
                  <p>{step}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 28 }}><button className="btn btn-dark" type="button" onClick={() => window.dispatchEvent(new Event("fox:book"))}>Записаться на тест</button></p>
        </section>

        <section className="wrap band" id="products" data-s="s10" ref={countRef}>
          <div className="s10-head">
            <div>
              <h2 className="page-title">Продукты, которые исследует FOX</h2>
              <p className="lead">Самый частый вопрос перед тестом — «а мой продукт там есть?». Найдите его в составе панели за пару секунд.</p>
            </div>
            <p className="count-line"><strong data-antigen-count>{count}</strong><span>пищевых антигенов из 13 групп · один забор крови</span></p>
          </div>
          <div className="suggest">
          <label className="search">
            <img src="/icons/search.svg" alt="" />
            <input data-hotkey value={query} onChange={(event) => { setQuery(event.target.value); setSuggest(true); }} onFocus={() => setSuggest(true)} placeholder="Например, казеин, гречка или солея" aria-label="Поиск продукта" />
            <button className="s10-find" type="button">Найти</button>
          </label>
          {suggest && query.trim().length >= 2 && (
            <div className="suggest-list" role="listbox">
              {shown.slice(0, 6).map((item) => (
                <button type="button" key={item.name} className={picked.name === item.name ? "is-on" : ""} onClick={() => { setPicked(item); setQuery(item.name); setSuggest(false); }}>{item.name}</button>
              ))}
              {shown.length === 0 && <p>В показанной части панели такого запроса нет.</p>}
            </div>
          )}
          </div>
          {compound?.compound && query.trim().length >= 2 && <p className="hint">{compound.compound}</p>}
          <div className={`chips${chipsOpen ? " is-open" : ""}`} data-allow-x style={{ marginTop: 16 }}>
            {GROUPS.map((item) => (
              <button key={item} className={`chip${group === item ? " is-active" : ""}`} type="button" onClick={() => setGroup(item)}>{item}</button>
            ))}
            <button className="chip chip-more" type="button" onClick={() => setChipsOpen(true)}>Показать ещё</button>
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
              <p className="meta-line">Показано {Math.min(14, shown.length)} из 286 · полный состав панели уточняет лаборатория</p>
            </article>
          </div>
        </section>

        <section className="austria" data-s="s11" ref={austriaRef}>
          <div className="aus-copy">
            <h2 className="page-title">Тест разработан в Австрии</h2>
            <p>FOX — продукт венской компании MacroArray Diagnostics, основанной в 2016 году и специализирующейся на аллергодиагностике. Первый CE-маркированный IVD-продукт компания вывела на рынок в августе 2017.</p>
            <p>В основе — иммуноферментный анализ (ELISA), общепринятая стандартная лабораторная процедура. В России и СНГ тест представляет МФК Инмунотех.</p>
            <Link className="btn btn-light" href="/certificates">Сертификаты</Link>
          </div>
          <div className="aus-photo">
            <img className="parallax" src="/figma/austria/a1.png" alt="" />
            <div className="aus-cards">
              {[
                ["CE-IVDR", "Европейский стандарт для медизделий in vitro диагностики"],
                ["ISO 13485", "Качество медицинских изделий"],
                ["ISO 9001", "Система менеджмента качества"],
                ["MADx", "С 2016 года. Вена, Австрия"],
              ].map(([title, text]) => (
                <Link key={title} href="/certificates"><h3>{title}</h3><p>{text}</p></Link>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap band" data-s="s12">
          <h2 className="page-title">Сдайте тест в любой из 1500+ лабораторий</h2>
          <p className="s12-count" aria-hidden>1500+</p>
          <p className="lead">Цена устанавливается лабораторией. Уточняйте на официальном сайте.</p>
          <div className="lab-grid">
            {LABS.map(([name, slug]) => (
              <Link className="lab-tile" key={slug} href="/labs">
                <img className="lab-logo" src={slug} alt="" />
                <span className="btn btn-ghost">Сдать в {name}</span>
              </Link>
            ))}
            <Link className="lab-tile lab-tile-all" href="/labs">
              <strong>1500+</strong>
              <span>Все на карте</span>
            </Link>
          </div>
        </section>

        <section className="wrap band" data-s="s13">
          <h2 className="page-title">Отзывы наших клиентов</h2>
          <div className="review-row" data-allow-x ref={reviewsRef}>
            <div className="review-track">
            {[0, 1].flatMap((copy) => [
              <article className="review-card" key={`${REVIEWS[0][0]}-${copy}`}>
                <p className="review-stars" aria-label="5 из 5">★★★★★</p>
                <p>{REVIEWS[0][1]}</p>
                <img className="review-avatar" src="/figma/reviews/r2.png" alt="" />
                <h3>{REVIEWS[0][0]}</h3>
              </article>,
              <article className="review-card is-photo is-oval" key={`photo-a-${copy}`}><img src="/figma/reviews/r1.png" alt="" /></article>,
              <article className="review-card is-photo is-video" key={`photo-b-${copy}`}><img src="/figma/reviews/r5.png" alt="" /><span>Смотреть</span></article>,
              <article className="review-card" key={`${REVIEWS[1][0]}-${copy}`}>
                <p className="review-stars" aria-label="5 из 5">★★★★★</p>
                <p>{REVIEWS[1][1]}</p>
                <h3>{REVIEWS[1][0]}</h3>
              </article>,
            ])}
            </div>
          </div>
          <Link className="text-link" href="/reviews">Все отзывы <img src="/icons/arrow-right.svg" alt="" /></Link>
        </section>

        <section className="blog-band" data-s="s14">
          <div className="wrap">
            <h2 className="page-title">Больше полезного в нашем блоге</h2>
            <div className="cards-4 blog-home" data-allow-x>
              {articles.slice(0, 4).map((article) => (
                <Link className="blog-home-card" key={article.slug} href={`/blog/${article.slug}`}>
                  <img src={article.cover} alt="" />
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                </Link>
              ))}
            </div>
            <Link className="btn btn-dark" href="/blog">Перейти в блог</Link>
          </div>
        </section>

        <section className="faq-band" data-s="s15">
          <div className="wrap s15-grid">
            <h2 className="page-title">Частые вопросы</h2>
            <div>
              <div className="stack">
                {FAQ.map(([q, a], index) => {
                  const on = faq === index;
                  return (
                  <div key={q} className={`acc${on ? " is-open" : ""}`}>
                    <button
                      type="button"
                      aria-expanded={on}
                      onClick={(event) => {
                        setFaq(on ? -1 : index);
                        // G16: when a lower item opens, keep its question on screen.
                        if (!on) {
                          const row = event.currentTarget;
                          window.setTimeout(() => {
                            const top = row.getBoundingClientRect().top;
                            if (top < 80 || top > window.innerHeight - 160) row.scrollIntoView({ block: "center", behavior: "smooth" });
                          }, 320);
                        }
                      }}
                    >
                      <strong>{q}</strong>
                      <span className="acc-plus" aria-hidden />
                    </button>
                    <div className="acc-body"><div><p>{a}</p></div></div>
                  </div>
                  );
                })}
              </div>
              <Link href="/faq">Все вопросы →</Link>
            </div>
          </div>
          <div className="s15-cta">
            <h2 className="s15-desk">Остались вопросы?</h2>
            <h2 className="s15-mob">Не нашли ответ?</h2>
            <p>Свяжитесь с нами и мы ответим в ближайшее время.</p>
            <button className="btn btn-dark" type="button" onClick={() => window.dispatchEvent(new Event("fox:contact"))}>Связаться</button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
