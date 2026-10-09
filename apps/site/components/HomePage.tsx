"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useDialog } from "@/components/useDialog";
import { ZoomPane } from "@/components/ZoomPane";
import { articles, authors, CATEGORIES } from "@/lib/content";

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
    items: ["Постоянная усталость", "Сонливость после еды", "Головные боли", "Снижение концентрации", "Ощущение «тумана» в голове"],
  },
];

const SCALE_WORDS = "До 20% людей живут с пищевой непереносимостью и не знают об этом".split(" ");

const DECK: Array<[string, string, string]> = [
  ["Узнайте причину,|а не симптомы", "Реакция на продукт проявляется через 3–\u206072 часа после еды. Поэтому связь между тарелкой и самочувствием почти невозможно поймать самостоятельно", " — её называют «скрытой» гиперчувствительностью"],
  ["Симптомы маскируются под|другие состояния", "Усталость, головная боль, высыпания и проблемы с пищеварением похожи на десятки других причин. Их лечат по отдельности, а связь с рационом может оставаться незамеченной", ""],
  ["Не предрасположенность,|а текущее состояние", "В отличие от генетических тестов, FOX показывает не общую склонность, а то, как организм реагирует сейчас. Результат меняется вместе с рационом", ""],
];

const GROUPS = ["Все 286", "Молочные", "Яйца", "Мясо", "Рыба и морепродукты", "Злаки и семена", "Бобовые", "Овощи", "Фрукты", "Орехи", "Специи", "Грибы", "Суперфуды", "Компоненты БАДов"];

type Product = { name: string; group: string; tag?: string; aka?: string[]; compound?: string; extra?: boolean; desc?: string; facts?: Array<[string, string]> };

// Figma S10 1395:574 — the 36 product chips in panel order, each with its short tag.
const PRODUCTS: Product[] = [
  {
    name: "Казеин", group: "Молочные", tag: "Bos d 8", aka: ["bos d 8"],
    desc: "Основной белок коровьего молока. В панели исследуется как отдельный компонент — независимо от «молока» в целом.",
    facts: [["Группа", "Молочные продукты"], ["Биологическое семейство", "Полорогие (Bovidae)"], ["Где встречается", "Сыр, творог, выпечка, соусы"], ["Родственные в панели", "Козье молоко, овечий сыр"]],
  },
  { name: "Альфа-лактальбумин", group: "Молочные", tag: "молочные" },
  { name: "Бета-лактоглобулин", group: "Молочные", tag: "молочные" },
  { name: "Коровье молоко", group: "Молочные", tag: "молочные" },
  { name: "Овечий сыр", group: "Молочные", tag: "молочные" },
  { name: "Козье молоко", group: "Молочные", tag: "молочные" },
  { name: "Куриное яйцо, белок", group: "Яйца", tag: "яйца" },
  { name: "Куриное яйцо, желток", group: "Яйца", tag: "яйца" },
  { name: "Пшеница", group: "Злаки и семена", tag: "злаки" },
  { name: "Глютен", group: "Злаки и семена", tag: "злаки" },
  { name: "Гречка", group: "Злаки и семена", tag: "злаки", aka: ["гречневая"] },
  { name: "Рис", group: "Злаки и семена", tag: "злаки" },
  { name: "Овёс", group: "Злаки и семена", tag: "злаки" },
  { name: "Кукуруза", group: "Злаки и семена", tag: "злаки" },
  { name: "Соя", group: "Бобовые", tag: "бобовые" },
  { name: "Горох", group: "Бобовые", tag: "бобовые" },
  { name: "Томат", group: "Овощи", tag: "овощи" },
  { name: "Картофель", group: "Овощи", tag: "овощи" },
  { name: "Банан", group: "Фрукты", tag: "фрукты" },
  { name: "Яблоко", group: "Фрукты", tag: "фрукты" },
  { name: "Авокадо", group: "Фрукты", tag: "фрукты" },
  { name: "Миндаль", group: "Орехи", tag: "орехи" },
  { name: "Грецкий орех", group: "Орехи", tag: "орехи", aka: ["грецкие"] },
  { name: "Кешью", group: "Орехи", tag: "орехи" },
  { name: "Лосось", group: "Рыба и морепродукты", tag: "рыба" },
  { name: "Тунец", group: "Рыба и морепродукты", tag: "рыба" },
  { name: "Креветка", group: "Рыба и морепродукты", tag: "морепродукты" },
  { name: "Курица", group: "Мясо", tag: "мясо" },
  { name: "Индейка", group: "Мясо", tag: "мясо" },
  { name: "Говядина", group: "Мясо", tag: "мясо" },
  { name: "Спирулина", group: "Суперфуды", tag: "суперфуды" },
  { name: "Хлорелла", group: "Суперфуды", tag: "суперфуды" },
  { name: "Семена чиа", group: "Злаки и семена", tag: "семена" },
  { name: "Куркума", group: "Специи", tag: "специи" },
  { name: "Кофе", group: "Напитки", tag: "напитки" },
  { name: "Чёрный чай", group: "Напитки", tag: "напитки" },
  // Found by search only (not in the default 36-chip view).
  { name: "Морской язык", group: "Рыба и морепродукты", tag: "рыба", aka: ["солея"], extra: true },
  { name: "Халва", group: "Компоненты БАДов", tag: "составной", compound: "Составной продукт: в панели смотрите кунжут, мёд и сахар отдельно.", extra: true },
];

// Figma mobile S10 1430:48677 — the 14 chips shown on phones before filtering.
const MOBILE_PICKS = ["Казеин", "Коровье молоко", "Козье молоко", "Куриное яйцо, белок", "Пшеница", "Глютен", "Гречка", "Рис", "Соя", "Томат", "Банан", "Миндаль", "Лосось", "Курица"];

const LABS: Array<[string, string]> = [
  ["Ситилаб", "/figma/labs/fig/citilab.svg"],
  ["Гемотест", "/figma/labs/fig/gemotest.svg"],
  ["KDL", "/figma/labs/fig/kdl.svg"],
  ["ДНКОМ", "/figma/labs/fig/dnkom.svg"],
  ["Инвитро", "/figma/labs/fig/invitro.svg"],
  ["CMD", "/figma/labs/fig/cmd.svg"],
  ["Хеликс", "/figma/labs/fig/helix.svg"],
  ["Хромолаб", "/figma/labs/fig/chromolab.svg"],
  ["Юнимед", "/figma/labs/fig/unimed.svg"],
];

const REPORT_SLIDES = [
  ["/figma/report/p4.webp", "Точные значения", "Уровень IgG в U/mL по каждому продукту."],
  ["/figma/report/p2.webp", "Группы продуктов", "13 групп вместо сплошного списка."],
  ["/figma/report/front.webp", "Понятная градация", "Сразу видно, что убрать в первую очередь."],
];

let antigenAnimated = false;

const SHOWS = [
  ["286 продуктов", "Весь привычный рацион — от базовых продуктов до редких. За один забор крови."],
  ["13 групп", "Овощи, злаки, молочное, рыба, специи, грибы. Отдельно суперфуды и компоненты БАД"],
  ["3 уровня", "Показывает, что стоит убрать в первую очередь, а что можно вернуть в рацион раньше остального"],
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
  ["Игорь Потруников", "Списывал всё на возраст и работу: тяжесть после еды, вечная усталость к обеду, вздутие. Четыре месяца вёл дневник питания и не продвинулся ни на шаг — к моменту, когда появлялась реакция, вспомнить позавчерашний обед было уже невозможно. Отчёт дал точку отсчёта вместо очередной догадки. Убрал три продукта, потом возвращал их по одному. Через два месяца перестал планировать день вокруг того, как себя чувствует желудок."],
];

// The three specialists of the frame; icon = index of /figma/home/checker/s-N.svg.
const SPECS: [string, string, number, string[]][] = [
  ["Гастроэнтеролог", "ЖКТ", 1, ["gut"]],
  ["Дерматолог", "Кожа", 2, ["skin"]],
  ["Нутрициолог", "Питание и самочувствие", 3, ["weight", "well"]],
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
  const [picked, setPicked] = useState<Product>(PRODUCTS[0]);
  const [count, setCount] = useState(0);
  const [faq, setFaq] = useState(0);
  const showsRef = useRef<HTMLElement>(null);
  const [showOn, setShowOn] = useState(0);
  const [suggest, setSuggest] = useState(false);
  const [reportPage, setReportPage] = useState(0);
  // M44: the page that leaves curls away over the left edge while the next one already lies underneath.
  const [curl, setCurl] = useState<{ src: string; n: number; dir: 1 | -1 } | null>(null);
  const turnReport = (dir: 1 | -1) => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setCurl({ src: REPORT_SLIDES[reportPage][0], n: Date.now(), dir });
    setReportPage((n) => (n + REPORT_SLIDES.length + dir) % REPORT_SLIDES.length);
  };
  const reportTouch = useRef<number | null>(null);
  const [reportFull, setReportFull] = useState(false);
  const [chipsOpen, setChipsOpen] = useState(false);
  const [moreProducts, setMoreProducts] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  // M43: groups are accordions — several can be open at once.
  const [openGroups, setOpenGroups] = useState<string[]>(["gut"]);
  const toggleGroup = (id: string) => setOpenGroups((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  const symRowRef = useRef<HTMLDivElement>(null);
  const checkerRef = useRef<HTMLElement>(null);
  const [checkerBar, setCheckerBar] = useState(false);
  const scaleRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const austriaRef = useRef<HTMLElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const [reviewDot, setReviewDot] = useState(0);
  const onReviewScroll = () => {
    const row = reviewsRef.current;
    if (!row || row.scrollLeft <= 0) return setReviewDot(0);
    const card = row.querySelector<HTMLElement>(".review-card");
    const step = (card?.offsetWidth ?? 300) + 12;
    setReviewDot(Math.min(4, Math.round(row.scrollLeft / step)));
  };

  useEffect(() => {
    // M43: marks live in sessionStorage (this tab only).
    localStorage.removeItem("fox-checker");
    const saved = sessionStorage.getItem("fox-checker");
    if (saved) setChecked(JSON.parse(saved) as string[]);
  }, []);
  const checkedOnce = useRef(false);
  useEffect(() => {
    if (!checkedOnce.current) {
      checkedOnce.current = true;
      return;
    }
    sessionStorage.setItem("fox-checker", JSON.stringify(checked));
  }, [checked]);

  // M43: on phones, after the first mark a bar «Отмечено N · К итогу ↓» stays at the bottom while the list is on screen
  // and the summary card is not.
  useEffect(() => {
    const section = checkerRef.current;
    const card = section?.querySelector(".checker-card");
    if (!section || !card) return;
    let inSection = false;
    let cardSeen = false;
    const sync = () => setCheckerBar(inSection && !cardSeen && window.matchMedia("(max-width: 767px)").matches);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === section) inSection = entry.isIntersecting;
        else cardSeen = entry.isIntersecting;
      });
      sync();
    });
    io.observe(section);
    io.observe(card);
    return () => io.disconnect();
  }, []);

  // M43: the checker bar replaces the global phone CTA bar (m04) while it is shown.
  const barOn = checkerBar && checked.length > 0;
  useEffect(() => {
    document.body.classList.toggle("has-s06-bar", barOn);
    return () => document.body.classList.remove("has-s06-bar");
  }, [barOn]);

  // M42: the card that is snapped in the phone row slowly zooms its photo (1 → 1.04).
  useEffect(() => {
    const row = symRowRef.current;
    if (!row) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.target.classList.toggle("is-active", entry.intersectionRatio >= 0.75)),
      { root: row, threshold: [0, 0.75, 1] },
    );
    row.querySelectorAll(".sym-card").forEach((card) => io.observe(card));
    return () => io.disconnect();
  }, []);

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
      if (deckRef.current) {
        // S04 deck: on desktop the stage is pinned and the front card leaves upward
        // while the cards behind step forward to the 1118 / 990 / 902 Figma sizes.
        const section = deckRef.current;
        const stage = section.querySelector<HTMLElement>(".deck-stage");
        const cards = [...section.querySelectorAll<HTMLElement>(".deck-card")];
        const pinned = stage && getComputedStyle(stage).position === "sticky" && !reduce;
        let progress = 0;
        if (pinned && stage) {
          const rect = section.getBoundingClientRect();
          const pad = parseFloat(getComputedStyle(section).paddingTop) || 0;
          const top = parseFloat(getComputedStyle(stage).top) || 0;
          const travel = Math.max(1, section.offsetHeight - stage.offsetHeight - pad * 2);
          progress = Math.min(1, Math.max(0, (pad - top - rect.top) / travel)) * (cards.length - 1);
        }
        cards.forEach((card, index) => {
          if (!pinned) {
            card.style.transform = "";
            card.style.opacity = "";
            card.style.zIndex = "";
            // M41: on phones the next sticky card slides over this one — it shrinks to 0.94 and darkens by 20%.
            const next = cards[index + 1];
            if (next && !reduce) {
              const rect = card.getBoundingClientRect();
              const cover = Math.min(1, Math.max(0, (rect.bottom - next.getBoundingClientRect().top) / rect.height));
              card.style.setProperty("--cover", cover.toFixed(3));
            } else card.style.removeProperty("--cover");
            return;
          }
          card.style.removeProperty("--cover");
          const rel = index - progress;
          if (rel < 0) {
            card.style.transform = `translateY(${rel * 70}%)`;
            card.style.opacity = String(Math.max(0, 1 + rel * 1.4));
          } else {
            const scale = rel <= 1 ? 1 - 0.1145 * rel : 0.8855 - 0.0785 * Math.min(1, rel - 1);
            const shift = rel <= 1 ? 24 * rel : 24 + 25 * Math.min(1, rel - 1);
            card.style.transform = `translateY(${shift}px) scale(${scale})`;
            card.style.opacity = "1";
          }
          card.style.zIndex = String(Math.round(100 - rel * 10));
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
    if (!row || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(max-width: 767px)").matches) return;
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

  // M45: the search filters with a 150 мс debounce; chips that stay slide to their new places (FLIP, 220 мс).
  const [qDeb, setQDeb] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setQDeb(query), 150);
    return () => window.clearTimeout(id);
  }, [query]);
  const picksRef = useRef<HTMLDivElement>(null);
  const picksPos = useRef<Map<string, DOMRect>>(new Map());
  const picksNodes = useRef<Map<string, HTMLElement>>(new Map());
  const picksBox = useRef<{ left: number; top: number } | null>(null);
  const shown = useMemo(() => {
    const q = qDeb.trim().toLowerCase();
    return PRODUCTS.filter((item) => {
      const inGroup = group === "Все 286" || item.group === group;
      if (!inGroup) return false;
      if (!q) return moreProducts || !item.extra;
      return item.name.toLowerCase().includes(q) || (item.aka ?? []).some((aka) => aka.includes(q));
    });
  }, [qDeb, group, moreProducts]);
  useLayoutEffect(() => {
    const box = picksRef.current;
    if (!box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, DOMRect>();
    const nodes = new Map<string, HTMLElement>();
    const boxRect = box.getBoundingClientRect();
    const live = new Set([...box.querySelectorAll<HTMLElement>("button[data-name]")].map((node) => node.dataset.name ?? ""));
    // Chips that dropped out fade and collapse in place (220 мс) while the rest slide over them.
    if (!reduce && picksBox.current) {
      const shiftX = boxRect.left - picksBox.current.left;
      const shiftY = boxRect.top - picksBox.current.top;
      picksNodes.current.forEach((clone, name) => {
        const old = picksPos.current.get(name);
        if (live.has(name) || !old || !old.width) return;
        clone.classList.add("pick-ghost");
        clone.setAttribute("aria-hidden", "true");
        clone.tabIndex = -1;
        clone.style.left = `${old.left - picksBox.current!.left - shiftX + box.scrollLeft}px`;
        clone.style.top = `${old.top - picksBox.current!.top - shiftY + box.scrollTop}px`;
        clone.style.width = `${old.width}px`;
        clone.style.height = `${old.height}px`;
        box.appendChild(clone);
        clone.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.6)" }], { duration: 220, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" }).finished.then(() => clone.remove(), () => clone.remove());
      });
    }
    box.querySelectorAll<HTMLElement>("button[data-name]:not(.pick-ghost)").forEach((node) => {
      const rect = node.getBoundingClientRect();
      const name = node.dataset.name ?? "";
      next.set(name, rect);
      nodes.set(name, node.cloneNode(true) as HTMLElement);
      const old = picksPos.current.get(name);
      if (reduce || !picksPos.current.size || !rect.width) return;
      if (old && (old.left !== rect.left || old.top !== rect.top)) {
        node.animate([{ transform: `translate(${old.left - rect.left}px, ${old.top - rect.top}px)` }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.2, .8, .2, 1)" });
      } else if (!old) {
        node.animate([{ opacity: 0, transform: "scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "ease-out" });
      }
    });
    picksPos.current = next;
    picksNodes.current = nodes;
    picksBox.current = { left: boxRect.left, top: boxRect.top };
  }, [shown]);

  useEffect(() => {
    if (shown.length && !shown.some((item) => item.name === picked.name)) setPicked(shown[0]);
  }, [shown, picked.name]);

  const compound = useMemo(() => PRODUCTS.find((item) => item.compound && (item.name.toLowerCase().includes(query.trim().toLowerCase()) || query.trim().toLowerCase().includes("халв"))), [query]);

  // M43: the specialists reorder by how many of their signs are checked; the lists swap with a 200 мс crossfade.
  const specOrder = useMemo(() => {
    const score = (ids: string[]) => SYMPTOMS.filter((group) => ids.includes(group.id)).reduce((sum, group) => sum + group.items.filter((label) => checked.includes(label)).length, 0);
    return SPECS.map((item) => [item, score(item[3])] as const).sort((a, b) => b[1] - a[1]).map(([item]) => item);
  }, [checked]);
  const specKey = specOrder.map((item) => item[0]).join("|");
  const specPrev = useRef(specOrder);
  const [specOld, setSpecOld] = useState<typeof SPECS | null>(null);
  useEffect(() => {
    const prev = specPrev.current;
    specPrev.current = specOrder;
    if (prev.map((item) => item[0]).join("|") === specKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setSpecOld(prev);
    const id = window.setTimeout(() => setSpecOld(null), 200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey]);

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
                media="(max-width: 767px)"
                srcSet="/figma/home/hero-photo-mobile.webp 780w, /figma/home/hero-photo-mobile@3x.webp 1170w"
                sizes="100vw"
                type="image/webp"
              />
              <source media="(max-width: 767px)" srcSet="/figma/home/hero-photo-mobile.jpg" />
              <source srcSet="/figma/home/hero-desktop.webp 1440w, /figma/home/hero-desktop@2x.webp 2880w" sizes="max(100vw, min(1440px, max(896px, 160vh)))" type="image/webp" />
              <img className="bg" src="/figma/home/hero-desktop.jpg" alt="" />
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
                    <svg className="hero-book-plus" viewBox="0 0 24 24" width="24" height="24" aria-hidden>
                      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
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
              {/* Desktop frame 1385:283 says «286 продуктов · покажет тест», «7–10 дней · до результата»; the 390 frame keeps the short form. */}
              <div><strong>1 сеанс</strong><span>сдачи крови</span></div>
              <div><strong>286<i className="fact-d"> продуктов</i></strong><span><i className="fact-d">покажет тест</i><i className="fact-m">продуктов</i></span></div>
              <div><strong>7–10<i className="fact-d"> дней</i></strong><span className="facts-lines"><i className="fact-d">до результата</i><span className="fact-m">дней до</span><span className="fact-m">результата</span></span></div>
            </div>
          </div>
        </section>

        <section className="lab-marquee" data-s="s02" aria-label="Лаборатории">
          <p className="meta-line"><span className="d-only">Тест доступен в лабораториях:</span><span className="m-only">Тест есть в 9 федеральных сетях</span></p>
          <div className="marquee" data-allow-x>
            <div>
              {[...LABS, ...LABS].map(([name, slug], index) => (
                <Link key={`${slug}-${index}`} href="/labs" aria-label={name}>
                  <img className="lab-logo" src={slug} alt="" />
                  <span className="lab-name">{name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="scale" id="scale" ref={scaleRef} data-scale data-s="s03">
          <div className="scale-pin">
            <h2 className="page-title">
              {SCALE_WORDS.map((word, index) => (
                <span data-word key={`${word}-${index}`}>{word}{index === SCALE_WORDS.length - 1 && <sup>1</sup>}{" "}{(index === 3 || index === 6) && <br className="scale-br" />}</span>
              ))}
            </h2>
          </div>
          <img className="scale-bubbles" src="/figma/home/bubbles.svg" alt="" />
          <p className="scale-note">¹ Оценка распространённости пищевой непереносимости. Источник — ссылка на исследование (предоставит клиент)</p>
        </section>

        <section className="deck" ref={deckRef} data-deck data-s="s04">
          {/* Figma S04 1385:578 (desktop deck 1385:579) · 1426:48571 (mobile list) */}
          <div className="deck-stage">
            {DECK.map(([title, text, tail], index) => (
              <article className="deck-card" key={title} data-i={index} style={{ ["--i" as string]: index }}>
                <img className="deck-bg" src={`/figma/home/deck/card-${index + 1}.webp`} srcSet={`/figma/home/deck/card-${index + 1}.webp 1118w, /figma/home/deck/card-${index + 1}@2x.webp 2236w`} sizes="(min-width: 768px) 1118px, 800px" alt="" />
                <h2>{title.split("|")[0]}<br className="deck-br" /> {title.split("|")[1]}</h2>
                <div className="deck-foot">
                  <img className="deck-icon" src={`/figma/home/deck/icon-${index + 1}.svg`} alt="" />
                  <p>{text}{tail && <span className="deck-tail">{tail}</span>}<span className="deck-dot">.</span></p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="symptom-band" data-s="s05">
          <div className="wrap">
            <h2 className="page-title">Симптомы, при которых стоит обсудить тест со специалистом</h2>
            <div className="cards-4 sym-row" data-allow-x ref={symRowRef}>
              {[
                ["Кожные реакции", ["Высыпания", "Экзема", "Дерматиты и зуд"], "/figma/symptoms/skin-card.webp"],
                ["Проблемы с ЖКТ", ["Вздутие живота", "Газообразование", "Диарея", "Тошнота", "Спазмы или боли"], "/figma/symptoms/gut-card.webp"],
                ["Самочувствие", ["Хроническая усталость", "Общая слабость", "Тяжесть после еды", "Нарушения сна", "Упадок сил", "Перепады настроения"], "/figma/symptoms/well-card.webp"],
                ["Вес и отёчность", ["Трудно снизить вес", "Стойкая отёчность", "Отёки лица по утрам", "Колебания веса"], "/figma/symptoms/s6.webp"],
              ].map(([title, chips, src], index) => (
                <article
                  className="sym-card"
                  key={title as string}
                  data-contrast="photo"
                  onClick={() => {
                    // M42: on phones a tap scrolls to the checker and opens the matching group.
                    if (!window.matchMedia("(max-width: 767px)").matches) return;
                    const id = ["skin", "gut", "well", "weight"][index];
                    setOpenGroups((list) => (list.includes(id) ? list : [...list, id]));
                    window.requestAnimationFrame(() => document.getElementById(`s06-${id}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
                  }}
                >
                  <img
                    src={src as string}
                    srcSet={(src as string).endsWith("-card.webp") ? `${src} 324w, ${(src as string).replace(".webp", "@2x.webp")} 648w` : undefined}
                    sizes="(min-width: 1101px) 324px, 78vw"
                    alt=""
                  />
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

        <section className="wrap band checker" id="checker" data-s="s06" ref={checkerRef}>
          <div className="s06-head">
            <div>
              <p className="meta-line s06-eyebrow"><i aria-hidden />Чекер симптомов · около минуты</p>
              <h2 className="page-title">Отметьте, что беспокоит вас последние 4 недели</h2>
            </div>
            <p className="lead">Интерактивный список — не диагноз и не оценка риска. Он поможет собрать мысли перед консультацией и понять, с какого специалиста удобно начать разговор.</p>
          </div>
          <div className="checker-grid">
            <div className="symptom-groups">
              {SYMPTOMS.map((groupItem) => {
                const n = groupItem.items.filter((item) => checked.includes(item)).length;
                return (
                  <div className={`symptom-group${openGroups.includes(groupItem.id) ? " is-open" : ""}`} key={groupItem.id} id={`s06-${groupItem.id}`}>
                    <h3>
                      <button type="button" aria-expanded={openGroups.includes(groupItem.id)} onClick={() => toggleGroup(groupItem.id)}>
                        <i className="s06-gicon" aria-hidden><img src={`/figma/home/checker/g-${groupItem.id}.svg`} alt="" /></i>
                        <b>{groupItem.title}</b> <span className={n > 0 ? "is-on" : ""}>{n} из {groupItem.items.length}</span>
                      </button>
                    </h3>
                    {groupItem.items.map((item) => (
                      <label className={`check-row${checked.includes(item) ? " is-on" : ""}`} key={item}>
                        <input type="checkbox" checked={checked.includes(item)} onChange={() => toggle(item)} />
                        <i className="s06-box" aria-hidden />
                        <span>{item}</span>
                      </label>
                    ))}
                    {groupItem.id === "weight" && <p className="s06-gnote">Отёки и изменения веса бывают по разным причинам — отметьте их, чтобы не забыть обсудить на приёме.</p>}
                  </div>
                );
              })}
              <p className="s06-foot">
                <button type="button" onClick={() => setChecked([])}>Сбросить отметки</button>
                <span>Ответы не сохраняются и не передаются — список собирается только на вашем устройстве.</span>
              </p>
            </div>
            {barOn &&
              createPortal(
                <button type="button" className="s06-bar" onClick={() => checkerRef.current?.querySelector(".checker-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                  Отмечено {checked.length} · К итогу ↓
                </button>,
                document.body,
              )}
            <aside className="panel checker-card checker-dark" data-contrast="photo">
              <div className="checker-top">
                <p>Ваш список</p>
                <span>{checked.length === 0 ? "пока пусто" : `${checked.length} отмечено`}</span>
              </div>
              <h3>{ready ? "С этим списком удобно начать разговор со специалистом" : checked.length === 1 ? "Отметьте ещё один признак" : "Пока ничего не отмечено"}</h3>
              <div className="checker-meters">
                {SYMPTOMS.map((item) => {
                  const n = item.items.filter((label) => checked.includes(label)).length;
                  if (checked.length > 0 && n === 0) return null;
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
              <div className="checker-specs-x">
                <ul className={`checker-specs${specOld ? " is-in" : ""}`} key={specOrder.map((item) => item[0]).join("|")}>
                  {specOrder.map(([name, area, icon]) => (
                    <li key={name}>
                      <i aria-hidden><img src={`/figma/home/checker/s-${icon}.svg`} alt="" /></i>
                      <span><strong>{name}</strong><small>{area}</small></span>
                      <img className="s06-arrow" src="/icons/arrow-right-light.svg" alt="" />
                    </li>
                  ))}
                </ul>
                {specOld && (
                  <ul className="checker-specs is-old" aria-hidden>
                    {specOld.map(([name, area, icon]) => (
                      <li key={name}>
                        <i><img src={`/figma/home/checker/s-${icon}.svg`} alt="" /></i>
                        <span><strong>{name}</strong><small>{area}</small></span>
                        <img className="s06-arrow" src="/icons/arrow-right-light.svg" alt="" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="checker-bring">
                <p className="checker-kicker">Что взять на приём</p>
                <ul>
                  {(ready ? checked : ["Этот список — в PDF или на телефоне", "Результат теста FOX, если уже сдавали", "Дневник питания за 1–2 недели"]).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <button className="btn btn-dark" type="button" disabled={!ready} onClick={() => pdf(checked)}>Скачать список и записаться<img src="/figma/home/checker/plus.svg" alt="" /></button>
              <Link className="btn btn-ghost" href="/labs">Найти лабораторию рядом</Link>
              <p className="checker-fine">Чекер не ставит диагноз и не заменяет приём врача. Тест FOX интерпретирует специалист.</p>
            </aside>
          </div>
        </section>

        <section className="shows-band" data-s="s07" id="chto-pokazyvaet" ref={showsRef}>
          {/* Figma S07 1385:652 · mobile 1428:48608 */}
          <div className="wrap shows">
            <div className="shows-pin">
              <h2 className="page-title">Что показывает<br /> тест FOX</h2>
              <div className="shows-foot">
                <p className="lead">Определяет уровень иммуноглобулина G к каждому продукту из панели: чем выше значение, тем заметнее реакция организма на этот продукт</p>
                <button className="btn btn-dark shows-cta" type="button" onClick={() => window.dispatchEvent(new Event("fox:book"))}>Записаться на тест</button>
              </div>
            </div>
            <div className="shows-cards">
              {SHOWS.map(([title, text], index) => (
                <article className={`show-card show-card-${index + 1}${index === showOn ? " is-on" : " is-off"}`} key={title} data-contrast="figma">
                  <div className="show-copy">
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                  {index === 0 && <img className="show-dots" src="/figma/home/shows/dots.svg" alt="" />}
                  {index === 1 && (
                    <div className="show-rings" aria-hidden data-allow-x><i /><i /><i /></div>
                  )}
                  {index === 2 && (
                    <ul className="igg-levels">
                      <li><span><i className="low" />Низкий уровень IgG</span><b /></li>
                      <li><span><i className="mid" />Средний уровень IgG</span><b /></li>
                      <li><span><i className="high" />Повышенный уровень IgG</span><b /></li>
                    </ul>
                  )}
                </article>
              ))}
            </div>
            <button className="btn btn-dark shows-cta-m" type="button" onClick={() => window.dispatchEvent(new Event("fox:book"))}>Записаться на тест<img src="/figma/home/checker/plus.svg" alt="" /></button>
          </div>
        </section>

        <section data-s="s08">
          <div className="wrap">
            <article className="s08-card">
              <div className="s08-copy">
                <h2>Получите персональную <br className="s08-br" />карту реакций <br className="s08-br" />на 286 продуктов</h2>
                <div className="s08-foot">
                <p>Уровень IgG по каждому продукту, разложенный по <span className="d-only">тринадцати категориям еды. Из отчёта видно, что убрать из рациона в первую очередь, а что трогать не нужно</span><span className="m-only">13 категориям еды.</span></p>
                <Link className="btn btn-light" href="/report">Пример результата<img src="/icons/arrow-up-right.svg" alt="" /><img className="s08-plus" src="/figma/icons/plus-dark.svg" alt="" /></Link>
                <Link className="s08-more" href="/report#zones">Как читать отчёт</Link>
                </div>
              </div>
              <div
                className="s08-stack"
                data-allow-x
                onTouchStart={(event) => { reportTouch.current = event.touches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => {
                  const start = reportTouch.current;
                  reportTouch.current = null;
                  const end = event.changedTouches[0]?.clientX;
                  if (start === null || end === undefined || Math.abs(end - start) < 40) return;
                  turnReport(end < start ? 1 : -1);
                }}
              >
                <button type="button" className="s08-nav prev" aria-label="Предыдущая страница отчёта" onClick={() => turnReport(-1)} />
                <i className="s08-sheet s08-sheet-3" aria-hidden />
                <i className="s08-sheet s08-sheet-2" aria-hidden />
                <img
                  className="s08-shot"
                  key={reportPage}
                  src={REPORT_SLIDES[reportPage][0]}
                  alt=""
                  onClick={() => {
                    // M44: on phones a tap on the page opens the full-screen view with pinch-zoom.
                    if (window.matchMedia("(max-width: 1100px)").matches) setReportFull(true);
                  }}
                />
                {curl && <img className={`s08-shot s08-curl${curl.dir < 0 ? " is-back" : ""}`} key={curl.n} src={curl.src} alt="" aria-hidden onAnimationEnd={() => setCurl(null)} />}
                <button type="button" className="s08-nav next" aria-label="Следующая страница отчёта" onClick={() => turnReport(1)} />
              </div>
              {reportFull && createPortal(<ReportViewer page={reportPage} onPage={setReportPage} onClose={() => setReportFull(false)} />, document.body)}
              <div className="s08-pager" aria-hidden>{REPORT_SLIDES.map((slide, index) => <i key={slide[0]} className={index === reportPage ? "is-on" : ""} />)}</div>
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
          {/* Figma S10 1395:574 · mobile 1430:48646 */}
          <div className="s10-head">
            <div>
              <h2 className="page-title">Продукты, которые исследует FOX</h2>
              <p className="lead">Самый частый вопрос перед тестом — «а мой продукт там есть?». Найдите его в составе панели за пару секунд.</p>
            </div>
            <p className="count-line"><strong data-antigen-count>{count}</strong><span className="d-only">пищевых антигенов из 13 групп · один забор крови</span><span className="m-only">антигенов · 13 групп</span></p>
          </div>
          <div className="suggest">
          <label className="search">
            <img src="/icons/search.svg" alt="" />
            <input data-hotkey value={query} onChange={(event) => { setQuery(event.target.value); setSuggest(true); }} onFocus={() => setSuggest(true)} placeholder={phone ? "Например, «гречка»" : "Поиск продукта — например, «казеин», «гречка» или «солея»"} aria-label="Поиск продукта" />
            <kbd className="s10-kbd" aria-hidden>/</kbd>
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
          <div className={`chips${chipsOpen ? " is-open" : ""}`} data-allow-x>
            {GROUPS.map((item) => (
              <button key={item} className={`chip${group === item ? " is-active" : ""}`} type="button" onClick={() => setGroup(item)}>{item}</button>
            ))}
            <button className="chip chip-more" type="button" onClick={() => setChipsOpen(true)}>Показать ещё</button>
          </div>
          <div className="checker-grid">
            <div className="s10-products">
              <div ref={picksRef} className={`product-picks${!query.trim() && group === "Все 286" && !moreProducts ? " is-default" : ""}`} data-allow-x>
                {shown.map((item) => (
                  <button type="button" data-name={item.name} className={`${picked.name === item.name ? "is-on" : ""}${MOBILE_PICKS.includes(item.name) ? " m-pick" : ""}`} key={item.name} onClick={() => { setPicked(item); setCardOpen(true); }}>
                    <Hit text={item.name} q={qDeb} />{item.tag && <small>{item.tag}</small>}
                  </button>
                ))}
                {shown.length === 0 && <p>В показанной части панели такого запроса нет. Спросите специалиста.</p>}
              </div>
              <div className="s10-more">
                {!moreProducts && <button className="btn btn-light" type="button" onClick={() => setMoreProducts(true)}>Показать ещё<img src="/figma/icons/plus-dark.svg" alt="" /></button>}
                <p className="meta-line"><span className="d-only">Показано {Math.min(36, shown.length)} из 286 · полный список — в PDF «Состав панели»</span><span className="m-only">Показано {Math.min(14, shown.length)} из 286 · тап по продукту открывает карточку</span></p>
              </div>
            </div>
            <article className={`panel s10-card${cardOpen ? " is-open" : ""}`}>
              <div className="s10-card-top">
                <span className="s10-tag">{picked.group}{picked.tag && picked.tag !== picked.group.toLowerCase() && /[A-Za-z]/.test(picked.tag) ? ` · ${picked.tag}` : ""}</span>
                <button type="button" className="s10-close" aria-label="Сбросить выбор" onClick={() => { setCardOpen(false); setQuery(""); setGroup("Все 286"); setPicked(PRODUCTS[0]); }}>✕</button>
              </div>
              <div className="s10-card-head">
                <h3>{picked.name}</h3>
                <p>{picked.desc ?? `${picked.group}. В панели это отдельная позиция, не полка целиком.`}</p>
              </div>
              <dl className="s10-facts">
                {(picked.facts ?? [
                  ["Группа", picked.group],
                  ["Родственные в панели", PRODUCTS.filter((item) => item.group === picked.group && item.name !== picked.name && !item.extra).slice(0, 2).map((item) => item.name).join(", ") || "—"],
                ]).map(([term, value]) => (
                  <div key={term}><dt>{term}</dt><dd>{value}</dd></div>
                ))}
              </dl>
              <p className="s10-swap">Исключать продукт и подбирать замены стоит только вместе со специалистом — чтобы рацион оставался полноценным.</p>
              <div className="s10-blog">
                <p>В блоге</p>
                {articles.slice(0, 2).map((article) => (
                  <Link key={article.slug} href={`/blog/${article.slug}`}><span>{article.title}</span><img src="/icons/arrow-right.svg" alt="" /></Link>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="austria" data-s="s11" ref={austriaRef}>
          {/* Figma S11 1385:792 · mobile 1437:48639 */}
          <div className="aus-copy">
            <p className="aus-eyebrow">Сделано в Европе</p>
            <h2 className="page-title">Тест разработан <br className="aus-br" />в Австрии</h2>
            <div className="aus-foot">
              <p className="aus-p1">FOX — продукт венской компании MacroArray Diagnostics, основанной в 2016 году и специализирующейся на аллергодиагностике. Первый CE-маркированный IVD-продукт компания вывела на рынок в августе 2017.</p>
              <p className="aus-p2">В основе — иммуноферментный анализ (ELISA), общепринятая стандартная лабораторная процедура. В России и СНГ тест представляет МФК Инмунотех.</p>
              <Link className="btn btn-light" href="/certificates">Смотреть сертификаты</Link>
            </div>
          </div>
          <div className="aus-photo" data-allow-x>
            <img className="parallax" src="/figma/austria/a1.webp" alt="" />
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
          {/* Figma S12 1385:815 · mobile 1437:48658 */}
          <h2 className="page-title">Сдайте тест <br className="s12-br" />в любой из 1500+ лабораторий</h2>
          <p className="lead">Цена устанавливается лабораторией. Уточняйте на официальном сайте.</p>
          <p className="s12-count"><strong>1500+</strong><span>пунктов в 9 сетях</span></p>
          <div className="lab-grid">
            {LABS.map(([name, slug], index) => (
              <Link className="lab-tile" key={slug} href="/labs" aria-label={`Сдать тест в ${name}`} style={{ ["--k" as string]: index }}>
                <span className="lab-logo-box"><img className="lab-logo" src={slug} alt="" /></span>
                <span className="lab-go">Сдать тест<img src="/icons/arrow-up-right.svg" alt="" /></span>
              </Link>
            ))}
            <Link className="lab-tile lab-tile-all" href="/labs" style={{ ["--k" as string]: LABS.length }}>
              <strong>1500+</strong>
              <small>пунктов в 9 сетях</small>
              <span className="lab-go">На карте<img src="/icons/arrow-up-right.svg" alt="" /></span>
              <em>Все на карте →</em>
              <small className="lab-all-m">1500+ точек</small>
            </Link>
          </div>
          <Link className="btn btn-dark s12-cta" href="/labs">Найти лабораторию рядом</Link>
        </section>

        <section className="band s13" data-s="s13">
          <h2 className="page-title">Отзывы наших клиентов</h2>
          <div className="review-row" data-allow-x ref={reviewsRef} onScroll={onReviewScroll}>
            <div className="review-track">
            {[0, 1].flatMap((copy) => [
              <article className="review-card is-photo" key={`p1-${copy}`} aria-hidden={copy === 1 || undefined}>
                <img src="/figma/home/reviews/p1.webp" srcSet="/figma/home/reviews/p1-512.webp 512w, /figma/home/reviews/p1.webp 1024w" sizes="500px" alt="" />
                <span className="review-play" aria-hidden><img src="/figma/home/reviews/play.svg" alt="" /></span>
              </article>,
              <article className="review-card is-oval" key={`${REVIEWS[0][0]}-${copy}`} aria-hidden={copy === 1 || undefined}>
                <p className="review-stars" aria-label="5 из 5">★★★★★</p>
                <div className="review-body">
                  <p>{REVIEWS[0][1]}</p>
                  <img className="review-avatar" src="/figma/home/reviews/a1.webp" alt="" />
                </div>
                <h3>{REVIEWS[0][0]}</h3>
              </article>,
              <article className="review-card is-photo" key={`p2-${copy}`} aria-hidden={copy === 1 || undefined}>
                <img src="/figma/home/reviews/p2.webp" srcSet="/figma/home/reviews/p2-512.webp 512w, /figma/home/reviews/p2.webp 1024w" sizes="500px" alt="" />
                <span className="review-play" aria-hidden><img src="/figma/home/reviews/play.svg" alt="" /></span>
              </article>,
              <article className="review-card is-dark" key={`${REVIEWS[1][0]}-${copy}`} aria-hidden={copy === 1 || undefined}>
                <p className="review-stars" aria-label="5 из 5">★★★★★</p>
                <p>{REVIEWS[1][1]}</p>
                <h3>{REVIEWS[1][0]}</h3>
              </article>,
              <article className="review-card is-photo" key={`p3-${copy}`} aria-hidden={copy === 1 || undefined}>
                <img src="/figma/home/reviews/p3.webp" srcSet="/figma/home/reviews/p3-512.webp 512w, /figma/home/reviews/p3.webp 1024w" sizes="500px" alt="" />
                <span className="review-play" aria-hidden><img src="/figma/home/reviews/play.svg" alt="" /></span>
              </article>,
            ])}
            </div>
          </div>
          <div className="review-pager" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => <i key={i} className={reviewDot === i ? "is-on" : ""} />)}
          </div>
          <Link className="btn btn-light s13-all" href="/reviews">Все отзывы <img src="/figma/icons/plus-dark.svg" alt="" /></Link>
        </section>

        <section className="blog-band" data-s="s14">
          <div className="wrap">
            <h2 className="page-title">Больше полезного <br className="s14-br" />в нашем блоге</h2>
            <div className="cards-4 blog-home" data-allow-x>
              {articles.slice(0, 4).map((article) => {
                const author = authors.find((item) => item.slug === article.author);
                const cat = CATEGORIES.find((item) => item.id === article.category)?.label;
                return (
                <Link className="blog-home-card" key={article.slug} href={`/blog/${article.slug}`}>
                  <img src={article.cover} alt="" />
                  <span className="bh-meta m-only"><small>~{article.minutes} минут</small>{cat && <small>{cat}</small>}</span>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  {author && (
                    <span className="bh-author m-only">
                      <img src={author.avatar} alt="" />
                      <span><b>{author.name}</b><small>{author.role}</small></span>
                    </span>
                  )}
                </Link>
                );
              })}
            </div>
            <Link className="btn btn-dark s14-all" href="/blog">Перейти в блог <img className="m-only" src="/figma/icons/plus-dark.svg" alt="" /></Link>
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
              <Link className="s15-all" href="/faq"><span className="d-only">Все вопросы →</span><span className="m-only">Все вопросы <img src="/figma/icons/plus-dark.svg" alt="" /></span></Link>
            </div>
          </div>
          <div className="s15-cta d-only">
            <div className="s15-box">
              <h2>Остались вопросы?</h2>
              <p>Свяжитесь с нами и мы ответим в ближайшее время</p>
              <button className="btn btn-light" type="button" onClick={() => window.dispatchEvent(new Event("fox:contact"))}>Связаться</button>
            </div>
          </div>
          <div className="s15-help m-only">
            <div className="s15-help-card">
              <div className="s15-chat"><img src="/figma/home/anna.webp" alt="" /><p><small>Анна, служба заботы</small><b>Здравствуйте! Чем помочь?</b></p></div>
              <h2>Не нашли ответ?</h2>
              <p>Напишите нам — ответим в течение одного рабочего дня и добавим вопрос в подборку.</p>
              <button className="btn btn-dark" type="button" onClick={() => window.dispatchEvent(new Event("fox:contact"))}>Задать вопрос</button>
              <a className="btn s15-tel" href="tel:+74953748305">+7 (495) 374-83-05</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** M45: the part of the product name that matches the search is highlighted. */
function Hit({ text, q }: { text: string; q: string }) {
  const needle = q.trim().toLowerCase();
  const at = needle.length >= 2 ? text.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="s10-hit">{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

/** M44: full-screen report page — pinch-zoom, swipe or arrows between pages, pager «n / N», Esc / × to close. */
function ReportViewer({ page, onPage, onClose }: { page: number; onPage: (n: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useDialog(ref, () => closeRef.current());
  const zoomed = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const total = REPORT_SLIDES.length;
  const go = (dir: number) => onPage((page + total + dir) % total);
  return (
    <div className="modal-back doc-back" onClick={() => closeRef.current()}>
      <div
        ref={ref}
        className="modal doc-viewer report-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Пример результата"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => { touch.current = event.touches.length === 1 && !zoomed.current ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }}
        onTouchMove={(event) => { if (event.touches.length > 1 || zoomed.current) touch.current = null; }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          const end = event.changedTouches[0];
          if (!start || !end) return;
          const dx = end.clientX - start.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(end.clientY - start.y)) go(dx < 0 ? 1 : -1);
        }}
      >
        <header className="doc-top">
          <h2 aria-live="polite">{page + 1} / {total}</h2>
          <button type="button" className="doc-x" onClick={() => closeRef.current()} aria-label="Закрыть">×</button>
        </header>
        <div className="doc-page rv-page">
          <ZoomPane resetKey={page} onZoomChange={(value) => { zoomed.current = value; }}>
            <img key={page} className="rv-img" ref={(img) => { if (img?.complete) img.classList.add("is-loaded"); }} onLoad={(event) => event.currentTarget.classList.add("is-loaded")} src={REPORT_SLIDES[page][0]} alt={`Страница отчёта ${page + 1} из ${total}: ${REPORT_SLIDES[page][1]}`} draggable={false} />
          </ZoomPane>
        </div>
        <footer className="rv-nav">
          <button type="button" aria-label="Предыдущая страница отчёта" onClick={() => go(-1)}><img src="/icons/arrow-left.svg" alt="" /></button>
          <button type="button" aria-label="Следующая страница отчёта" onClick={() => go(1)}><img src="/icons/arrow-right.svg" alt="" /></button>
        </footer>
      </div>
    </div>
  );
}
