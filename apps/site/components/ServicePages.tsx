"use client";

import Link from "next/link";
import { type CSSProperties, FormEvent, ReactNode, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { BottomSheet } from "@/components/BottomSheet";
import { useDialog } from "@/components/useDialog";
import { Footer } from "@/components/Footer";
import { Header, PARTNER_LOGIN } from "@/components/Header";
import { LabsMap, type Branch } from "@/components/LabsMap";
import { LeadForm } from "@/components/LeadForm";
import { useContent } from "@/components/ContentProvider";
import { withUtm } from "@/lib/labs";
import type { Review } from "@/lib/site-data/reviews";


export function FaqPage() {
  const content = useContent();
  const FAQ_GROUPS = useMemo(() => content.faqGroups(), [content]);
  const FAQ_NAV = FAQ_GROUPS.map((group) => [group.id, group.title, String(group.items.length)]);
  const [open, setOpen] = useState<string[]>([FAQ_GROUPS[0].items[0][0]]);
  const [q, setQ] = useState("");
  const [nav, setNav] = useState("method");
  const [showAll, setShowAll] = useState(false);
  const [flash, setFlash] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    // F01: search filters without reload, debounce 200мс, then a smooth scroll to the first match.
    const id = window.setTimeout(() => setDebounced(q), 200);
    return () => window.clearTimeout(id);
  }, [q]);
  useEffect(() => {
    if (debounced.trim().length < 2) return;
    const hit = document.querySelector<HTMLElement>(".f-groups mark.hit");
    hit?.closest("article")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [debounced]);
  useEffect(() => {
    const openHash = () => {
      const id = window.location.hash.replace("#", "");
      // F02: every question is an anchor — the link opens the page with the answer expanded and a 1.2 s lime highlight.
      const qa = FAQ_GROUPS.flatMap((group) => group.items.map((item, index) => ({ id: `${group.id}-${index + 1}`, question: item[0], group: group.id }))).find((item) => item.id === id);
      if (qa) {
        setShowAll(true);
        setNav(qa.group);
        setOpen((current) => (current.includes(qa.question) ? current : [...current, qa.question]));
        setFlash(qa.id);
        // M-note FAQ: the flash on the target question lasts 600 мс on phones (1.2 с on desktop).
        window.setTimeout(() => setFlash(""), window.matchMedia("(max-width: 767px)").matches ? 600 : 1200);
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
        return;
      }
      if (!FAQ_GROUPS.some((group) => group.id === id)) return;
      setShowAll(true);
      setNav(id);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 0);
    };
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => window.removeEventListener("hashchange", openHash);
  }, []);
  // M21: the list filters from the 2nd character (debounce 200 мс). Questions that drop out collapse by height
  // (200 мс) and only then leave the DOM; the ones that come back unfold the same way.
  const query = debounced.trim().length >= 2 ? debounced.trim().toLowerCase() : "";
  const [shownQuery, setShownQuery] = useState("");
  useEffect(() => {
    if (query === shownQuery) return;
    const id = window.setTimeout(() => setShownQuery(query), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200);
    return () => window.clearTimeout(id);
  }, [query, shownQuery]);
  // Word forms: «кровь» must find «крови» — every word of the query matches by its stem (the last letter of a word
  // longer than four letters is dropped).
  const stems = (value: string) => value.split(/\s+/).filter(Boolean).map((word) => (word.length > 4 ? word.slice(0, -1) : word));
  const hitQ = (item: readonly string[], value: string) => !value || stems(value).every((stem) => item.join(" ").toLowerCase().includes(stem));
  const CHIP_QUERY: Record<string, string> = { "Критика IgG": "критикуют", Подготовка: "готовиться", Детям: "детям", Сроки: "дней", Цена: "стоит" };
  const groups = FAQ_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hitQ(item, query) || hitQ(item, shownQuery)),
  })).filter((group) => group.items.length > 0);
  const found = query ? FAQ_GROUPS.reduce((sum, group) => sum + group.items.filter((item) => hitQ(item, query)).length, 0) : 0;
  const groupsRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  // M22 (≤1100): the section chips stick under the header (to the top once it slides away) with Shadow S; the active
  // chip scrolls into the visible part of the row; a tap scrolls to the section in 400 мс.
  useEffect(() => {
    const aside = navRef.current;
    if (!aside) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const cs = getComputedStyle(aside);
      aside.classList.toggle("is-stuck", cs.position === "sticky" && aside.getBoundingClientRect().top <= (parseFloat(cs.top) || 0) + 0.5 && window.scrollY > 0);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); };
  }, []);
  useEffect(() => {
    const row = navRef.current?.querySelector<HTMLElement>(".f-nav-links");
    const chip = row?.querySelector<HTMLElement>("a.is-on");
    if (!row || !chip || row.scrollWidth <= row.clientWidth + 1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [nav]);
  // F02 (desktop): scroll-spy — the section in view becomes the active item.
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1101px)").matches) return;
    const sections = [...(groupsRef.current?.querySelectorAll<HTMLElement>(":scope > section") ?? [])];
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setNav(hit.target.id);
    }, { rootMargin: "-120px 0px -60% 0px" });
    sections.forEach((section) => io.observe(section));
    return () => io.disconnect();
  }, [showAll, query]);
  const goSection = (id: string) => {
    window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) return;
      const header = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
      const aside = navRef.current;
      const stuck = aside && getComputedStyle(aside).position === "sticky" ? aside.offsetHeight : 0;
      const to = Math.max(0, target.getBoundingClientRect().top + window.scrollY - Math.max(0, header) - stuck - 12);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !stuck) {
        target.scrollIntoView({ behavior: "smooth" });
        return;
      }
      const from = window.scrollY;
      const t0 = performance.now();
      const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / 400);
        window.scrollTo({ top: from + (to - from) * ease(t), behavior: "instant" as ScrollBehavior });
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 0);
  };
  useLayoutEffect(() => {
    const root = groupsRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.querySelectorAll<HTMLElement>(".is-q-out:not([data-q='out'])").forEach((node) => {
      node.dataset.q = "out";
      node.getAnimations().forEach((anim) => anim.cancel());
      const h = node.offsetHeight;
      node.style.overflow = "hidden";
      node.animate([{ height: `${h}px`, opacity: 1 }, { height: "0px", opacity: 0, paddingTop: "0px", paddingBottom: "0px", marginTop: "0px", marginBottom: "0px", borderTopWidth: "0px", borderBottomWidth: "0px" }], { duration: 200, easing: "ease-out", fill: "forwards" });
    });
    root.querySelectorAll<HTMLElement>(".is-q-in:not([data-q='in'])").forEach((node) => {
      node.dataset.q = "in";
      node.style.overflow = "hidden";
      const h = node.offsetHeight;
      const anim = node.animate([{ height: "0px", opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 200, easing: "ease-out" });
      anim.onfinish = () => { node.style.overflow = ""; };
    });
  }, [query, shownQuery]);

  return (
    <>
      <Header />
      <main>
        <section className="dark-hero fx-hero" data-s="f01">
          <div className="wrap f01">
            <p className="crumbs"><Link href="/">Главная</Link><span className="sep">/</span><span aria-current="page">Вопросы и ответы</span></p>
            <div className="f01-row">
              <div className="f01-copy">
                <p className="fx-eye"><i />39 ответов · проверены экспертами FOX</p>
                <h1>Вопросы и ответы</h1>
                <p className="fx-lead"><span className="d-only">Коротко о методе, подготовке и том, как читать отчёт. Медицинскую интерпретацию по переписке не даём.</span><span className="m-only">О тесте, сдаче, результате и работе со специалистом.</span></p>
                <form className="search f-search" onSubmit={(event) => event.preventDefault()}>
                  <img src="/icons/search.svg" alt="" />
                  <input data-hotkey value={q} onChange={(event) => setQ(event.target.value)} placeholder="Например: anti-CCD, дети, цена" aria-label="Поиск по вопросам" />
                  <kbd>/</kbd>
                  <button className="btn btn-dark" type="submit">Найти</button>
                </form>
                <div className="chips">
                  {Object.entries(CHIP_QUERY).map(([item, term]) => (
                    <button key={item} className={`chip${q === term ? " is-active" : ""}`} aria-pressed={q === term} type="button" onClick={() => setQ(q === term ? "" : term)}>{item}</button>
                  ))}
                </div>
              </div>
              <div className="f01-visual">
                <img src="/figma/faq/hero.jpg" alt="" />
                <article>
                  <p>Самый частый вопрос</p>
                  <h2>Можно ли доверять FOX, если IgG-тесты критикуют?</h2>
                  <button type="button" onClick={() => { setOpen([FAQ_GROUPS[0].items[0][0]]); document.getElementById("method")?.scrollIntoView({ behavior: "smooth" }); }}>Читать ответ</button>
                </article>
                <p className="f01-expert"><img src="/figma/faq/expert.jpg" alt="" />Ответы проверил эксперт</p>
              </div>
            </div>
          </div>
        </section>

        <section data-s="f02">
          <div className="wrap f02">
            <aside className="f-nav" ref={navRef}>
              <div className="f-nav-links" data-allow-x>
              <p>Разделы</p>
              {FAQ_NAV.map(([id, title, count]) => (
                <a key={id} href={`#${id}`} className={nav === id ? "is-on" : ""} onClick={(event) => { event.preventDefault(); setNav(id); setShowAll(true); goSection(id); }}>
                  <span>{title}</span><b>{count}</b>
                </a>
              ))}
              </div>
              <article className="f-spec">
                <h2>Вы врач или нутрициолог?</h2>
                <p>Материалы для приёма и курс по отчёту — в отдельном разделе.</p>
                <Link href="/specialists">Специалистам <img src="/icons/arrow-right.svg" alt="" /></Link>
              </article>
            </aside>
            <div className="f-groups" ref={groupsRef}>
              {/* M21: «Найдено N» with a reset cross above the list; nothing found → «Такого вопроса пока нет». */}
              {query && found > 0 && (
                <p className="f-found" role="status">Найдено {found}<button type="button" aria-label="Сбросить поиск" onClick={() => setQ("")}>×</button></p>
              )}
              {query && found === 0 && (
                <article className="f-empty" role="status">
                  <h3>Такого вопроса пока нет</h3>
                  <p>Напишите — ответим за 1 рабочий день и добавим в FAQ.</p>
                  <button type="button" className="btn btn-dark" onClick={() => window.dispatchEvent(new Event("fox:contact"))}>Задать вопрос</button>
                </article>
              )}
              {groups.map((group, index) => (
                <section key={group.id} id={group.id} className={`${!query && !shownQuery && group.id !== nav ? "is-parked" : ""} ${!showAll && !query && !shownQuery && index > 1 ? "is-rest" : ""}${group.items.every((item) => !hitQ(item, query)) ? " is-q-out" : ""}`}>
                  <header><h2><span className="f-num">{String(index + 1).padStart(2, "0")}</span>{group.title}</h2><span>{group.count}</span></header>
                  {group.items.map(([question, answer]) => {
                    const expanded = open.includes(question);
                    const anchor = `${group.id}-${FAQ_GROUPS.find((item) => item.id === group.id)!.items.findIndex((item) => item[0] === question) + 1}`;
                    const mark = (text: string) => {
                      if (query.length < 2) return text;
                      const stem = stems(query)[0] ?? query;
                      const i = text.toLowerCase().indexOf(stem);
                      if (i < 0) return text;
                      // highlight the whole word the stem sits in
                      const end = i + stem.length + (text.slice(i + stem.length).match(/^[\p{L}\p{N}-]*/u)?.[0].length ?? 0);
                      return <>{text.slice(0, i)}<mark className="hit">{text.slice(i, end)}</mark>{text.slice(end)}</>;
                    };
                    return (
                      <article key={question} id={anchor} className={`${expanded ? "is-open" : ""}${flash === anchor ? " is-flash" : ""}${!hitQ([question, answer], query) ? " is-q-out" : !hitQ([question, answer], shownQuery) ? " is-q-in" : ""}`}>
                        {/* F02 (desktop): several answers can be open; M22 (phone): one at a time, like M14. */}
                        <button type="button" aria-expanded={expanded} onClick={() => setOpen((current) => expanded ? current.filter((item) => item !== question) : window.matchMedia("(max-width: 767px)").matches ? [question] : [...current, question])}>
                          <strong>{mark(question)}</strong>
                          <img src="/icons/chevron-down.svg" alt="" />
                        </button>
                        <div className="f-answer">
                          <div>
                            <p>{mark(answer)}</p>
                            <div className="f-actions">
                              <button
                                type="button"
                                className="f-link"
                                onClick={() => {
                                  const url = `${window.location.origin}${window.location.pathname}#${anchor}`;
                                  void navigator.clipboard?.writeText(url);
                                  window.history.replaceState(null, "", `#${anchor}`);
                                  window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text: "Ссылка скопирована", duration: 2500, type: "info" } }));
                                }}
                              >
                                Ссылка на ответ
                              </button>
                              <span>Ответ помог?</span>
                              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("fox:toast", { detail: "Спасибо, учтём" }))}>Да</button>
                              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("fox:toast", { detail: "Спасибо — напишите нам, чего не хватило" }))}>Нет</button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              ))}
              {!query && !showAll && (
                <button type="button" className="btn btn-ghost f-more" onClick={() => setShowAll(true)}>Показать все 39 вопросов</button>
              )}
            </div>
          </div>
        </section>

        <section data-s="f03">
          <div className="wrap">
            <article className="f03-card">
              <div>
                <p className="fx-kicker">Отвечаем в течение одного рабочего дня</p>
                <h2>Не нашли ответ?</h2>
                <p>Напишите в службу заботы. Дистанционно отчёт не интерпретируем — это разговор со специалистом, который вас ведёт.</p>
                <Link className="btn btn-dark" href="/contacts">Задать вопрос</Link>
                <p className="f03-phone"><a href={content.telHref}>{content.text("contacts.phone")}</a></p>
              </div>
              <div className="f03-photo">
                <img src="/figma/faq/consultant.jpg" alt="" />
                <p><b>Анна, служба заботы</b><span>Здравствуйте! Чем помочь?</span></p>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

const BRANCHES: Branch[] = [
  { id: "inv", lab: "Инвитро", address: "ул. Таганская, 3", metro: "Марксистская · 400 м", hours: "Пн–Пт 7:30–20:00 · Сб–Вс 8–18", lat: 55.7406, lng: 37.653 },
  { id: "cit", lab: "Ситилаб", address: "ул. Земляной Вал, 27", metro: "Курская · 500 м", hours: "Пн–Сб 8:00–20:00", lat: 55.7572, lng: 37.659 },
  { id: "gem", lab: "Гемотест", address: "ул. Марксистская, 9", metro: "Марксистская · 200 м", hours: "Открыто до 19:00", lat: 55.7374, lng: 37.656 },
  { id: "kdl", lab: "KDL", address: "Таганская пл., 12", metro: "Таганская · 150 м", hours: "Пн–Пт 7:30–20:00", lat: 55.7422, lng: 37.6538 },
  { id: "dnk", lab: "ДНКОМ", address: "ул. Воронцовская, 8", metro: "Таганская · 700 м", hours: "Пн–Сб 8:00–18:00", lat: 55.7348, lng: 37.658 },
];

const SPB: Branch[] = [
  { id: "inv-spb", lab: "Инвитро", address: "Невский пр., 114", metro: "Площадь Восстания · 600 м", hours: "Пн–Сб 8:00–20:00", lat: 59.9311, lng: 30.3609 },
  { id: "gem-spb", lab: "Гемотест", address: "Лиговский пр., 43", metro: "Площадь Восстания · 350 м", hours: "Пн–Вс 8:00–20:00", lat: 59.928, lng: 30.361 },
  { id: "helix-spb", lab: "Хеликс", address: "ул. Марата, 22", metro: "Маяковская · 200 м", hours: "Пн–Пт 7:30–19:00", lat: 59.926, lng: 30.355 },
];

const EMPTY: Branch[] = [];


// «Пн–Пт 7:30–20:00 · …» → «20:00»; «Открыто до 19:00» → «19:00»; «Пн–Пт 10–19» → «19:00».
function closesAt(hours: string) {
  const until = hours.match(/до (\d{1,2}:\d{2})/);
  if (until) return until[1];
  const range = hours.match(/\d{1,2}(?::\d{2})?–(\d{1,2})(?::(\d{2}))?/);
  return range ? `${range[1]}:${range[2] ?? "00"}` : "";
}

const NETS = ["Все сети", "Гемотест", "KDL", "ДНКОМ", "Ситилаб"];

// Card / Lab partner (1248:249): logos as in the L02 grid 1250:252 — no grey plate, own size inside a 120×36 slot.
const LAB_LOGOS: Record<string, [string, number, number]> = {
  "Ситилаб": ["/figma/labs/partners/citilab.svg", 91, 30],
  "Гемотест": ["/figma/labs/partners/gemotest.svg", 98, 10],
  KDL: ["/figma/labs/partners/kdl.svg", 101, 30],
  "ДНКОМ": ["/figma/labs/partners/dnkom.svg", 63, 30],
  INVITRO: ["/figma/labs/partners/invitro.png", 98, 27],
  CMD: ["/figma/labs/partners/cmd.svg", 120, 23],
  CHROMOLAB: ["/figma/labs/partners/chromolab.png", 112, 17],
  "Хеликс": ["/figma/labs/partners/helix.svg", 80, 30],
  "Юнимед": ["/figma/labs/partners/unimed.svg", 86, 30],
};

// «Смена города — поиск с подсказками» (1257:1065): the hint shows what we actually have for the city.
const CITY_HINTS: Array<[string, string]> = [
  ["Москва", "8 сетей · 128 отделений"],
  ["Санкт-Петербург", "3 сети · 3 отделения"],
  ["Екатеринбург", "пока нет партнёров"],
  ["Казань", "пока нет партнёров"],
  ["Краснодар", "пока нет партнёров"],
  ["Нижний Новгород", "пока нет партнёров"],
  ["Новосибирск", "пока нет партнёров"],
  ["Ростов-на-Дону", "пока нет партнёров"],
  ["Самара", "пока нет партнёров"],
];
const CITY_COOKIE = "fox_city"; // also read on the server in app/labs/page.tsx

function labName(lab: string) {
  return lab === "Инвитро" ? "INVITRO" : lab;
}

/** `savedCity` — the city cookie read on the server (null = first visit → the confirmation is rendered right away). */
export function LabsPage({ savedCity = null }: { savedCity?: string | null }) {
  const content = useContent();
  const PARTNERS = useMemo(() => content.labs(), [content]);
  const [city, setCity] = useState(savedCity || "Москва");
  const [labView, setLabView] = useState<"list" | "map">("list");
  const [wide, setWide] = useState(false);
  const [selected, setSelected] = useState(BRANCHES[0].id);
  const [net, setNet] = useState("Все сети");
  const [addr, setAddr] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [more, setMore] = useState(false);
  const [mail, setMail] = useState("");
  const [mailError, setMailError] = useState("");
  const [told, setTold] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [flash, setFlash] = useState("");
  const [hovered, setHovered] = useState("");
  // 1257:1044: first visit — ask to confirm the city; the choice is kept in a cookie. The cookie is read on the server,
  // so the question is part of the first HTML in its final place (it used to pop in after hydration and push the page down).
  const [askCity, setAskCity] = useState(savedCity === null);
  const [hints, setHints] = useState(false);
  const [hintAt, setHintAt] = useState(0);
  const [hintAll, setHintAll] = useState(false);
  const key = city.trim().toLowerCase();
  const points = useMemo(() => {
    if (key === "санкт-петербург" || key === "спб" || key === "петербург") return SPB;
    if (key === "москва" || key === "") return BRANCHES;
    return EMPTY;
  }, [key]);
  const empty = city.trim().length > 0 && points.length === 0;
  const cityTitle = key === "санкт-петербург" || key === "спб" || key === "петербург" ? "Санкт-Петербурге" : "Москве";
  const shown = points.filter((item) => {
    if (net !== "Все сети" && item.lab !== net && !(net === "Ситилаб" && item.lab === "Ситилаб")) return false;
    if (openNow && !item.hours.toLowerCase().includes("открыто") && !item.hours.includes("20:00")) return false;
    const blob = `${item.lab} ${item.address} ${item.metro}`.toLowerCase();
    return blob.includes(addr.trim().toLowerCase());
  });
  const nearest = points[0];
  const selectedLab = shown.find((item) => item.id === selected) ?? shown[0];

  useEffect(() => {
    setSelected(points[0]?.id ?? "");
    setNet("Все сети");
    setOpenNow(false);
  }, [points]);

  useEffect(() => {
    // Tablet (≥768) keeps the desktop list + map split (1247:87); phones switch «Список | Карта».
    const query = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);


  function keepCity(value: string) {
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  const cityQuery = city.trim().toLowerCase();
  const cityHints = CITY_HINTS.filter(([name]) => hintAll || !cityQuery || name.toLowerCase().split(/[\s-]+/).some((part) => part.startsWith(cityQuery)) || name.toLowerCase().startsWith(cityQuery)).slice(0, hintAll ? CITY_HINTS.length : 6);
  const hintsOpen = hints && cityHints.length > 0 && (hintAll || !(cityHints.length === 1 && cityHints[0][0].toLowerCase() === cityQuery));

  function openCityHints() {
    const input = document.querySelector<HTMLInputElement>("[aria-label='Город']");
    input?.focus();
    input?.select();
    setHints(true);
    setHintAll(true);
    setHintAt(Math.max(0, CITY_HINTS.findIndex(([name]) => name.toLowerCase() === city.trim().toLowerCase())));
  }

  function pickCity(name: string) {
    setCity(name);
    setHints(false);
    setHintAll(false);
    setAskCity(false);
    keepCity(name);
  }

  // L03: a click on a pin scrolls the list to the branch and tints it lime for 1.2 s.
  // Stable identity: LabsMap rebuilds the Leaflet map whenever onSelect changes.
  const pickFromMap = useCallback((id: string) => {
    setSelected(id);
    setFlash(id);
    window.setTimeout(() => setFlash((current) => (current === id ? "" : current)), 1200);
    const row = document.querySelector<HTMLElement>(`[data-lab-list] [data-branch="${id}"]`);
    const list = row?.closest<HTMLElement>("[data-lab-list]");
    if (row && list && list.scrollHeight > list.clientHeight) list.scrollTo({ top: row.offsetTop - list.offsetTop, behavior: "smooth" });
    else row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  async function notify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = mail.trim();
    const error = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? "" : value ? "Проверьте e-mail: нужен адрес вида name@mail.ru" : "Укажите e-mail";
    setMailError(error);
    if (error) return;
    setSendingMail(true);
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "city-wait", city, contact: value }),
      });
      if (!response.ok) throw new Error("fail");
      setTold(true);
    } catch {
      window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text: "Нет соединения — попробуйте ещё раз", type: "error" } }));
    } finally {
      setSendingMail(false);
    }
  }

  // 1257:1002: tooltip over the active pin — «INVITRO · ул. Таганская, 3» / «Марксистская · 400 м · до 20:00».
  const branchTip = (item: Branch): [string, string] => [`${labName(item.lab)} · ${item.address}`, `${item.metro} · до ${closesAt(item.hours)}`];

  function resetFilters() {
    setAddr("");
    setNet("Все сети");
    setOpenNow(false);
  }

  function showNearest() {
    resetFilters();
    const id = points[0]?.id;
    // Wait for the reset list to render, then select it like a pin click (scroll + tint).
    if (id) window.setTimeout(() => pickFromMap(id), 60);
  }

  function pickNet(name: string) {
    setNet(name);
    if (name === "Все сети") return;
    const hit = points.find((item) => item.lab === name);
    if (hit) setSelected(hit.id);
  }

  return (
    <>
      <Header />
      <main id="zapis">
        <section className="dark-hero fx-hero" data-s="l01">
          <div className="wrap l01">
            <p className="crumbs"><Link href="/">Главная</Link><span className="sep">/</span><span aria-current="page">Где сдать тест</span></p>
            <div className="l01-row">
              <div className="l01-copy">
                <p className="fx-eye"><i />8 федеральных сетей · 1 500+ отделений по России</p>
                <h1>Где сдать тест<span className="d-only"> FOX</span></h1>
                <p className="fx-lead">Выберите город — покажем сети-партнёры и ближайшие отделения. Цену, срок и правила подготовки устанавливает лаборатория — уточняйте на её официальном сайте.</p>
                <article className="l-city">
                  <div className="l-city-top">
                    <span className="l-pin"><img src="/icons/pin.svg" alt="" /></span>
                    <div className="l-city-name">
                      <span>Ваш город · определили по IP</span>
                      <input
                        value={city}
                        onChange={(event) => {
                          setCity(event.target.value);
                          setHints(true);
                          setHintAll(false);
                          setHintAt(0);
                          setAskCity(false);
                        }}
                        onFocus={() => setHints(true)}
                        onBlur={() => {
                          setHints(false);
                          setHintAll(false);
                        }}
                        onKeyDown={(event) => {
                          if (!hintsOpen) return;
                          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                            event.preventDefault();
                            setHintAt((value) => (value + (event.key === "ArrowDown" ? 1 : cityHints.length - 1)) % cityHints.length);
                          } else if (event.key === "Enter") {
                            event.preventDefault();
                            pickCity(cityHints[Math.min(hintAt, cityHints.length - 1)][0]);
                          } else if (event.key === "Escape") setHints(false);
                        }}
                        aria-label="Город"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={hintsOpen}
                        aria-controls="l-city-hints"
                        aria-activedescendant={hintsOpen ? `l-city-hint-${Math.min(hintAt, cityHints.length - 1)}` : undefined}
                        autoComplete="off"
                      />
                    </div>
                    <button type="button" className="l-change" onClick={() => openCityHints()}>
                      <span>Изменить<span className="d-only">&nbsp;город</span></span> <img src="/icons/chevron-down.svg" alt="" />
                    </button>
                  </div>
                  {hintsOpen && (
                    <ul className="l-city-hints" id="l-city-hints" role="listbox" aria-label="Подсказки">
                      {cityHints.map(([name, note], index) => (
                        <li
                          key={name}
                          id={`l-city-hint-${index}`}
                          role="option"
                          aria-selected={index === Math.min(hintAt, cityHints.length - 1)}
                          className={index === Math.min(hintAt, cityHints.length - 1) ? "is-on" : ""}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setHintAt(index)}
                          onClick={() => pickCity(name)}
                        >
                          <span>{name}</span>
                          <small>{note}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="l-stats">
                    <p><b>8</b><span>сетей-партнёров в городе</span></p>
                    <p><b>{empty ? "0" : key.startsWith("санкт") || key === "спб" || key === "петербург" ? String(points.length) : "128"}</b><span>{empty ? "отделений рядом" : `отделений в ${cityTitle}`}</span></p>
                    <p><b>7–10 дней</b><span>до готового отчёта</span></p>
                  </div>
                </article>
                {askCity && (
                  // 1257:1044 «Подтверждение города (первый визит)» — server-rendered from the cookie, so it sits in its
                  // final place from the first paint (no layout shift after hydration).
                  <div className="l-ask">
                    <p><span className="l-ask-pin"><img src="/icons/pin.svg" alt="" /></span>Ваш город — {city.trim() || "Москва"}?</p>
                    <div>
                      <button type="button" className="btn btn-dark" onClick={() => pickCity(city.trim() || "Москва")}>Да, верно</button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setAskCity(false);
                          openCityHints();
                        }}
                      >
                        Выбрать другой
                      </button>
                    </div>
                  </div>
                )}
                {/* Mobile frame 1261:1099: the list/map toggle sits in the grey top block. */}
                <div className="l-mode-m" role="tablist" aria-label="Вид отделений">
                  <button type="button" className={labView === "list" ? "is-active" : ""} onClick={() => setLabView("list")}>Список</button>
                  <button type="button" className={labView === "map" ? "is-active" : ""} onClick={() => setLabView("map")}>Карта</button>
                </div>
                <p className="l-note">{content.showPrices && content.text("prices.from") ? `Тест FOX — ${content.text("prices.from")}. Точная цена зависит от региона и сети.` : "Цена на сайте FOX не публикуется: она зависит от региона и сети."}</p>
              </div>
              <div className="l01-photo">
                <img src="/figma/labs/room.jpg" alt="" />
                <p className="l-pill">Забор крови — 10 минут</p>
                {nearest && (
                  <article className="l-near">
                    <p><span>Ближайшее к вам</span><em>Открыто до 20:00</em></p>
                    <strong>{nearest.lab === "Инвитро" ? "INVITRO" : nearest.lab} · {nearest.address}</strong>
                    <span><img src="/icons/pin.svg" alt="" />{nearest.metro} от вас</span>
                  </article>
                )}
              </div>
            </div>
          </div>
        </section>

        <section data-s="l02">
          <div className="wrap l02">
            <header>
              <h2>Лаборатории-партнёры</h2>
              <p>Выберите сеть — откроем страницу теста FOX на её сайте в новой вкладке.</p>
              <p className="l-legend"><i className="on" />есть в вашем городе <i />пока нет — покажем ближайшие города</p>
            </header>
            <div className="l-partners">
              {PARTNERS.map((item) => {
                const [logo, logoW, logoH] = LAB_LOGOS[item.name] ?? [item.logo, 120, 36];
                const mark = <span className="l-logo"><img src={logo} alt={item.name} width={logoW} height={logoH} /></span>;
                return item.here ? (
                  // L02: a network card opens the booking modal straight on step 2 with this network.
                  <button key={item.name} type="button" onClick={() => window.dispatchEvent(new CustomEvent("fox:book", { detail: { lab: item.name } }))}>
                    {mark}
                    <span className="l-status"><i />{key === "москва" || key === "" ? `Есть в Москве · ${item.count}` : item.count}{item.price ? ` · ${item.price}` : ""}</span>
                    <em>Сдать тест на сайте сети <b className="l-arrow"><img src="/icons/arrow-up-right.svg" alt="" /></b></em>
                  </button>
                ) : (
                  // 1258:1151 Unavailable — opacity 0.55, grey dot «Нет в вашем городе», action «Смотреть города».
                  <div key={item.name} className="is-away" aria-disabled="true">
                    {mark}
                    <span className="l-status"><i />Нет в вашем городе</span>
                    <a href="#l05">Смотреть города <b className="l-arrow"><img src="/icons/arrow-right.svg" alt="" /></b></a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section data-s="l03">
          <div className="wrap l03">
            <header>
              <h2>{empty ? "Отделения" : `Отделения в ${cityTitle}`}</h2>
              <div className="chips l-nets" data-allow-x>
                {NETS.map((item) => (
                  <button key={item} type="button" className={`chip${net === item ? " is-active" : ""}`} onClick={() => pickNet(item)}>{item}</button>
                ))}
                <button type="button" className={`chip${more ? " is-active" : ""}`} onClick={() => setMore((value) => !value)}>Ещё 3</button>
                <button type="button" className={`chip${openNow ? " is-active" : ""}`} onClick={() => setOpenNow((value) => !value)}>Открыто сейчас</button>
              </div>
              {more && <p className="l-more">Ещё в городе: CMD, CHROMOLAB, Хеликс. Точки этих сетей покажем, когда они появятся в выбранном городе.</p>}
              <div className="l-mode" role="tablist" aria-label="Вид отделений">
                <button type="button" className={`chip${labView === "list" ? " is-active" : ""}`} onClick={() => setLabView("list")}>Список</button>
                <button type="button" className={`chip${labView === "map" ? " is-active" : ""}`} onClick={() => setLabView("map")}>Карта</button>
              </div>
            </header>
            {empty ? (
              <p className="l-empty" role="status">В этом городе партнёров пока нет. Оставьте почту ниже — напишем один раз, когда тест FOX появится.</p>
            ) : (
              <div className={`l-split is-${labView}`}>
                <div className="l-pane">
                  <label className="search">
                    <img src="/icons/search.svg" alt="" />
                    <input value={addr} onChange={(event) => setAddr(event.target.value)} placeholder="Адрес, метро или сеть" aria-label="Адрес, метро или сеть" />
                  </label>
                  <p className="l-count">{net === "Все сети" && !openNow && !addr.trim() && points === BRANCHES ? "128 отделений" : `${shown.length} ${shown.length === 1 ? "отделение" : shown.length > 1 && shown.length < 5 ? "отделения" : "отделений"}`} · сначала ближайшие</p>
                  <p className="l-found"><span>Найдено {shown.length} {shown.length === 1 ? "отделение" : "отделений"}</span><span>Сначала ближайшие</span></p>
                  <div data-lab-list onMouseLeave={() => setHovered("")}>
                    {shown.length === 0 && (
                      // 1258:1061 «Пустой поиск» — not a dead end: reset filters or jump to the nearest branch.
                      <div className="l-nores" role="status">
                        <span className="l-nores-icon"><img src="/figma/labs/state/search.svg" alt="" /></span>
                        <p className="l-nores-title">{addr.trim() ? `Ничего не нашли по «${addr.trim()}»` : "Ничего не нашли"}</p>
                        <p className="l-nores-text">{net !== "Все сети" ? `Проверьте адрес или сбросьте фильтр «${net}».` : openNow ? "Проверьте адрес или сбросьте фильтр «Открыто сейчас»." : "Проверьте адрес."}</p>
                        <div className="l-nores-actions">
                          <button type="button" className="btn btn-dark" onClick={resetFilters}>Сбросить фильтры</button>
                          {points[0] && <button type="button" className="btn btn-ghost" onClick={showNearest}>Показать ближайшее</button>}
                        </div>
                      </div>
                    )}
                    {shown.map((item) => (
                      <article key={item.id} data-branch={item.id} className={`${selected === item.id ? "is-on" : ""}${flash === item.id ? " is-flash" : ""}`} onClick={() => setSelected(item.id)} onMouseEnter={() => setHovered(item.id)}>
                        <h3>{item.lab === "Инвитро" ? "INVITRO" : item.lab}</h3>
                        <p className="l-open"><i />Открыто до {closesAt(item.hours)}</p>
                        <p className="l-addr">{item.address}</p>
                        <div className="l-meta">
                          <p className="l-metro">{item.metro}</p>
                          <p className="l-hours"><img src="/icons/clock.svg" alt="" />{item.hours}</p>
                        </div>
                        <div className="l-actions" onClick={(event) => event.stopPropagation()}>
                          <a className="btn btn-dark" href={withUtm(PARTNERS.find((partner) => partner.name === item.lab || (item.lab === "Инвитро" && partner.name === "INVITRO"))?.href ?? "https://foodfox.yuri.guru/labs", "labs_branch")} target="_blank" rel="noreferrer">Сдать здесь</a>
                          <a className="btn btn-ghost" href={`https://yandex.ru/maps/?text=${encodeURIComponent(`${item.address}, ${city}`)}`} target="_blank" rel="noreferrer">Маршрут</a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                {(wide || labView === "map") && (
                  <div className="l03-map">
                    <LabsMap points={points} selected={selected} onSelect={pickFromMap} hovered={hovered} tooltip={branchTip} fallback />
                    {selectedLab && (
                      // Mobile map frame 1261:1311: the selected branch sits in a bottom sheet as a full Branch / Item.
                      <article className="l-map-card">
                        <i className="l-map-grab" aria-hidden />
                        <h3>{selectedLab.lab === "Инвитро" ? "INVITRO" : selectedLab.lab}</h3>
                        <p className="l-open"><i />Открыто до {closesAt(selectedLab.hours)}</p>
                        <p className="l-addr">{selectedLab.address}</p>
                        <p className="l-metro">{selectedLab.metro}</p>
                        <div className="l-actions">
                          <a className="btn btn-dark" href={withUtm(PARTNERS.find((partner) => partner.name === selectedLab.lab || (selectedLab.lab === "Инвитро" && partner.name === "INVITRO"))?.href ?? "https://foodfox.yuri.guru/labs", "labs_branch")} target="_blank" rel="noreferrer">Сдать здесь</a>
                          <a className="btn btn-ghost" href={`https://yandex.ru/maps/?text=${encodeURIComponent(`${selectedLab.address}, ${city}`)}`} target="_blank" rel="noreferrer">Маршрут</a>
                        </div>
                      </article>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="l-caption">Список и карта связаны: выбранное отделение подсвечивается и на карте.</p>
          </div>
        </section>

        <section data-s="l04">
          <div className="wrap l04">
            <header>
              <h2>Перед визитом в лабораторию</h2>
              <p>Четыре вопроса, которые задают чаще всего перед тем, как перейти на сайт лаборатории.</p>
            </header>
            <div className="l-visit">
              <article>
                <span>1</span>
                <h3>Цена</h3>
                <p>На сайте FOX её нет: стоимость называет сеть в вашем городе, на своей странице записи.</p>
              </article>
              <article>
                <span>2</span>
                <h3>Подготовка</h3>
                <p>Голодать не нужно. Диету накануне не назначают. Паспорт и направление — если его дал специалист.</p>
              </article>
              <article>
                <span>3</span>
                <h3>Срок</h3>
                <p>Готовый отчёт обычно через 7–10 дней. Сам лабораторный анализ занимает около трёх часов.</p>
              </article>
              <article>
                <span>4</span>
                <h3>Как читать</h3>
                <p>Отчёт — карта для разговора со специалистом, не список запретов навсегда.</p>
                <Link href="/report">Как читать отчёт <img src="/icons/arrow-right.svg" alt="" /></Link>
              </article>
            </div>
          </div>
        </section>

        <section data-s="l05" id="l05">
          <div className="wrap">
            <div className="l05">
              <div>
                <h2>Вашего города нет в списке?</h2>
                <p>Оставьте почту — напишем один раз, когда тест FOX появится в вашем городе. Без рассылок.</p>
                {/* L05: validation on blur with the message under the field; after sending the form crossfades into the confirmation. */}
                <div className="l05-swap" key={told ? "done" : "form"}>
                  {told ? (
                    <p role="status" className="l05-done">Сообщим, когда откроется отделение. Напишем один раз на {mail.trim()}.</p>
                  ) : (
                    <form onSubmit={notify} noValidate>
                      <label className={`field l05-field${mailError ? " is-error" : ""}`}>
                        <input
                          type="email"
                          value={mail}
                          readOnly={sendingMail}
                          onChange={(event) => {
                            setMail(event.target.value);
                            if (mailError) setMailError(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(event.target.value.trim()) ? "" : mailError);
                          }}
                          onBlur={() => mail.trim() && setMailError(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.trim()) ? "" : "Проверьте e-mail: нужен адрес вида name@mail.ru")}
                          placeholder="Ваш e-mail"
                          aria-label="Почта для уведомления"
                          aria-invalid={!!mailError}
                        />
                        <span className={`lf-err${mailError ? " is-on" : ""}`}><span className="err">{mailError}</span></span>
                      </label>
                      <button className={`btn btn-dark${sendingMail ? " is-loading" : ""}`} type="submit" disabled={sendingMail}>Сообщить, когда появится</button>
                    </form>
                  )}
                </div>
                <p className="l-fine">Нажимая кнопку, вы соглашаетесь на одно письмо по 152-ФЗ. Отписка — ответом на него.</p>
              </div>
              <aside>
                <h3>Ближайшие города</h3>
                <ul>
                  <li><span>Владикавказ</span><b>92 км</b><small>4 отделения</small></li>
                  <li><span>Нальчик</span><b>118 км</b><small>2 отделения</small></li>
                  <li><span>Пятигорск</span><b>204 км</b><small>7 отделений</small></li>
                </ul>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

const OFFICE: Branch[] = [{ id: "office", lab: "Офис", address: "ул. Таганская, 3", metro: "Марксистская", hours: "Пн–Пт 10–19", lat: 55.7406, lng: 37.653 }];
const noop = () => undefined;

/** M26: map-app chooser — Яндекс Карты, 2ГИС, Apple / Google Карты (by platform), «Скопировать адрес». */
function RouteSheet({ onClose }: { onClose: () => void }) {
  const content = useContent();
  const OFFICE_ADDRESS = content.text("contacts.address");
  const mapUrl = content.text("contacts.mapUrl");
  const [apple, setApple] = useState(false);
  useEffect(() => setApple(/iPhone|iPad|Macintosh/.test(navigator.userAgent) && "ontouchend" in document), []);
  const q = encodeURIComponent(OFFICE_ADDRESS);
  return (
    <BottomSheet label="Построить маршрут" className="route-bs" duration={280} onClose={onClose} portal>
      <a href={mapUrl} target="_blank" rel="noreferrer">Яндекс Карты <img src="/icons/arrow-up-right.svg" alt="" /></a>
      <a href={`https://2gis.ru/moscow/search/${q}`} target="_blank" rel="noreferrer">2ГИС <img src="/icons/arrow-up-right.svg" alt="" /></a>
      {apple ? (
        <a href={`https://maps.apple.com/?q=${q}&ll=55.7406,37.653`} target="_blank" rel="noreferrer">Apple Карты <img src="/icons/arrow-up-right.svg" alt="" /></a>
      ) : (
        <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">Google Карты <img src="/icons/arrow-up-right.svg" alt="" /></a>
      )}
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(OFFICE_ADDRESS).then(
            () => window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text: "Адрес скопирован", type: "info" } })),
            () => undefined,
          );
          onClose();
        }}
      >
        Скопировать адрес
      </button>
    </BottomSheet>
  );
}

export function ContactsPage() {
  const content = useContent();
  const phone = content.text("contacts.phone");
  const email = content.text("contacts.email");
  const address = content.text("contacts.address");
  const street = address.replace(/^Москва,\s*/, "");
  const telegram = content.text("contacts.telegram");
  const mapUrl = content.text("contacts.mapUrl");
  const [route, setRoute] = useState(false);
  const closeRoute = useCallback(() => setRoute(false), []);
  const phoneRoute = (event: { preventDefault: () => void }) => {
    if (!window.matchMedia("(max-width: 1100px)").matches) return false;
    event.preventDefault();
    setRoute(true);
    return true;
  };
  // The page is prerendered at build time, so the office status is read after
  // hydration; computing it during render made /contacts mismatch (React #418)
  // whenever the build and the visit fell on different sides of 10:00 / 19:00.
  const [officeOpen, setOfficeOpen] = useState(true);
  useEffect(() => {
    const moscowHour = (new Date().getUTCHours() + 3) % 24;
    setOfficeOpen(moscowHour >= 10 && moscowHour < 19);
  }, []);
  // K02 / M24 channels. Desktop: a click on the number / address copies it + toast (2.5 с). Phone: the whole card is one
  // tap zone (scale .98 + Shadow S → M, 120 мс, CSS) that runs the system action (tel:, mailto:, route sheet,
  // Telegram); a long press (500 мс) on the phone or e-mail copies it instead — vibration 10 мс + toast.
  const isPhone = () => window.matchMedia("(max-width: 767px)").matches;
  const copyValue = (value: string, text: string) => {
    void navigator.clipboard?.writeText(value).catch(() => undefined);
    try { navigator.vibrate?.(10); } catch { /* not supported */ }
    window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text, type: "info", duration: 2500 } }));
  };
  const press = useRef<{ timer: number; fired: boolean; x: number; y: number } | null>(null);
  // The pressed look is a class (not :active) — iOS Safari and touch emulation do not keep :active on a plain card.
  const holdToCopy = (value?: string, text?: string) => ({
    onPointerDown: (event: { pointerType: string; clientX: number; clientY: number; currentTarget: HTMLElement }) => {
      if (event.pointerType !== "touch" && !isPhone()) return;
      event.currentTarget.classList.add("is-press");
      const state = { timer: 0, fired: false, x: event.clientX, y: event.clientY };
      if (value && text) state.timer = window.setTimeout(() => { state.fired = true; copyValue(value, text); }, 500);
      press.current = state;
    },
    onPointerMove: (event: { clientX: number; clientY: number; currentTarget: HTMLElement }) => {
      const state = press.current;
      if (state && !state.fired && Math.hypot(event.clientX - state.x, event.clientY - state.y) > 10) { window.clearTimeout(state.timer); press.current = null; event.currentTarget.classList.remove("is-press"); }
    },
    onPointerUp: (event: { currentTarget: HTMLElement }) => { event.currentTarget.classList.remove("is-press"); if (press.current && !press.current.fired) { window.clearTimeout(press.current.timer); press.current = null; } },
    onPointerCancel: (event: { currentTarget: HTMLElement }) => { event.currentTarget.classList.remove("is-press"); if (press.current) window.clearTimeout(press.current.timer); press.current = null; },
    onPointerLeave: (event: { currentTarget: HTMLElement }) => { event.currentTarget.classList.remove("is-press"); },
    onContextMenu: (event: { preventDefault: () => void }) => { if (isPhone()) event.preventDefault(); },
    onClickCapture: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (press.current?.fired) { event.preventDefault(); event.stopPropagation(); }
      press.current = null;
    },
  });
  const cardTap = (event: { target: EventTarget; currentTarget: HTMLElement }) => {
    if (!isPhone() || (event.target as HTMLElement).closest("a, button")) return;
    event.currentTarget.querySelector<HTMLElement>(".k-go")?.click();
  };
  return (
    <>
      <Header />
      <main>
        <section className="dark-hero fx-hero" data-s="k01">
          <div className="wrap k01">
            <p className="crumbs"><Link href="/">Главная</Link><span className="sep">/</span><span aria-current="page">Контакты</span></p>
            <div className="k01-row">
              <div>
                <h1>Контакты</h1>
                <p className="fx-lead">Напишите нам — ответим в течение одного рабочего дня. По вопросам медицинской интерпретации отчёта направим к специалисту — дистанционные консультации по результатам мы не даём.</p>
                <p className="k-note"><span className="k-note-ico" aria-hidden="true" /><span>Офис — не лаборатория: анализы здесь не берут. Где сдать тест — на странице <Link href="/labs">/labs</Link></span></p>
              </div>
              <div className="k-hero-photo">
                <img src="/figma/contacts/hero.jpg" alt="" />
                <div className="k-hero-card">
                  <small className={officeOpen ? "is-open" : ""}>{officeOpen ? "Сейчас открыто · до 19:00" : "Сейчас закрыто"}</small>
                  <b>{address}</b>
                  <span>{content.text("contacts.addressNote")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section data-s="k02">
          <div className="wrap k-cards">
            <article className="k-tap" onClick={cardTap} {...holdToCopy(phone, "Номер скопирован")}>
              <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-phone.svg)" }} aria-hidden />
              <div>
                <h2>Телефон</h2>
                <button type="button" className="k-strong" onClick={() => { if (isPhone()) window.location.href = content.telHref; else copyValue(phone, "Номер скопирован"); }}>{phone}</button>
                <p>{content.text("contacts.hours")}</p>
                <p role="status">{officeOpen ? "Сейчас офис на связи" : "Сейчас офис закрыт — напишите, ответим утром"}</p>
                <a className="k-go" href={content.telHref}>Позвонить <img src="/icons/arrow-right.svg" alt="" /></a>
              </div>
            </article>
            <article className="k-tap" onClick={cardTap} {...holdToCopy(email, "E-mail скопирован")}>
              <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-mail.svg)" }} aria-hidden />
              <div>
                <h2>E-mail</h2>
                <a className="k-value" href={`mailto:${email}`} onClick={(event) => { if (!isPhone()) { event.preventDefault(); copyValue(email, "E-mail скопирован"); } }}>{email}</a>
                <p>Для общих вопросов и партнёрства</p>
                <a className="k-go" href={`mailto:${email}`}>Написать <img src="/icons/arrow-right.svg" alt="" /></a>
              </div>
            </article>
            <article className="k-tap" onClick={cardTap} {...holdToCopy()}>
              <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-pin.svg)" }} aria-hidden />
              <div>
                <h2>Адрес</h2>
                <p className="k-strong">{street}</p>
                <p>Офис, не лаборатория</p>
                <a className="k-go" href={mapUrl} target="_blank" rel="noreferrer" onClick={(event) => phoneRoute(event)}>Маршрут <img src="/icons/arrow-right.svg" alt="" /></a>
              </div>
            </article>
            <article className="k-tap" onClick={cardTap} {...holdToCopy()}>
              <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-tg.svg)" }} aria-hidden />
              <div>
                <h2>Telegram</h2>
                <p className="k-strong">{telegram.replace(/^https?:\/\/t\.me\//, "@")}</p>
                <p>Новости и материалы</p>
                <a className="k-go" href={telegram} target="_blank" rel="noreferrer">Открыть канал <img src="/icons/arrow-right.svg" alt="" /></a>
              </div>
            </article>
          </div>
        </section>
        <section data-s="k03">
          <div className="wrap k03">
            <LeadForm
              variant="page"
              title="Задать вопрос"
              subtitle="Выберите, кто вы — так письмо попадёт к нужному сотруднику."
            />
            <aside className="k-map">
              {/* M26: on phones the map is a static preview — a tap opens the map-app sheet. */}
              <div className="k-map-tap" onClick={(event) => phoneRoute(event)}>
                <LabsMap points={OFFICE} selected="office" onSelect={noop} staticOnPhone />
              </div>
              <div>
                <h2>Офис Инмунотех</h2>
                <p>{address} · 5 минут от м. Марксистская</p>
                <a className="btn btn-dark k-route" href={mapUrl} target="_blank" rel="noreferrer" onClick={(event) => phoneRoute(event)}>Построить маршрут</a>
              </div>
            </aside>
          </div>
        </section>
        <section data-s="k04">
          <div className="wrap k04">
            <p className="fx-kicker">Куда обратиться</p>
            <h2>Быстрее, чем письмо: готовые маршруты</h2>
            <div className="k-routes">
              <article>
                <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-pin.svg)" }} aria-hidden />
                <h3>Пациентам</h3>
                <p>Где сдать тест, как читать отчёт, как найти специалиста</p>
                <Link href="/faq">В FAQ <img src="/icons/arrow-right.svg" alt="" /></Link>
              </article>
              <article>
                <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-phone.svg)" }} aria-hidden />
                <h3>Специалистам</h3>
                <p>Материалы для приёма, курс, вопросы по интерпретации</p>
                <Link href="/specialists">Специалистам <img src="/icons/arrow-right.svg" alt="" /></Link>
              </article>
              <article>
                <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-mail.svg)" }} aria-hidden />
                <h3>Лабораториям и клиникам</h3>
                <p>Стать партнёром FOX, подключить тест в свою сеть</p>
                <a href="#k-form" onClick={() => window.dispatchEvent(new CustomEvent("fox:lead-who", { detail: "Лаборатория" }))}>Оставить заявку <img src="/icons/arrow-right.svg" alt="" /></a>
              </article>
              <article>
                <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-tg.svg)" }} aria-hidden />
                <h3>Прессе и партнёрам</h3>
                <p>Комментарии экспертов, материалы, логотипы</p>
                <a href={`mailto:${email}`}>Написать <img src="/icons/arrow-right.svg" alt="" /></a>
              </article>
            </div>
          </div>
        </section>
        {route && <RouteSheet onClose={closeRoute} />}
      </main>
      <Footer />
    </>
  );
}


export function ReviewsPage() {
  const content = useContent();
  const REVIEWS = useMemo(() => content.get<Review[]>("reviews.list").filter((item) => !item.hidden), [content]);
  const [filter, setFilter] = useState("Все");
  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "video") setFilter("Видео");
    if (type === "text" || type === "текст") setFilter("Текст");
  }, []);
  const [topic, setTopic] = useState("");
  const [chipNow, setChipNow] = useState<string | null>(null);
  const [topicNow, setTopicNow] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [video, setVideo] = useState<Review | null>(null);
  const [videoFrom, setVideoFrom] = useState<DOMRect | null>(null);
  const closeVideo = useCallback(() => setVideo(null), []);
  const gridRef = useRef<HTMLDivElement>(null);
  const pick = (f: string, t: string) => REVIEWS.filter((item) => (f === "Все" || item.who === f || item.kind === f) && (!t || item.tag === t));
  const cards = pick(filter, topic);
  const slice = cards.slice((page - 1) * 7, page * 7);
  // M35: on phones reviews come 5 at a time with «Показать ещё» instead of the pager.
  const [phone, setPhone] = useState(false);
  const [limit, setLimit] = useState(5);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => setLimit(5), [filter, topic]);
  const visible = phone ? cards.slice(0, limit) : slice;
  // The counter and the pager follow the cards actually loaded (the 312 in the rating is the total collected, the feed shows what is published here).
  const shownCount = visible.length;
  const pages = Math.max(1, Math.ceil(cards.length / 7));
  // The counter slides only after the visitor changed something (not when the phone layout settles after hydration).
  const touched = useRef(false);
  const prevShown = useRef<number | null>(null);
  const shownSwap = touched.current && prevShown.current !== null && prevShown.current !== shownCount;
  useEffect(() => {
    prevShown.current = shownCount;
  }, [shownCount]);
  // M33: Shadow S on the filter row while it is stuck under the header (phone).
  useEffect(() => {
    const tools = gridRef.current?.parentElement?.querySelector<HTMLElement>(".v-tools");
    if (!tools) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const sticky = getComputedStyle(tools).position === "sticky";
      const top = parseFloat(getComputedStyle(tools).top) || 0;
      const grid = gridRef.current?.getBoundingClientRect();
      tools.classList.toggle("is-stuck", sticky && tools.getBoundingClientRect().top <= top + 0.5 && !!grid && grid.bottom > top + tools.offsetHeight);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  const showMore = () => {
    touched.current = true;
    const from = limit;
    flushSync(() => setLimit(limit + 5));
    const fresh = [...(gridRef.current?.querySelectorAll<HTMLElement>("[data-k]:not([data-k=promo])") ?? [])].slice(from);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fresh.forEach((el, index) => {
      if (!reduce) el.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: index * 60, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    });
    const first = fresh[0];
    if (first) {
      first.tabIndex = -1;
      first.focus({ preventScroll: true });
    }
  };
  // V01 / M32: the rating counts up 0,0 → 4,9 and 0 → +48 (1 с on desktop, 900 мс on a phone, ease-out) and the stars
  // fill left to right with it (each star in turn, stagger 80 мс, the last one done when the counter lands).
  // Written straight into the DOM from rAF — no React render per frame. The shown value is floored, so «4,9» appears
  // only on the last frame: the visible count lasts the full 1000 / 900 мс (rounding showed 4,9 already at ~78%).
  // Until hydration the numbers are hidden, so they do not flash 4,9 → 0,0 before the count-up.
  const [ratePending, setRatePending] = useState(true);
  const rateRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLElement>(null);
  const starsRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    setRatePending(false);
    const stars = starsRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !stars) return;
    const ms = window.matchMedia("(max-width: 767px)").matches ? 900 : 1000;
    const paint = (share: number) => {
      if (rateRef.current) rateRef.current.textContent = (share >= 1 ? 4.9 : Math.floor(49 * share) / 10).toFixed(1).replace(".", ",");
      if (moreRef.current) moreRef.current.textContent = `+${share >= 1 ? 48 : Math.floor(48 * share)}`;
    };
    paint(0);
    let raf = 0;
    raf = requestAnimationFrame((first) => {
      // the stars start in the same frame as the counter
      stars.style.setProperty("--v-ms", `${ms}ms`);
      stars.classList.add("is-star-fill");
      const tick = (now: number) => {
        const t = Math.min(1, (now - first) / ms);
        paint(1 - Math.pow(1 - t, 2));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      tick(first);
    });
    return () => {
      cancelAnimationFrame(raf);
      paint(1);
      stars.classList.remove("is-star-fill");
    };
  }, []);
  // V01: the collage follows the cursor a little (±8 px, a different depth for every layer); rAF-throttled, `translate`
  // only — the cards keep their own rotation. Not on touch screens / reduced motion.
  const collageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = collageRef.current;
    const row = box?.parentElement;
    if (!box || !row || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layers: Array<[HTMLElement | null, number]> = [
      [box.querySelector<HTMLElement>(".v-dot"), 0.35],
      [box.querySelector<HTMLElement>(".v-photo-a"), 0.6],
      [box.querySelector<HTMLElement>(".v-photo-b"), 1],
      [box.querySelector<HTMLElement>(".v-quote"), 0.8],
    ];
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      layers.forEach(([node, depth]) => {
        if (node) node.style.translate = `${(x * 8 * depth).toFixed(2)}px ${(y * 8 * depth).toFixed(2)}px`;
      });
    };
    const move = (event: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    row.addEventListener("pointermove", move);
    row.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      row.removeEventListener("pointermove", move);
      row.removeEventListener("pointerleave", leave);
    };
  }, []);
  // V02 (Figma note): the grid rebuilds with FLIP 300 мс — leaving cards fade + scale .96, staying cards glide, new ones rise from +12px.
  const flip = (f: string, t: string, apply: () => void) => {
    touched.current = true;
    const grid = gridRef.current;
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(); return; }
    const nextIds = new Set(pick(f, t).slice(0, 7).map((item) => item.id));
    const items = [...grid.querySelectorAll<HTMLElement>("[data-k]")];
    const first = new Map(items.map((el) => [el.dataset.k, el.getBoundingClientRect()]));
    const leaving = items.filter((el) => !nextIds.has(el.dataset.k ?? ""));
    leaving.forEach((el) => el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: 150, easing: "ease-out", fill: "forwards" }));
    // M33 (phone): the page turns to the start of the feed, and the new cards come in a cascade (y 12, step 60 мс).
    const phone = window.matchMedia("(max-width: 767px)").matches;
    if (phone) {
      const header = document.querySelector(".site-header:not(.is-hidden)")?.getBoundingClientRect().bottom ?? 0;
      const tools = grid.parentElement?.querySelector<HTMLElement>(".v-tools");
      const stuck = tools && getComputedStyle(tools).position === "sticky" ? tools.getBoundingClientRect().height : 0;
      const top = grid.getBoundingClientRect().top - Math.max(0, header) - stuck - 12;
      if (top < -4) window.scrollTo({ top: window.scrollY + top, behavior: "smooth" });
    }
    window.setTimeout(() => {
      leaving.forEach((el) => el.getAnimations().forEach((anim) => anim.cancel()));
      flushSync(apply);
      let fresh = 0;
      grid.querySelectorAll<HTMLElement>("[data-k]").forEach((el) => {
        const was = first.get(el.dataset.k);
        const now = el.getBoundingClientRect();
        if (was && el.dataset.k !== "promo") {
          const dx = was.left - now.left, dy = was.top - now.top;
          if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
        } else if (!was) {
          el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: phone ? Math.min(fresh, 5) * 60 : 0, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
          fresh += 1;
        }
      });
    }, leaving.length ? 150 : 0);
  };
  return (
    <>
      <Header />
      <main>
        <section className="dark-hero fx-hero" data-s="v01">
          <div className="wrap v01">
            <p className="crumbs"><Link href="/">Главная</Link><span className="sep">/</span><span aria-current="page">Отзывы</span></p>
            <div className="v01-row">
              <div>
                <h1>Отзывы</h1>
                <p className="fx-lead">Истории людей, которые сдали тест, и отзывы специалистов, которые работают с отчётом. Все отзывы проходят модерацию.</p>
                <div className={`v-rate-card${ratePending ? " is-pending" : ""}`}>
                  <p className="v-rate" aria-label="Средняя оценка 4,9"><b aria-hidden ref={rateRef}>4,9</b><span className="v-stars" aria-hidden="true" ref={starsRef}>{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ "--i": i } as CSSProperties}>★</i>)}</span></p>
                  <div className="v-rate-side">
                    <p className="v-rate-note">312 отзывов после модерации</p>
                    <p className="v-avatars">
                      <span><img src="/figma/reviews/r1-640.webp" alt="" /><img src="/figma/reviews/r2-640.webp" alt="" /><img src="/figma/reviews/r3-640.webp" alt="" /><img src="/figma/reviews/r1-640.webp" alt="" /><i className="v-more" ref={moreRef}>+48</i></span>
                    </p>
                    <p className="v-rate-foot">из них 48 — от врачей и нутрициологов</p>
                  </div>
                </div>
              </div>
              {/* visual · коллаж (1277:858): lime circle, Алексей behind, Елена (video) in front, quote bubble with stars. */}
              <div className="v-collage2" aria-hidden="true" data-contrast ref={collageRef}>
                <i className="v-dot" />
                <img className="v-photo-a" src="/figma/reviews/r3-640.webp" srcSet="/figma/reviews/r3-640.webp 640w, /figma/reviews/r3.webp 1205w" sizes="(min-width: 1101px) 320px, 45vw" alt="" />
                <div className="v-photo-b">
                  <img src="/figma/reviews/r1-640.webp" srcSet="/figma/reviews/r1-640.webp 640w, /figma/reviews/r1.webp 1205w" sizes="(min-width: 1101px) 340px, 50vw" alt="" />
                  <p className="v-play"><span><img src="/figma/icons/play.svg" alt="" /></span>Елена · 1:24</p>
                </div>
                <p className="v-quote"><span>★★★★★</span>«Отчёт наконец дал конкретный список»</p>
              </div>
            </div>
          </div>
        </section>
        <section data-s="v02">
          <div className="wrap v02">
            <div className="v-tools">
              <div className="v-chiprow" data-allow-x>
              <div className="chips">
                {["Все", "Пациенты", "Специалисты", "Видео"].map((item) => (
                  <button key={item} className={`chip${(chipNow ?? filter) === item ? " is-active" : ""}`} type="button" onClick={() => {
                    // M33: the tapped chip fills at once (160 мс), not after the old cards have left.
                    setChipNow(item);
                    flip(item, topic, () => { setFilter(item); setChipNow(null); setPage(1); });
                    const url = new URL(window.location.href);
                    if (item === "Видео") url.searchParams.set("type", "video");
                    else if (item === "Текст") url.searchParams.set("type", "text");
                    else url.searchParams.delete("type");
                    window.history.replaceState(null, "", url);
                  }}>{item}</button>
                ))}
              </div>
              <div className="chips">
                {["ЖКТ", "Кожа", "Вес и отёчность", "Общее самочувствие"].map((item) => (
                  <button key={item} className={`chip${(topicNow ?? topic) === item ? " is-active" : ""}`} type="button" onClick={() => { const next = topic === item ? "" : item; setTopicNow(next); flip(filter, next, () => { setTopic(next); setTopicNow(null); setPage(1); }); }}>{item}</button>
                ))}
              </div>
              </div>
              <label className="v-sort">Сначала новые
                <select aria-label="Сначала новые" defaultValue="new"><option value="new">Сначала новые</option></select>
              </label>
              {/* M33: the new count slides up (200 мс, phone CSS). */}
              <p className="v-shown"><span key={shownCount} className={shownSwap ? "is-swap" : undefined}>Показано {shownCount} из {cards.length}</span></p>
            </div>
            <div className="v-grid" ref={gridRef}>
              {visible.map((item) => item.video ? (
                <article key={item.id} data-k={item.id} className="rev rev-video" style={{ backgroundImage: `url(${item.photo})` }}>
                  <p><span>{item.tag}</span><span>Видео</span></p>
                  <div>
                    <button type="button" className="rev-play" onClick={(event) => { setVideoFrom(event.currentTarget.closest("article")?.getBoundingClientRect() ?? null); setVideo(item); }}><img src="/figma/icons/play.svg" alt="" /><span>Смотреть<span className="rev-play-word"> историю</span> · 1:24</span></button>
                    <h3>«{item.title}»</h3>
                    <b>{item.name}</b>
                    <small><img src="/figma/icons/check.svg" alt="" />Отзыв проверен модератором</small>
                  </div>
                </article>
              ) : (
                <article key={item.id} data-k={item.id} className={`rev${item.who === "Специалисты" ? " is-pro" : ""}`}>
                  <p><span className={item.tag === "Специалист" ? "is-spec" : undefined}>{item.tag}</span><em>{item.kind}</em></p>
                  <i aria-hidden="true">“</i>
                  <RevText text={item.text} />
                  <footer>
                    <img src={item.photo.replace(".webp", "-640.webp")} alt="" />
                    <span><b>{item.name}</b>{item.role && <small>{item.role}</small>}<small><img src="/figma/icons/check-2.svg" alt="" />Отзыв проверен модератором</small></span>
                  </footer>
                </article>
              ))}
              <article className="rev rev-promo" data-k="promo">
                <h3>Сдали тест? Поделитесь историей</h3>
                <p>Поможете тем, кто только ищет причину своих симптомов</p>
                <a className="btn btn-dark" href="#review-form">Оставить отзыв</a>
              </article>
            </div>
            {phone && (
              <div className="v-more-row">
                {limit < cards.length ? (
                  <button type="button" className="btn btn-light v-more-btn" onClick={showMore}>Показать ещё</button>
                ) : (
                  <a className="text-link" href="#review-form">Оставить свой отзыв</a>
                )}
              </div>
            )}
            {pages > 1 && <div className="v-pages">
              {Array.from({ length: pages }, (_, index) => index + 1).map((item) => (
                <button key={item} type="button" className={page === item ? "is-on" : ""} onClick={() => setPage(item)} aria-label={`Страница ${item}`}>{item}</button>
              ))}
            </div>}
          </div>
        </section>
        <section data-s="v03" id="review-form">
          <div className="wrap v03">
            <div>
              <h2>Оставить отзыв</h2>
              <ul>
                <li><b>Без диагнозов</b><span>Не публикуем обещания, что тест что-то вылечил.</span></li>
                <li><b>Без обещаний излечения</b><span>История — про опыт, не про назначение.</span></li>
                <li><b>Модерация 1–2 рабочих дня</b><span>Проверяем, что отзыв написал человек, а не шаблон.</span></li>
              </ul>
            </div>
            <ReviewForm />
          </div>
        </section>
      </main>
      {video && <VideoModal item={video} from={videoFrom} onClose={closeVideo} />}
      <Footer />
    </>
  );
}

/* V02: long text — 6 lines (8 on a phone, M47) + «Читать целиком», opens inside the card over 250 мс. */
function RevText({ text }: { text: string }) {
  const ref = useRef<HTMLQuoteElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const check = () => { if (!node.classList.contains("is-open")) setLong(node.scrollHeight > node.clientHeight + 2); };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return (
    <>
      <blockquote ref={ref} className={`rev-text${open ? " is-open" : ""}`} onTransitionEnd={() => { if (ref.current && open) ref.current.style.maxHeight = "none"; }}>{text}</blockquote>
      {long && !open && (
        <button type="button" className="rev-more" onClick={() => {
          const node = ref.current;
          if (node) { node.style.maxHeight = `${node.clientHeight}px`; window.requestAnimationFrame(() => { node.style.maxHeight = `${node.scrollHeight}px`; }); }
          setOpen(true);
        }}>Читать целиком</button>
      )}
    </>
  );
}

/* V02 / M34: video review player in a modal. There is no video file for the reviews yet, so the player is a stub:
   the poster with the play button and a «Видео пока не загружено» line instead of playback.
   Desktop: K08 window — opacity + scale .98 → 1, 200 мс; the exit is the reverse.
   Phone (M34): a full-screen player that grows out of the tapped poster (shared element, 320 мс (.2,.8,.2,1)) — the
   player is revealed through a window that starts on the poster's rectangle; swipe down closes it (it follows the
   finger, >80 px or a flick closes, otherwise it springs back). */
function VideoModal({ item, from, onClose }: { item: Review; from: DOMRect | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const [subs, setSubs] = useState(true);
  const closing = useRef(false);
  const phoneRef = useRef(false);
  const close = useCallback(() => {
    const node = ref.current;
    const scrim = scrimRef.current;
    if (closing.current) return;
    closing.current = true;
    if (!node || !scrim || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onClose(); return; }
    const phone = phoneRef.current;
    const anim = phone
      ? node.animate([{ transform: getComputedStyle(node).transform === "none" ? "none" : getComputedStyle(node).transform, opacity: 1 }, { transform: "translateY(40%)", opacity: 0 }], { duration: 200, easing: "ease-in", fill: "forwards" })
      : node.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.98)" }], { duration: 200, easing: "ease-in", fill: "forwards" });
    scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "linear", fill: "forwards" });
    anim.onfinish = () => onClose();
  }, [onClose]);
  useDialog(ref, close);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    phoneRef.current = window.matchMedia("(max-width: 767px)").matches;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (phoneRef.current && from) {
      const box = node.getBoundingClientRect();
      const inset = `inset(${Math.max(0, from.top - box.top)}px ${Math.max(0, box.right - from.right)}px ${Math.max(0, box.bottom - from.bottom)}px ${Math.max(0, from.left - box.left)}px round 20px)`;
      node.animate([{ clipPath: inset }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
    } else if (!phoneRef.current) {
      node.animate([{ opacity: 0, transform: "scale(0.98)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: "ease-out" });
    }
  }, [from]);
  // M34: swipe down to close (phone).
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const onTouchStart = (event: ReactTouchEvent) => {
    if (!phoneRef.current || event.touches.length !== 1) return;
    drag.current = { y: event.touches[0].clientY, t: performance.now(), dy: 0 };
  };
  const onTouchMove = (event: ReactTouchEvent) => {
    const d = drag.current;
    const node = ref.current;
    if (!d || !node) return;
    d.dy = Math.max(0, event.touches[0].clientY - d.y);
    node.style.transform = d.dy ? `translateY(${d.dy}px)` : "";
  };
  const onTouchEnd = () => {
    const d = drag.current;
    const node = ref.current;
    drag.current = null;
    if (!d || !node) return;
    const speed = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 80 || (d.dy > 24 && speed > 0.6)) close();
    else if (d.dy) {
      node.animate([{ transform: `translateY(${d.dy}px)` }, { transform: "none" }], { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" });
      node.style.transform = "";
    }
  };
  return (
    <div className="rev-modal-scrim" ref={scrimRef} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="rev-modal" ref={ref} role="dialog" aria-modal="true" aria-label={`Видеоотзыв: ${item.name}`} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        <div className="rev-modal-head">
          <span><b>{item.name}</b></span>
          <button type="button" className="rev-modal-x" aria-label="Закрыть" onClick={close} data-autofocus>×</button>
        </div>
        <div className="rev-modal-video" style={{ backgroundImage: `url(${item.photo})` }}>
          <span className="rev-modal-play"><img src="/figma/icons/play.svg" alt="" /></span>
          <p className="rev-modal-stub">Видео пока не загружено</p>
        </div>
        <div className="rev-modal-bar">
          <span className="rev-modal-progress" aria-hidden><i /></span>
          <span>0:00 / 1:24</span>
          <button type="button" className={`chip${subs ? " is-active" : ""}`} aria-pressed={subs} onClick={() => setSubs(!subs)}>Субтитры</button>
        </div>
      </div>
    </div>
  );
}

/* V03 (Figma note): validation on blur, red border + text under the field, shake 2px × 2 on submit,
   button active only after consent, sending → spinner + «Отправляем…» with disabled fields,
   success → the form collapses into the «Спасибо!» card with a drawn check (500 мс).
   M36 / M25: a network error keeps everything typed and shows the Error toast with «Повторить» (no auto-close, as the
   contact form). The review goes to the same /api/lead endpoint as the other forms (kind «review»); the spinner stays
   at least 600 мс so it does not blink. */
function ReviewForm() {
  const [agree, setAgree] = useState(false);
  const [text, setText] = useState("");
  const [textErr, setTextErr] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toastTag = useRef(`review-${Math.random().toString(36).slice(2)}`);
  const sendRef = useRef<() => void>(() => {});
  useEffect(() => {
    const tag = toastTag.current;
    return () => { window.dispatchEvent(new CustomEvent("fox:toast-clear", { detail: tag })); };
  }, []);
  const check = (value: string) => (value.trim().length < 10 ? "Напишите чуть подробнее" : "");
  const send = async () => {
    const form = formRef.current;
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    window.dispatchEvent(new CustomEvent("fox:toast-clear", { detail: toastTag.current }));
    setBusy(true);
    const started = performance.now();
    const rest = () => new Promise((resolve) => window.setTimeout(resolve, Math.max(0, 600 - (performance.now() - started))));
    try {
      if (!navigator.onLine) throw new Error("offline");
      const response = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "review", ...data, text, consent: true }) });
      if (!response.ok) throw new Error(String(response.status));
      await rest();
      setBusy(false);
      setDone(true);
    } catch {
      await rest();
      setBusy(false);
      window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text: "Нет соединения — текст сохранён", type: "error", tag: toastTag.current, action: { label: "Повторить", run: () => sendRef.current() } } }));
    }
  };
  sendRef.current = () => void send();
  if (done) {
    return (
      <div className="v03-done" role="status">
        <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" /><path d="M14 25l7 7 13-15" /></svg>
        <h3>Спасибо!</h3>
        <p>Опубликуем после модерации — до 3 дней</p>
      </div>
    );
  }
  return (
    <form ref={formRef} className={shake ? "is-shake" : undefined} noValidate onSubmit={(event) => {
      event.preventDefault();
      if (!agree || busy) return;
      const err = check(text);
      setTextErr(err);
      if (err) { setShake(false); window.requestAnimationFrame(() => setShake(true)); return; }
      void send();
    }}>
      <fieldset disabled={busy}>
        <label className="field">Имя<input name="name" /></label>
        <label className="field">Город<input name="city" /></label>
        <label className="field">О ком отзыв
          <select name="who" defaultValue="Пациент"><option>Пациент</option><option>Специалист</option></select>
        </label>
        <label className={`field${textErr ? " is-error" : ""}`}>Текст<textarea name="text" rows={5} value={text} aria-invalid={Boolean(textErr)} onChange={(event) => { setText(event.target.value); if (textErr) setTextErr(check(event.target.value)); }} onBlur={() => { if (text.trim() || textErr) setTextErr(check(text)); }} />
          <span className={`lf-err${textErr ? " is-on" : ""}`} aria-live="polite"><span className="err">{textErr}</span></span>
        </label>
        <label className="check-row"><input name="agree" type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} /><span>Согласен на публикацию отзыва и обработку персональных данных (152-ФЗ)</span></label>
      </fieldset>
      <button className={`btn btn-dark${busy ? " is-loading is-labelled" : ""}`} type="submit" disabled={!agree || busy}>{busy ? "Отправляем…" : "Отправить"}</button>
      <p className="v-hint">Кнопка активна после согласия</p>
    </form>
  );
}

export function SimplePage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">{title}</h1>
        <div className="stack" style={{ marginTop: 24, maxWidth: 760 }}>{children}</div>
      </main>
      <Footer />
    </>
  );
}
