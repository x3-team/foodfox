"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BottomSheet } from "@/components/BottomSheet";
import { useDialog } from "@/components/useDialog";
import { ZoomPane } from "@/components/ZoomPane";
import { articles, authors, CATEGORIES } from "@/lib/content";
import { PARTNERS, withUtm } from "@/lib/labs";

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
  ["Симптомы маскируются|под другие состояния","Усталость, головная боль, высыпания и проблемы с пищеварением похожи на десятки других причин. Их лечат по отдельности, а связь с рационом может оставаться незамеченной", ""],
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
  ["Хромолаб", "/figma/labs/fig/chromolab.svg"],
  ["Хеликс", "/figma/labs/fig/helix.svg"],
  ["Юнимед", "/figma/labs/fig/unimed.svg"],
];

const REPORT_SLIDES = [
  ["/figma/report/p4.webp", "Точные значения", "Уровень IgG в U/mL по каждому продукту."],
  ["/figma/report/p2.webp", "Группы продуктов", "13 групп вместо сплошного списка."],
  ["/figma/report/front.webp", "Понятная градация", "Сразу видно, что убрать в первую очередь."],
];

// M46: the lab networks of S12 in the same order as lib/labs.ts (counts there are for Moscow, the default city).
const LAB_DATA = LABS.map(([name], index) => PARTNERS[index] ?? PARTNERS.find((item) => item.name.toLowerCase() === name.toLowerCase()));

// S07 «286 продуктов»: the dots of /figma/home/shows/dots.svg (306 × 288) as separate points, ordered from the centre
// out — they come in as a wave, 8 мс apart (note 1401:796). Colour = the art's radial gradient (white 1 → .2).
const DOTS: Array<[number, number, number]> = [[153.1,116.1,5.1],[153.1,172.2,5.1],[121.2,116.1,5.1],[121.2,172.2,5.1],[184.9,116.1,5.1],[184.9,172.2,5.1],[89.9,116.1,4.46],[89.9,172.2,4.46],[216.2,116.1,4.46],[216.2,172.2,4.46],[153.1,59.9,5.1],[153.1,228.3,5.1],[121.8,59.9,4.46],[184.3,59.9,4.46],[121.8,228.3,4.46],[184.3,228.3,4.46],[59.9,116.1,3.83],[59.9,172.2,3.83],[246.2,116.1,3.83],[246.2,172.2,3.83],[91.8,59.9,3.83],[91.8,228.3,3.83],[214.3,59.9,3.83],[214.3,228.3,3.83],[30.6,116.1,3.83],[30.6,172.2,3.83],[275.5,116.1,3.83],[275.5,172.2,3.83],[62.5,59.9,3.83],[62.5,228.3,3.83],[243.6,59.9,3.83],[243.6,228.3,3.83],[153.1,283.8,4.46],[153.1,4.5,4.46],[34.4,59.9,2.55],[34.4,228.3,2.55],[271.7,59.9,2.55],[271.7,228.3,2.55],[123.1,4.5,3.83],[183,4.5,3.83],[123.1,283.8,3.83],[183,283.8,3.83],[2.6,116.1,2.55],[2.6,172.2,2.55],[303.6,116.1,2.55],[303.6,172.2,2.55],[93.7,4.5,3.83],[93.7,283.8,3.83],[212.4,4.5,3.83],[212.4,283.8,3.83]];
const dotAlpha = (x: number, y: number) => 1 - 0.8 * Math.min(1, Math.hypot((x - 153.05) / 153.05, (y - 144.12) / 144.12));

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
  const [faq, setFaq] = useState(0);
  const showsRef = useRef<HTMLElement>(null);
  const [showOn, setShowOn] = useState(0);
  const [suggest, setSuggest] = useState(false);
  const [reportPage, setReportPage] = useState(0);
  // M44: the page that leaves curls away over the left edge while the next one already lies underneath.
  const [curl, setCurl] = useState<{ src: string; n: number; dir: 1 | -1 } | null>(null);
  // S08 note: clicks during a page turn are ignored. The lock is held until the new page has actually landed
  // (animationend of the incoming page), not by a 450 мс timer from the click (WIDE-DIFF 8.5/8.6).
  const turning = useRef(false);
  const turnTimer = useRef<number | undefined>(undefined);
  const s08Ref = useRef<HTMLElement>(null);
  const shotRef = useRef<HTMLImageElement>(null);
  // WIDE-DIFF 8.5: every page is fetched and decoded before it is shown — the turn used to cross-fade an empty white
  // box while the next page was still loading and then the picture snapped in.
  const slideReady = useRef<Map<string, Promise<void>>>(new Map());
  const loadSlide = (src: string) => {
    let ready = slideReady.current.get(src);
    if (!ready) {
      const img = new Image();
      img.src = src;
      ready = img.decode().catch(() => undefined);
      slideReady.current.set(src, ready);
    }
    return ready;
  };
  useEffect(() => {
    const section = s08Ref.current;
    if (!section) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      REPORT_SLIDES.forEach(([src]) => loadSlide(src));
      io.disconnect();
    }, { rootMargin: "1200px 0px" });
    io.observe(section);
    return () => io.disconnect();
  }, []);
  const [turnDir, setTurnDir] = useState<1 | -1>(1);
  const turnReport = async (dir: 1 | -1) => {
    if (turning.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    turning.current = true;
    const next = (reportPage + REPORT_SLIDES.length + dir) % REPORT_SLIDES.length;
    // a page that is slow to arrive must not freeze the arrows: give up waiting after 1.5 s
    await Promise.race([loadSlide(REPORT_SLIDES[next][0]), new Promise((done) => window.setTimeout(done, 1500))]);
    setTurnDir(dir);
    setCurl({ src: REPORT_SLIDES[reportPage][0], n: Date.now(), dir });
    setReportPage(next);
    // the deal takes 780 мс, the reduced-motion fade 160 мс; animationend releases the
    // lock, this is only the safety net
    window.clearTimeout(turnTimer.current);
    turnTimer.current = window.setTimeout(() => { turning.current = false; }, reduce ? 300 : 1000);
  };
  const turnDone = () => { window.clearTimeout(turnTimer.current); turning.current = false; };
  // The incoming page stays the same <img> (no remount by key): its src changes to an already decoded file and the
  // entry animation is restarted in place, so there is never a frame with an empty layer.
  const firstShot = useRef(true);
  useLayoutEffect(() => {
    if (firstShot.current) { firstShot.current = false; return; }
    const img = shotRef.current;
    if (!img) return;
    img.style.animation = "none";
    void img.offsetWidth;
    img.style.animation = "";
  }, [reportPage]);
  const reportDrag = useRef<number | null>(null);
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
  // M46: on phones a tap on a lab tile opens the bottom sheet of that network.
  const [labSheet, setLabSheet] = useState<number | null>(null);
  // M43: groups are accordions — several can be open at once. The height of a group the visitor opens or closes
  // animates (280 мс) and its rows unfold; the group that is open on load does not play anything (before, every
  // load on a phone played the rows' unfold).
  const [openGroups, setOpenGroups] = useState<string[]>(["gut"]);
  const [unfolded, setUnfolded] = useState<string[]>([]);
  const groupFrom = useRef<{ id: string; h: number } | null>(null);
  const toggleGroup = (id: string) => {
    const node = document.getElementById(`s06-${id}`);
    if (node && window.matchMedia("(max-width: 767px)").matches) groupFrom.current = { id, h: node.offsetHeight };
    setUnfolded((list) => (list.includes(id) ? list : [...list, id]));
    setOpenGroups((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  };
  useLayoutEffect(() => {
    const from = groupFrom.current;
    groupFrom.current = null;
    const node = from && document.getElementById(`s06-${from.id}`);
    if (!from || !node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = node.offsetHeight;
    if (to === from.h) return;
    node.animate([{ height: `${from.h}px`, overflow: "hidden" }, { height: `${to}px`, overflow: "hidden" }], { duration: 280, easing: "cubic-bezier(.2, .8, .2, 1)" });
  }, [openGroups]);
  const symRowRef = useRef<HTMLDivElement>(null);
  const checkerRef = useRef<HTMLElement>(null);
  const [checkerBar, setCheckerBar] = useState(false);
  const scaleRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
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
    // the pager under the row (frame 1424:48354): the dot of the most visible card stretches to 20px
    const cards = [...row.querySelectorAll<HTMLElement>(".sym-card")];
    const dots = [...(row.parentElement?.querySelectorAll<HTMLElement>(".sym-pager i") ?? [])];
    const ratio = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratio.set(entry.target, entry.intersectionRatio);
          entry.target.classList.toggle("is-active", entry.intersectionRatio >= 0.75);
        });
        let best = 0;
        cards.forEach((card, index) => {
          if ((ratio.get(card) ?? 0) > (ratio.get(cards[best]) ?? 0) + 0.01) best = index;
        });
        dots.forEach((dot, index) => dot.classList.toggle("is-on", index === best));
      },
      { root: row, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    cards.forEach((card) => io.observe(card));
    return () => io.disconnect();
  }, []);

  // Scroll-linked scenes: S03 words, S04 deck, S11 photo parallax. One rAF-batched pass per frame —
  // every rect is read first and styles are written after, and only for the scenes near the viewport
  // (before: three handlers wrote styles on every scroll event, the deck read layout between writes).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const scale = scaleRef.current;
    const words = scale ? [...scale.querySelectorAll<HTMLElement>("[data-word]")] : [];
    const wordLast = words.map(() => -1);
    const deck = deckRef.current;
    const stage = deck?.querySelector<HTMLElement>(".deck-stage") ?? null;
    const cards = deck ? [...deck.querySelectorAll<HTMLElement>(".deck-card")] : [];
    const cardIns = cards.map((card) => card.querySelector<HTMLElement>(".deck-in"));
    const shownCard = cards.map(() => false);
    let deckLive = false;
    const edges = deck ? [...deck.querySelectorAll<HTMLElement>(".deck-edge")] : [];
    const austria = austriaRef.current;
    const photo = austria?.querySelector<HTMLElement>("img.parallax") ?? null;
    // M40: on phones the hero photo scrolls away slower than the page (parallax 0.8)
    const heroPhoto = document.querySelector<HTMLElement>('[data-s="s01"] .hero-media picture');
    // S07 (note 1401:796, storyboard 1410:1416): the left column is sticky, the three cards ride past it; the card
    // nearest to the middle of the viewport is the active one (1), the others .55.
    const shows = showsRef.current;
    const showCards = shows ? [...shows.querySelectorAll<HTMLElement>(".show-card")] : [];
    let showLast = -1;
    const phone = window.matchMedia("(max-width: 767px)");
    // inline styles are written only when the value changes
    const last = new Map<HTMLElement, Record<string, string>>();
    const put = (node: HTMLElement | null, prop: string, value: string) => {
      if (!node) return;
      const seen = last.get(node) ?? {};
      if (seen[prop] === value) return;
      seen[prop] = value;
      last.set(node, seen);
      node.style.setProperty(prop, value);
    };
    const geo = { vh: 0, mode: "", pad: 0, top: 0, travel: 1, cardH: 558, start: 800, scaleH: 0, heights: [] as number[] };
    const measure = () => {
      geo.vh = window.innerHeight;
      geo.scaleH = scale?.offsetHeight ?? 0;
      let mode = "list";
      if (reduce) mode = "static";
      else if (stage && getComputedStyle(stage).position === "sticky") mode = "pinned";
      if (deck && stage) {
        geo.top = parseFloat(getComputedStyle(stage).top) || 0;
        geo.pad = parseFloat(getComputedStyle(deck).paddingTop) || 0;
        geo.travel = Math.max(1, deck.offsetHeight - stage.offsetHeight - geo.pad * 2);
        geo.cardH = cards[0]?.offsetHeight ?? 558;
        // the next card waits just under the bottom edge of the viewport and slides up over the deck
        geo.start = Math.max(geo.vh - geo.top, geo.cardH) + 16;
        geo.heights = cards.map((card) => card.offsetHeight);
      }
      if (heroPhoto && (!phone.matches || reduce)) {
        heroPhoto.style.removeProperty("transform");
        last.delete(heroPhoto);
      }
      if (mode !== geo.mode) {
        cards.forEach((card, index) => {
          ["transform", "opacity", "border-radius", "--cover"].forEach((prop) => card.style.removeProperty(prop));
          cardIns[index]?.style.removeProperty("filter");
          card.classList.remove("is-shown");
          shownCard[index] = false;
        });
        deck?.classList.remove("is-live");
        deckLive = false;
        edges.forEach((edge) => ["transform", "opacity"].forEach((prop) => edge.style.removeProperty(prop)));
        last.clear();
        geo.mode = mode;
      }
    };
    const near = (rect: DOMRect, margin = 200) => rect.bottom > -margin && rect.top < geo.vh + margin;
    let raf = 0;
    const update = () => {
      raf = 0;
      // read
      const scaleRect = scale && !reduce ? scale.getBoundingClientRect() : null;
      const deckRect = deck && geo.mode !== "static" ? deck.getBoundingClientRect() : null;
      const cardTops = deckRect && geo.mode === "list" && near(deckRect) ? cards.map((card) => card.getBoundingClientRect().top) : null;
      const ausRect = austria && photo && !reduce ? austria.getBoundingClientRect() : null;
      const showsRect = shows ? shows.getBoundingClientRect() : null;
      // S07: which card is on
      if (showsRect && near(showsRect)) {
        const middle = geo.vh / 2;
        let on = 0;
        let best = Infinity;
        showCards.forEach((card, index) => {
          const rect = card.getBoundingClientRect();
          const distance = Math.abs(rect.top + rect.height / 2 - middle);
          if (distance < best) {
            best = distance;
            on = index;
          }
        });
        if (on !== showLast) {
          showLast = on;
          setShowOn(on);
        }
      }
      // write · S03: words come out of blur 12 / opacity .18 one after another while the section is pinned
      if (scaleRect && near(scaleRect, 0)) {
        const total = geo.scaleH - geo.vh;
        const progress = total <= 0 ? 1 : clamp(-scaleRect.top / (total * 0.85));
        words.forEach((word, index) => {
          const local = Math.round(clamp(progress * words.length - index) * 20) / 20;
          if (local === wordLast[index]) return;
          wordLast[index] = local;
          word.style.filter = local >= 1 ? "none" : `blur(${(12 * (1 - local)).toFixed(1)}px)`;
          word.style.opacity = local >= 1 ? "1" : (0.18 + 0.82 * local).toFixed(3);
        });
      }
      // S04 · desktop (note 1401:784, storyboard 1407:1817). The cards hold at top 80 + i × 12 px; the next one slides
      // up over the deck from under the viewport (scale .96 → 1, radius 32 → 24); the one it covers goes into the
      // stack in place (scale 1 → .94 from its top edge, opacity 1 → .55, a real blur 0 → 3 px), so the edges of the
      // earlier cards stay visible above, 12 px apart. Everything is scrubbed by the scroll; the content of a card
      // comes in with a 60 мс stagger once the card is mostly in. `will-change` only while the deck is near.
      const live = Boolean(deckRect && geo.mode === "pinned" && near(deckRect, 400));
      if (deck && live !== deckLive) {
        deckLive = live;
        deck.classList.toggle("is-live", live);
      }
      if (deckRect && geo.mode === "pinned" && near(deckRect, 0)) {
        // 0 at the moment the stage pins (deck top + padding = stage top); the last card is in place at 90% of the
        // pinned travel, so the finished stack («3 наверху», storyboard) holds for a moment before the section leaves
        const progress = clamp((geo.top - geo.pad - deckRect.top) / (geo.travel * 0.9)) * (cards.length - 1);
        cards.forEach((card, index) => {
          const rel = index - progress;
          let y = 12 * index;
          let size = 1;
          let opacity = 1;
          let blur = 0;
          let radius = 24;
          if (rel <= 0) {
            const step = Math.min(1, -rel);
            size = 1 - 0.06 * step;
            opacity = 1 - 0.45 * step;
            blur = 3 * step;
          } else {
            const t = Math.min(1, rel);
            y += geo.start * t;
            size = 1 - 0.04 * t;
            radius = 24 + 8 * t;
          }
          put(card, "transform", `translate3d(0, ${y.toFixed(1)}px, 0) scale(${size.toFixed(4)})`);
          put(card, "opacity", opacity.toFixed(3));
          // blur and radius change the card's raster, so they move in small steps (½ px blur, 1 px radius) rather than every frame
          const blurStep = Math.round(blur * 2) / 2;
          put(cardIns[index], "filter", blurStep > 0 ? `blur(${blurStep.toFixed(2)}px)` : "none");
          put(card, "border-radius", `${Math.round(radius)}px`);
          const shown = rel < 0.35;
          if (shown !== shownCard[index]) {
            shownCard[index] = shown;
            card.classList.toggle("is-shown", shown);
          }
        });
        // the strips under the first card: card 2's strip fades as card 2 leaves the deck,
        // card 3's strip moves up into its place (hidden under card 2 by then) and fades when card 3 leaves
        if (edges[0]) put(edges[0], "opacity", (1 - clamp(progress / 0.3)).toFixed(3));
        if (edges[1]) {
          const move = clamp((progress - 0.35) / 0.5);
          const eased = move * move * (3 - 2 * move);
          put(edges[1], "transform", `translate3d(0, ${(49 - 25 * eased).toFixed(1)}px, 0) scale(${(0.807 + 0.0785 * eased).toFixed(4)})`);
          put(edges[1], "opacity", (1 - clamp((progress - 1) / 0.3)).toFixed(3));
        }
      }
      // S04 · phone/tablet (M41): the next sticky card slides over this one — it shrinks to .94 and darkens by 20%
      if (cardTops) {
        cards.forEach((card, index) => {
          const next = cardTops[index + 1];
          const cover = next === undefined ? 0 : clamp((cardTops[index] + geo.heights[index] - next) / geo.heights[index]);
          put(card, "--cover", cover.toFixed(3));
        });
      }
      if (heroPhoto && phone.matches && !reduce) {
        const y = window.scrollY;
        if (y < geo.vh * 1.5) put(heroPhoto, "transform", `translate3d(0, ${(y * 0.2).toFixed(1)}px, 0)`);
      }
      // S11: the photo drifts ±40px
      if (ausRect && photo && near(ausRect)) {
        put(photo, "transform", `translate3d(0, ${Math.max(-40, Math.min(40, ausRect.top * -0.08)).toFixed(1)}px, 0)`);
      }
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    // section heights above the deck settle once fonts and images arrive
    const settle = window.setTimeout(onResize, 1200);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // S09 (note 1401:808, storyboard 1410:1799): the column under the pointer becomes active — the lime mask opens
  // from the side the pointer came in (clip-path, 550ms); between neighbours it moves over without closing:
  // the old one shuts towards the new column while the new one opens from the shared edge. Step 1 is active
  // by default on touch only (storyboard: «Без hover · все колонки белые», «Тач / дефолт · активен шаг 1»). Before: step 1 stayed green for good, the hover mask was dark #101400 and
  // opened only from the left, two columns could look active at once.
  useEffect(() => {
    const grid = stepsRef.current;
    if (!grid || !window.matchMedia("(hover: hover)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = [...grid.querySelectorAll<HTMLElement>(".step")];
    const masks = steps.map((step) => step.querySelector<HTMLElement>(".step-mask"));
    const SHUT_L = "inset(0 100% 0 0)";
    const SHUT_R = "inset(0 0 0 100%)";
    // Storyboard 1410:1799 «Без hover · все колонки белые»: with a mouse no column is active until the pointer is over
    // one (step 1 stays active by default only on touch). The server marks step 1; it is cleared here without a wipe.
    let active = -1;
    grid.classList.add("is-instant");
    steps.forEach((step) => step.removeAttribute("data-on"));
    masks.forEach((mask) => mask?.style.removeProperty("clip-path"));
    void grid.offsetWidth;
    grid.classList.remove("is-instant");
    const enter = (index: number, event: PointerEvent) => {
      if (event.pointerType !== "mouse" || index === active) return;
      const prev = active;
      active = index;
      if (prev >= 0) steps[prev].removeAttribute("data-on");
      steps[index].setAttribute("data-on", "");
      if (reduce) return;
      const old = prev >= 0 ? masks[prev] : null;
      const mask = masks[index];
      if (old) old.style.clipPath = index > prev ? SHUT_R : SHUT_L;
      if (!mask) return;
      const rect = steps[index].getBoundingClientRect();
      mask.style.transition = "none";
      mask.style.clipPath = event.clientX < rect.left + rect.width / 2 ? SHUT_L : SHUT_R;
      void mask.offsetWidth;
      mask.style.transition = "";
      mask.style.clipPath = "inset(0 0 0 0)";
    };
    // the pointer leaves the row: the active mask closes towards the side it left by
    const leave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || active < 0) return;
      const prev = active;
      active = -1;
      steps[prev].removeAttribute("data-on");
      if (reduce) return;
      const rect = steps[prev].getBoundingClientRect();
      const mask = masks[prev];
      if (mask) mask.style.clipPath = event.clientX < rect.left + rect.width / 2 ? SHUT_L : SHUT_R;
    };
    const handlers = steps.map((step, index) => {
      const handler = (event: PointerEvent) => enter(index, event);
      step.addEventListener("pointerenter", handler);
      return handler;
    });
    grid.addEventListener("pointerleave", leave);
    return () => {
      steps.forEach((step, index) => step.removeEventListener("pointerenter", handlers[index]));
      grid.removeEventListener("pointerleave", leave);
    };
  }, []);

  // M46 / M47: the press state of the lab tiles (.97) and blog cards (.98) on touch. `:active` alone is not reliable
  // on touch screens (iOS Safari does not set it without a touch listener; it is not set at all in the touch
  // emulation the checks run in), so a touch adds .is-pressed until the finger is lifted or the gesture becomes a scroll.
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    let pressed: Element | null = null;
    let since = 0;
    // a quick tap still shows the whole press (the 120 мс scale) before it springs back
    const release = () => {
      const node = pressed;
      pressed = null;
      if (node) window.setTimeout(() => node.classList.remove("is-pressed"), Math.max(0, 120 - (performance.now() - since)));
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      release();
      pressed = (event.target as Element).closest('[data-s="s12"] .lab-tile, [data-s="s14"] .blog-home-card');
      since = performance.now();
      pressed?.classList.add("is-pressed");
    };
    main.addEventListener("pointerdown", down, { passive: true });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => main.addEventListener(type, release, { passive: true }));
    return () => {
      main.removeEventListener("pointerdown", down);
      ["pointerup", "pointercancel", "pointerleave"].forEach((type) => main.removeEventListener(type, release));
    };
  }, []);

  // M48: «Не нашли ответ?» — the chat bubble first «types» (three dots), then shows the text; once, when the
  // card comes into view.
  useEffect(() => {
    const card = helpRef.current;
    if (!card) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      card.dataset.played = "1";
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(card);
    return () => io.disconnect();
  }, []);

  // S07: the graphics of a card (dots wave, rings drawn, level chips) play once — when the card is first
  // shown — and do not replay on every swap or when scrolling back. `data-played` is not owned by React,
  // so the class changes of the swap keep it.
  useEffect(() => {
    const section = showsRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        const card = entry.target as HTMLElement;
        if (entry.isIntersecting && getComputedStyle(card).visibility !== "hidden" && card.offsetHeight > 0) card.dataset.played = "1";
      }),
      { threshold: 0.35 },
    );
    section.querySelectorAll(".show-card").forEach((card) => io.observe(card));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const section = showsRef.current;
    const card = section?.querySelectorAll<HTMLElement>(".show-card")[showOn];
    if (!section || !card) return;
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) card.dataset.played = "1";
  }, [showOn]);

  // S10: the counter runs 0 → 286 (900ms, ease-out) when it comes into view. The digits are written straight into the
  // node — before, setCount re-rendered the whole HomePage on every frame of the count.
  useEffect(() => {
    const node = countRef.current?.querySelector<HTMLElement>("[data-antigen-count]");
    if (!node || antigenAnimated || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.textContent = "0";
    let raf = 0;
    const run = () => {
      if (antigenAnimated) return;
      antigenAnimated = true;
      io.disconnect();
      window.removeEventListener("hashchange", onHash);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 900);
        node.textContent = String(Math.round(286 * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) run(); }, { threshold: 0 });
    // S10: starts as soon as the number enters the viewport (the −10% bottom margin held it at «0» for ~1 s of a slow scroll).
    // An anchor jump to #products scrolls smoothly for ~600 мс; the count starts at the jump itself, not on arrival.
    const onHash = () => { if (location.hash === "#products") run(); };
    window.addEventListener("hashchange", onHash);
    io.observe(node);
    return () => {
      io.disconnect();
      window.removeEventListener("hashchange", onHash);
      cancelAnimationFrame(raf);
      node.textContent = "286";
    };
  }, []);

  // S13 (note 1401:826, storyboard 1411:1551): the reviews strip drifts left ~60px/s, stops under the pointer and
  // can be dragged; the arrows next to the title (the note's «drag и стрелки») move it by one card with an ease-out
  // glide (500 мс), and the strip also stops while the pointer is on them. Under reduced motion and on touch screens
  // the strip does not drift: it scrolls by hand and the arrows scroll it by one card, disabled at the ends.
  const reviewStep = useRef<((dir: 1 | -1) => void) | null>(null);
  const [reviewEdge, setReviewEdge] = useState<{ prev: boolean; next: boolean }>({ prev: false, next: false });
  useEffect(() => {
    const row = reviewsRef.current;
    const track = row?.querySelector<HTMLElement>(".review-track");
    const arrows = row?.parentElement?.querySelector<HTMLElement>(".s13-arrows") ?? null;
    if (!row || !track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cardStarts = () => {
      const base = track.getBoundingClientRect().left;
      return [...track.querySelectorAll<HTMLElement>(".review-card")].filter((card) => card.offsetWidth > 0).map((card) => card.getBoundingClientRect().left - base);
    };
    if (reduce || window.matchMedia("(max-width: 767px), (hover: none)").matches) {
      const edges = () => {
        const max = row.scrollWidth - row.clientWidth;
        setReviewEdge((old) => {
          const next = { prev: row.scrollLeft <= 1, next: row.scrollLeft >= max - 1 };
          return old.prev === next.prev && old.next === next.next ? old : next;
        });
      };
      reviewStep.current = (dir) => {
        const starts = cardStarts();
        const at = row.scrollLeft;
        const target = dir > 0 ? starts.find((x) => x > at + 2) : [...starts].reverse().find((x) => x < at - 2);
        row.scrollTo({ left: target ?? (dir > 0 ? row.scrollWidth : 0), behavior: reduce ? "auto" : "smooth" });
      };
      edges();
      row.addEventListener("scroll", edges, { passive: true });
      return () => {
        reviewStep.current = null;
        row.removeEventListener("scroll", edges);
      };
    }
    // the wrap period is the distance between a card and its twin in the second copy: scrollWidth / 2 misses the
    // trailing gap, so the strip jumped 8–9 px at every seam and the prev arrow landed between cards
    const period = () => {
      const starts = cardStarts();
      const n = starts.length / 2;
      return n >= 1 && Number.isInteger(n) ? starts[n] - starts[0] : track.scrollWidth / 2;
    };
    let half = period();
    const ro = new ResizeObserver(() => {
      half = period();
    });
    ro.observe(track);
    let raf = 0;
    let visible = false;
    let hover = false;
    let drag: { x: number; from: number; id: number } | null = null;
    let glide: { from: number; to: number; t0: number } | null = null;
    // `offset` is not wrapped (only what is painted is), so a glide never jumps across the seam of the two copies
    let offset = 0;
    let last = 0;
    const paint = () => {
      const shown = half > 0 ? ((offset % half) + half) % half : offset;
      track.style.transform = `translate3d(${(-shown).toFixed(2)}px, 0, 0)`;
    };
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 0;
      last = now;
      if (glide) {
        const t = Math.min(1, (now - glide.t0) / 500);
        offset = glide.from + (glide.to - glide.from) * (1 - Math.pow(1 - t, 3));
        paint();
        if (t >= 1) glide = null;
      } else if (!hover && !drag) {
        offset += (dt / 1000) * 60;
        paint();
      }
      if (visible) raf = requestAnimationFrame(tick);
    };
    const run = () => {
      if (!raf && visible) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    reviewStep.current = (dir) => {
      if (half <= 0) return;
      const from = glide ? glide.to : offset;
      const at = ((from % half) + half) % half;
      const starts = cardStarts().flatMap((x) => [x - half, x]);
      const target = dir > 0 ? starts.find((x) => x > at + 2) : [...starts].reverse().find((x) => x < at - 2);
      if (target === undefined) return;
      glide = { from: offset, to: from + (target - at), t0: performance.now() };
      run();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) run();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(row);
    const enter = () => {
      hover = true;
    };
    const leave = () => {
      hover = false;
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      glide = null;
      drag = { x: event.clientX, from: offset, id: event.pointerId };
      row.setPointerCapture(event.pointerId);
      row.classList.add("is-dragging");
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      offset = drag.from - (event.clientX - drag.x);
      paint();
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      row.classList.remove("is-dragging");
    };
    const zones = [row, arrows].filter((node): node is HTMLElement => Boolean(node));
    zones.forEach((node) => {
      node.addEventListener("mouseenter", enter);
      node.addEventListener("mouseleave", leave);
    });
    row.addEventListener("pointerdown", down);
    row.addEventListener("pointermove", move);
    row.addEventListener("pointerup", up);
    row.addEventListener("pointercancel", up);
    return () => {
      reviewStep.current = null;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      zones.forEach((node) => {
        node.removeEventListener("mouseenter", enter);
        node.removeEventListener("mouseleave", leave);
      });
      row.removeEventListener("pointerdown", down);
      row.removeEventListener("pointermove", move);
      row.removeEventListener("pointerup", up);
      row.removeEventListener("pointercancel", up);
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

  // S10 (note 1399:605): the card crossfades (200 мс) when another product is picked — not on page load
  // (before, the fade of the phone note M40 also played on the desktop card as soon as the page loaded).
  const [cardSwapped, setCardSwapped] = useState(false);
  const firstPicked = useRef(picked.name);
  useEffect(() => {
    if (picked.name !== firstPicked.current) setCardSwapped(true);
  }, [picked.name]);

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
              <source srcSet="/figma/home/hero-desktop.webp 1440w, /figma/home/hero-desktop@2x.webp 2880w" sizes="(min-width: 1440px) 1440px, max(100vw, min(1440px, max(896px, 160vh)))" type="image/webp" />
              <img className="bg" src="/figma/home/hero-desktop.jpg" alt="" />
            </picture>
          </div>
          <div className="shade" aria-hidden />
          <div className="wrap inner">
            <div className="hero-top">
              {/* S01 / M40: the title comes in line by line — each line is its own box */}
              <h1>
                <span className="hero-h1-mobile">
                  <span className="h1-line">Узнайте, какие</span> <span className="h1-line">продукты не подходят</span> <span className="h1-line">именно вам</span>
                </span>
                <span className="hero-h1-desktop">
                  <span className="h1-line">Узнайте, какие продукты</span>
                  <br />
                  <span className="h1-line">не подходят именно вам</span>
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
            <img className="scale-bubbles" src="/figma/home/bubbles.svg" alt="" />
            <p className="scale-note">¹ Оценка распространённости пищевой непереносимости. Источник — ссылка на исследование (предоставит клиент)</p>
          </div>
        </section>

        <section className="deck" ref={deckRef} data-deck data-s="s04">
          {/* Figma S04 1385:578 (desktop deck 1385:579) · 1426:48571 (mobile list) */}
          <div className="deck-stage">
            {/* Desktop rest state of 1385:579: the bottom edges of cards 2 and 3 peek under the first one.
                They are separate strips, so the real next card can slide in over the deck from below. */}
            {DECK.slice(1).map(([title], index) => (
              <i className="deck-edge" key={title} aria-hidden style={{ ["--i" as string]: index + 1, backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 56%, rgba(0,0,0,.4)), image-set(url(/figma/home/deck/card-${index + 2}.webp) 1x, url(/figma/home/deck/card-${index + 2}@2x.webp) 2x)` }} />
            ))}
            {DECK.map(([title, text, tail], index) => {
              const body = (heading: ReactNode) => (
                <>
                  <img className="deck-bg" src={`/figma/home/deck/card-${index + 1}.webp`} srcSet={`/figma/home/deck/card-${index + 1}.webp 1118w, /figma/home/deck/card-${index + 1}@2x.webp 2236w`} sizes="(min-width: 768px) 1118px, 800px" alt="" />
                  {heading}
                  <div className="deck-foot">
                    <img className="deck-icon" src={`/figma/home/deck/icon-${index + 1}.svg`} alt="" />
                    <p>{text}{tail && <span className="deck-tail">{tail}</span>}<span className="deck-dot">.</span></p>
                  </div>
                </>
              );
              const words = <>{title.split("|")[0]}<br className="deck-br" /> {title.split("|")[1]}</>;
              return (
                <article className="deck-card" key={title} data-i={index} style={{ ["--i" as string]: index }}>
                  {/* S04: the leaving card's blur (0 → 3 px) is a real `filter` on this box — inside the card's layer, so
                      it is rasterised with the card instead of being re-applied by the compositor on every frame */}
                  <div className="deck-in">{body(<h2>{words}</h2>)}</div>
                </article>
              );
            })}
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
                ["Вес и отёчность", ["Трудно снизить вес", "Стойкая отёчность", "Отёки лица по утрам", "Колебания веса"], "/figma/symptoms/s6-card.webp"],
              ].map(([title, chips, src], index) => (
                <article
                  className="sym-card"
                  key={title as string}
                  data-contrast="photo"
                  onClick={() => {
                    // M42: on phones a tap scrolls to the checker and opens the matching group.
                    if (!window.matchMedia("(max-width: 767px)").matches) return;
                    const id = ["skin", "gut", "well", "weight"][index];
                    setUnfolded((list) => (list.includes(id) ? list : [...list, id]));
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
            <div className="sym-pager" aria-hidden>{[0, 1, 2, 3].map((dot) => <i key={dot} className={dot === 0 ? "is-on" : undefined} />)}</div>
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
                  <div className={`symptom-group${openGroups.includes(groupItem.id) ? " is-open" : ""}${unfolded.includes(groupItem.id) ? " is-unfold" : ""}`} key={groupItem.id} id={`s06-${groupItem.id}`}>
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
                  {index === 0 && (
                    <div className="show-dots" aria-hidden>
                      {DOTS.map(([x, y, r], order) => (
                        <i
                          key={`${x}-${y}`}
                          style={{
                            left: `${((x - r) / 306.1) * 100}%`,
                            top: `${((y - r) / 288.24) * 100}%`,
                            width: `${((2 * r) / 306.1) * 100}%`,
                            ["--a" as string]: dotAlpha(x, y).toFixed(2),
                            ["--d" as string]: `${order * 8}ms`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {index === 1 && (
                    <div className="show-rings" aria-hidden data-allow-x>
                      {[0, 1, 2].map((ring) => <i key={ring}><svg viewBox="0 0 216 216"><circle cx="108" cy="108" r="107.5" pathLength={1} /></svg></i>)}
                    </div>
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

        <section data-s="s08" ref={s08Ref}>
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
                className={`s08-stack${curl ? " is-dealing" : ""}`}
                data-allow-x
                onTouchStart={(event) => { reportTouch.current = event.touches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => {
                  const start = reportTouch.current;
                  reportTouch.current = null;
                  const end = event.changedTouches[0]?.clientX;
                  if (start === null || end === undefined || Math.abs(end - start) < 40) return;
                  turnReport(end < start ? 1 : -1);
                }}
                // 8.6 (note 1303:2778): the page can also be dragged with a mouse on the desktop
                onPointerDown={(event) => { if (event.pointerType === "mouse" && event.button === 0 && !(event.target as HTMLElement).closest("button")) reportDrag.current = event.clientX; }}
                onPointerUp={(event) => {
                  const start = reportDrag.current;
                  reportDrag.current = null;
                  if (start === null || event.pointerType !== "mouse" || Math.abs(event.clientX - start) < 40) return;
                  turnReport(event.clientX < start ? 1 : -1);
                }}
                onPointerLeave={() => { reportDrag.current = null; }}
              >
                <button type="button" className="s08-nav prev" aria-label="Предыдущая страница отчёта" onClick={() => turnReport(-1)} />
                <i className="s08-sheet s08-sheet-3" aria-hidden />
                <i className="s08-sheet s08-sheet-2" aria-hidden />
                <img
                  ref={shotRef}
                  className={`s08-shot${turnDir < 0 ? " is-back" : ""}`}
                  src={REPORT_SLIDES[reportPage][0]}
                  alt=""
                  draggable={false}
                  onAnimationEnd={(event) => { if (event.target === event.currentTarget) turnDone(); }}
                  onClick={() => {
                    // M44: on phones a tap on the page opens the full-screen view with pinch-zoom.
                    if (window.matchMedia("(max-width: 1100px)").matches) setReportFull(true);
                  }}
                />
                {curl && <img className={`s08-shot s08-curl${curl.dir < 0 ? " is-back" : ""}`} key={curl.n} src={curl.src} alt="" aria-hidden onAnimationEnd={() => { setCurl(null); turnDone(); }} />}
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
          <div className="cards-3 steps" ref={stepsRef}>
            {STEPS.map(([step, title, text], index) => (
              // data-contrast: the lime of the active column is the mask layer, which the e2e contrast sampler cannot read
              <article className="step is-paper" key={step} data-on={index === 0 ? "" : undefined} data-contrast="figma">
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
            <p className="count-line"><strong data-antigen-count>286</strong><span className="d-only">пищевых антигенов из 13 групп · один забор крови</span><span className="m-only">антигенов · 13 групп</span></p>
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
            <article className={`panel s10-card${cardOpen ? " is-open" : ""}${cardSwapped ? " is-swapped" : ""}`}>
              <div className="s10-card-top">
                <span className="s10-tag">{picked.group}{picked.tag && picked.tag !== picked.group.toLowerCase() && /[A-Za-z]/.test(picked.tag) ? ` · ${picked.tag}` : ""}</span>
                <button type="button" className="s10-close" aria-label="Сбросить выбор" onClick={() => { setCardOpen(false); setQuery(""); setGroup("Все 286"); setPicked(PRODUCTS[0]); }}>✕</button>
              </div>
              {/* S10: the card switches with a 200 мс fade (head and facts re-mount per product) */}
              <div className="s10-card-head" key={`h-${picked.name}`}>
                <h3>{picked.name}</h3>
                <p>{picked.desc ?? `${picked.group}. В панели это отдельная позиция, не полка целиком.`}</p>
              </div>
              <dl className="s10-facts" key={`f-${picked.name}`}>
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
            {LABS.map(([name, slug], index) => {
              const away = LAB_DATA[index]?.here === false;
              return (
                <Link
                  className={`lab-tile${away ? " is-away" : ""}${labSheet === index ? " is-picked" : ""}`}
                  key={slug}
                  href="/labs"
                  aria-label={`Сдать тест в ${name}`}
                  aria-haspopup={phone ? "dialog" : undefined}
                  style={{ ["--k" as string]: index }}
                  onClick={(event) => {
                    // M46: on phones the tile opens the network's sheet instead of leaving the page
                    if (!window.matchMedia("(max-width: 767px)").matches || !LAB_DATA[index]) return;
                    event.preventDefault();
                    setLabSheet(index);
                  }}
                >
                  <span className="lab-logo-box"><img className="lab-logo" src={slug} alt="" /></span>
                  <span className="lab-go">Сдать тест<img src="/icons/arrow-up-right.svg" alt="" /></span>
                  {away && <small className="lab-away">нет в вашем городе</small>}
                </Link>
              );
            })}
            <Link className="lab-tile lab-tile-all" href="/labs" style={{ ["--k" as string]: LABS.length }}>
              <strong>1500+</strong>
              <small>пунктов в 9 сетях</small>
              <span className="lab-go">На карте<img src="/icons/arrow-up-right.svg" alt="" /></span>
              <em>Все на карте →</em>
              <small className="lab-all-m">1500+ точек</small>
            </Link>
          </div>
          <Link className="btn btn-dark s12-cta" href="/labs">Найти лабораторию рядом</Link>
          {labSheet !== null && LAB_DATA[labSheet] && (
            <LabSheet name={LABS[labSheet][0]} logo={LABS[labSheet][1]} lab={LAB_DATA[labSheet]!} onClose={() => setLabSheet(null)} />
          )}
        </section>

        <section className="band s13" data-s="s13">
          <div className="s13-head">
            <h2 className="page-title">Отзывы наших клиентов</h2>
            <div className="s13-arrows">
              <button type="button" className="s13-arrow prev" aria-label="Предыдущий отзыв" disabled={reviewEdge.prev} onClick={() => reviewStep.current?.(-1)} />
              <button type="button" className="s13-arrow next" aria-label="Следующий отзыв" disabled={reviewEdge.next} onClick={() => reviewStep.current?.(1)} />
            </div>
          </div>
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
            <div className="s15-help-card" ref={helpRef}>
              <div className="s15-chat"><img src="/figma/home/anna.webp" alt="" /><p><small>Анна, служба заботы</small><b>Здравствуйте! Чем помочь?</b><span className="s15-typing" aria-hidden><i /><i /><i /></span></p></div>
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

/**
 * M46 (note 1446:52107, storyboard 1446:52113): the bottom sheet of a lab network on phones — its points in the city,
 * that the price is set by the network, «Открыть на карте» and «Сайт сети». Only what lib/labs.ts knows is shown:
 * there is no price «от» and no distance to the nearest point in the site data, so neither is invented.
 */
function LabSheet({ name, logo, lab, onClose }: { name: string; logo: string; lab: (typeof PARTNERS)[number]; onClose: () => void }) {
  const away = !lab.here;
  return (
    <BottomSheet label={`Лаборатория ${name}`} className="lab-bs" onClose={onClose} portal>
      <div className="lab-bs-head">
        <span className="lab-bs-logo"><img src={logo} alt="" /></span>
        <h3>{name}</h3>
      </div>
      <p className="lab-bs-count">{away ? "Нет пунктов в Москве" : <>{lab.count} в Москве<span> · цена на сайте сети</span></>}</p>
      <div className="lab-bs-actions">
        {!away && <a className="btn btn-dark" href={withUtm(lab.href, "home_lab_sheet")} target="_blank" rel="noreferrer">Сайт сети</a>}
        <Link className={`btn ${away ? "btn-dark" : "btn-ghost"}`} href="/labs">{away ? "Где сдать рядом" : "Открыть на карте"}</Link>
      </div>
    </BottomSheet>
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
