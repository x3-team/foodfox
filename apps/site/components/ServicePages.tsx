"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useDialog } from "@/components/useDialog";
import { Footer } from "@/components/Footer";
import { Header, PARTNER_LOGIN } from "@/components/Header";
import { LabsMap, type Branch } from "@/components/LabsMap";
import { LeadForm } from "@/components/LeadForm";
import { PARTNERS, withUtm } from "@/lib/labs";

const FAQ_GROUPS: Array<{ id: string; title: string; count: string; items: Array<[string, string]> }> = [
  {
    id: "method",
    title: "О тесте и методе",
    count: "8 вопросов",
    items: [
      ["Можно ли доверять FOX, если IgG-тесты критикуют?", "Споры возникают, когда пищеспецифические IgG используют как окончательный диагноз или готовый список запрещённой еды. FOX решает другую задачу: лабораторно измеряет IgG к 286 пищевым антигенам и объединяет результаты в подробном отчёте. Широкая панель помогает системно оценить рацион, составить план временной элиминации и последовательно возвращать продукты под наблюдением специалиста."],
      ["Чем пищевая непереносимость отличается от аллергии?", "Аллергия — быстрая реакция IgE. FOX смотрит IgG, реакции могут быть отложенными. Тест не диагностирует аллергию."],
      ["Почему сложно самостоятельно определить триггеры?", "Отсроченная реакция проявляется через 3–72 часа, поэтому дневник без опоры быстро становится догадкой."],
      ["Может ли результат измениться со временем?", "FOX показывает текущее состояние IgG, а не предрасположенность. Повторный отчёт может отличаться."],
      ["Какие продукты входят в панель?", "286 пищевых антигенов из 13 групп: от молочных белков до специй и компонентов добавок."],
      ["Что такое anti-CCD-контроль?", "Отдельный канал на перекрёстные углеводные структуры. Он снижает риск принять шум за сигнал."],
      ["Сколько занимает сам анализ?", "Лабораторная часть занимает около трёх часов. Готовый отчёт обычно приходит через 7–10 дней."],
      ["Нужен ли повторный визит в лабораторию?", "Нет. Один забор крови закрывает всю панель из 286 антигенов."],
    ],
  },
  {
    id: "prep",
    title: "Перед сдачей",
    count: "5 вопросов",
    items: [
      ["Нужно ли специально готовиться к сдаче крови?", "Правила на месте называет лаборатория. FOX не назначает диету накануне и не заменяет эту инструкцию."],
      ["Нужно ли голодать перед забором крови?", "Нет. Специальной подготовки и диеты накануне не требуется."],
      ["Подходит ли тест детям?", "Решение принимает специалист, который ведёт ребёнка. Тест не заменяет педиатра."],
      ["Можно ли сдавать тест на фоне приёма лекарств?", "Это вопрос к врачу перед записью. Сайт не даёт индивидуальных назначений."],
      ["Сколько стоит тест FOX?", "Цену устанавливает лаборатория. На сайте её нет."],
    ],
  },
  {
    id: "read",
    title: "Как читать результат",
    count: "7 вопросов",
    items: [
      ["Что означают зоны отчёта?", "Красная, жёлтая и зелёная зоны сравнивают IgG внутри одного бланка. Это не диагноз и не пожизненный запрет."],
      ["Что такое U/mL в отчёте FOX?", "Условные единицы на миллилитр. Сравнивать число имеет смысл только с другими позициями того же отчёта."],
      ["Почему в отчёте есть отдельные белки?", "Казеин, фракции глютена и другие компоненты показывают, на что именно среагировал IgG, а не на полку целиком."],
      ["Как читать anti-CCD?", "Это контрольный канал на перекрёстные углеводные структуры. Если он повышен, часть сигналов читают осторожнее."],
      ["Можно ли сравнивать два отчёта между собой?", "Повторный тест смотрят как новый снимок рациона. Абсолютные числа разных бланков напрямую не складывают."],
      ["Что делать с длинным списком в красной зоне?", "Список — повод для разговора со специалистом о временной элиминации и полноценных заменах, а не готовое меню."],
      ["Где посмотреть пример отчёта?", "На странице «Пример результата» разобраны зоны, таблица семейства и контрольные параметры."],
    ],
  },
  {
    id: "after",
    title: "После теста и рацион",
    count: "6 вопросов",
    items: [
      ["Нужно ли сразу убрать всё из красной зоны?", "На первом этапе продукты красной и жёлтой зон обычно убирают временно и возвращают по одному. Схему задаёт специалист."],
      ["Как долго держать элиминацию?", "Ориентир — несколько недель, затем возврат жёлтой зоны. Срок зависит от самочувствия и рациона, его не назначает сайт."],
      ["Чем заменить убранные продукты?", "Замены подбирают так, чтобы рацион оставался полноценным: белок, кальций, клетчатка. Это задача специалиста, а не списка запретов."],
      ["Можно ли есть продукт из зелёной зоны без ограничений?", "Зелёная зона значит низкий IgG в этом бланке, а не разрешение игнорировать другие диагнозы."],
      ["Когда имеет смысл пересдать тест?", "Когда рацион заметно изменился и специалист хочет увидеть новый профиль IgG. FOX не показывает предрасположенность."],
      ["Отчёт заменяет дневник питания?", "Нет. Дневник и самочувствие остаются частью работы. Отчёт даёт лабораторную точку отсчёта, а не готовый план."],
    ],
  },
  {
    id: "doubt",
    title: "Скепсис и критика IgG",
    count: "4 вопроса",
    items: [
      ["Почему IgG-тесты критикуют?", "Критикуют попытку поставить диагноз или пожизненный запрет по одному числу. FOX измеряет панель и оставляет решение специалисту."],
      ["Это то же самое, что тест на аллергию?", "Нет. Аллергия — IgE и быстрая реакция. FOX смотрит пищеспецифические IgG и не оценивает риск анафилаксии."],
      ["Можно ли по отчёту поставить диагноз?", "Нельзя. Тест не диагностирует аллергию, целиакию, непереносимость лактозы и не заменяет очный приём."],
      ["Есть ли у метода регуляторный статус?", "Панель разработана MADx (Вена) и маркируется как изделие для in vitro диагностики. Маркировку смотрите в разделе сертификатов."],
    ],
  },
  {
    id: "pro",
    title: "Для специалистов",
    count: "6 вопросов",
    items: [
      ["Кому из пациентов уместно предложить FOX?", "Когда жалобы со стороны ЖКТ, кожи или самочувствия могут быть связаны с рационом, а дневник не даёт опоры. Решение принимает врач."],
      ["Как объяснить пациенту, что это не диагноз?", "Отчёт — карта IgG к продуктам панели. Он помогает собрать гипотезу по питанию и не заменяет аллергообследование."],
      ["Как встроить отчёт в приём?", "Сначала клиника и уже известные диагнозы, затем зоны и отдельные белки, затем временная элиминация с возвратом."],
      ["Есть ли материалы для кабинета?", "Курс из шести уроков, пример отчёта и страница для специалистов. Сертификат курса не является баллом НМО."],
      ["Можно ли назначать элиминацию только по красной зоне?", "Красная зона — приоритет разговора, не автоматический запрет. Замены и срок возврата остаются клиническим решением."],
      ["Где взять протокол чтения отчёта?", "В курсе и в разборе примера: шапка, сводка зон, таблица семейства, отдельные белки, anti-CCD."],
    ],
  },
  {
    id: "pay",
    title: "Оплата и лаборатории",
    count: "3 вопроса",
    items: [
      ["Где оплачивается тест?", "На сайте лаборатории-партнёра: отделение, время и оплата проходят там, а не на foodfox."],
      ["Почему на сайте нет цены?", "Цену устанавливает сеть. В разных городах и лабораториях она отличается."],
      ["Что делать, если в городе нет партнёра?", "Можно выбрать соседний город с сетью или оставить почту: напишем один раз, когда тест появится."],
    ],
  },
];

const FAQ_NAV = [
  ["method", "О тесте и методе", "8"],
  ["prep", "Перед сдачей", "5"],
  ["read", "Как читать результат", "7"],
  ["after", "После теста и рацион", "6"],
  ["doubt", "Скепсис и критика IgG", "4"],
  ["pro", "Для специалистов", "6"],
  ["pay", "Оплата и лаборатории", "3"],
];

export function FaqPage() {
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
        window.setTimeout(() => setFlash(""), 1200);
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
  const query = debounced.trim().toLowerCase();
  const CHIP_QUERY: Record<string, string> = { "Критика IgG": "критикуют", Подготовка: "готовиться", Детям: "детям", Сроки: "дней", Цена: "стоит" };
  const groups = FAQ_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.join(" ").toLowerCase().includes(query)),
  })).filter((group) => group.items.length > 0);

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
            <aside className="f-nav">
              <div className="f-nav-links" data-allow-x>
              <p>Разделы</p>
              {FAQ_NAV.map(([id, title, count]) => (
                <a key={id} href={`#${id}`} className={nav === id ? "is-on" : ""} onClick={(event) => { event.preventDefault(); setNav(id); setShowAll(true); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 0); }}>
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
            <div className="f-groups">
              {groups.length === 0 && <p role="status">Ничего не нашлось. Сбросьте запрос или напишите нам.</p>}
              {groups.map((group, index) => (
                <section key={group.id} id={group.id} className={`${!query && group.id !== nav ? "is-parked" : ""} ${!showAll && !query && index > 1 ? "is-rest" : ""}`}>
                  <header><h2><span className="f-num">{String(index + 1).padStart(2, "0")}</span>{group.title}</h2><span>{group.count}</span></header>
                  {group.items.map(([question, answer]) => {
                    const expanded = open.includes(question);
                    const anchor = `${group.id}-${FAQ_GROUPS.find((item) => item.id === group.id)!.items.findIndex((item) => item[0] === question) + 1}`;
                    const mark = (text: string) => {
                      if (query.length < 2) return text;
                      const i = text.toLowerCase().indexOf(query);
                      if (i < 0) return text;
                      return <>{text.slice(0, i)}<mark className="hit">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
                    };
                    return (
                      <article key={question} id={anchor} className={`${expanded ? "is-open" : ""}${flash === anchor ? " is-flash" : ""}`}>
                        <button type="button" aria-expanded={expanded} onClick={() => setOpen((current) => expanded ? current.filter((item) => item !== question) : [...current, question])}>
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
                                  window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text: "Ссылка скопирована", duration: 2500 } }));
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
                <p className="f03-phone"><a href="tel:+74953748305">+7 (495) 374-83-05</a></p>
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

const NETS = ["Все сети", "Ситилаб", "Гемотест", "KDL", "ДНКОМ"];

export function LabsPage() {
  const [city, setCity] = useState("Москва");
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
    const query = window.matchMedia("(min-width: 1100px)");
    const apply = () => setWide(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

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
                      <input value={city} onChange={(event) => setCity(event.target.value)} aria-label="Город" />
                    </div>
                    <button type="button" className="l-change" onClick={() => document.querySelector<HTMLInputElement>("[aria-label='Город']")?.focus()}>
                      Изменить<span className="d-only">&nbsp;город</span> <img src="/icons/chevron-down.svg" alt="" />
                    </button>
                  </div>
                  <div className="l-stats">
                    <p><b>8</b><span>сетей-партнёров в городе</span></p>
                    <p><b>{empty ? "0" : key.startsWith("санкт") || key === "спб" || key === "петербург" ? String(points.length) : "128"}</b><span>{empty ? "отделений рядом" : `отделений в ${city || "городе"}`}</span></p>
                    <p><b>7–10 дней</b><span>до готового отчёта</span></p>
                  </div>
                </article>
                {/* Mobile frame 1261:1099: the list/map toggle sits in the grey top block. */}
                <div className="l-mode-m" role="tablist" aria-label="Вид отделений">
                  <button type="button" className={labView === "list" ? "is-active" : ""} onClick={() => setLabView("list")}>Список</button>
                  <button type="button" className={labView === "map" ? "is-active" : ""} onClick={() => setLabView("map")}>Карта</button>
                </div>
                <p className="l-note">Цена на сайте FOX не публикуется: она зависит от региона и сети.</p>
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
              {PARTNERS.map((item) =>
                item.here ? (
                  // L02: a network card opens the booking modal straight on step 2 with this network.
                  <button key={item.name} type="button" onClick={() => window.dispatchEvent(new CustomEvent("fox:book", { detail: { lab: item.name } }))}>
                    <img src={item.logo} alt="" />
                    <strong>{item.name}</strong>
                    <span><i />{item.count}</span>
                    <em>Сдать тест на сайте сети <img src="/icons/arrow-up-right.svg" alt="" /></em>
                  </button>
                ) : (
                  // L02: Unavailable — 50%, «Нет в вашем городе», no hover and no hand cursor; the action leads to the nearest cities.
                  <div key={item.name} className="is-away" aria-disabled="true">
                    <img src={item.logo} alt="" />
                    <strong>{item.name}</strong>
                    <span className="l-away-badge">Нет в вашем городе</span>
                    <a href="#l05">Смотреть города <img src="/icons/arrow-right.svg" alt="" /></a>
                  </div>
                ),
              )}
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
                  <div data-lab-list>
                    {shown.map((item) => (
                      <article key={item.id} data-branch={item.id} className={`${selected === item.id ? "is-on" : ""}${flash === item.id ? " is-flash" : ""}`} onClick={() => setSelected(item.id)}>
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
                    <LabsMap points={points} selected={selected} onSelect={pickFromMap} />
                    {selectedLab && (
                      <article className="l-map-card">
                        <h3>{selectedLab.lab}</h3>
                        <p>{selectedLab.address}</p>
                        <p>{selectedLab.metro}</p>
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

export function ContactsPage() {
  // The page is prerendered at build time, so the office status is read after
  // hydration; computing it during render made /contacts mismatch (React #418)
  // whenever the build and the visit fell on different sides of 10:00 / 19:00.
  const [officeOpen, setOfficeOpen] = useState(true);
  useEffect(() => {
    const moscowHour = (new Date().getUTCHours() + 3) % 24;
    setOfficeOpen(moscowHour >= 10 && moscowHour < 19);
  }, []);
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
                  <b>Москва, ул. Таганская, 3</b>
                  <span>МФК Инмунотех · м. Марксистская</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section data-s="k02">
          <div className="wrap k-cards">
            <article>
              <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-phone.svg)" }} aria-hidden />
              <div>
                <h2>Телефон</h2>
                <button type="button" className="k-strong" onClick={() => { void navigator.clipboard?.writeText("+7 (495) 374-83-05"); window.dispatchEvent(new CustomEvent("fox:toast", { detail: "Номер скопирован" })); }}>+7 (495) 374-83-05</button>
                <p>Пн–Пт 10:00–19:00 (МСК)</p>
                <p role="status">{officeOpen ? "Сейчас офис на связи" : "Сейчас офис закрыт — напишите, ответим утром"}</p>
                <a className="k-go" href="tel:+74953748305">Позвонить <img src="/icons/arrow-right.svg" alt="" /></a>
              </div>
            </article>
            <article>
              <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-mail.svg)" }} aria-hidden />
              <div>
                <h2>E-mail</h2>
                <a className="k-value" href="mailto:info@inmunotech.ru">info@inmunotech.ru</a>
                <p>Для общих вопросов и партнёрства</p>
                <a className="k-go" href="mailto:info@inmunotech.ru">Написать <img src="/icons/arrow-right.svg" alt="" /></a>
              </div>
            </article>
            <article>
              <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-pin.svg)" }} aria-hidden />
              <div>
                <h2>Адрес</h2>
                <p className="k-strong">ул. Таганская, 3</p>
                <p>Офис, не лаборатория</p>
                <a className="k-go" href="https://yandex.ru/maps/-/CHwvqE4z" target="_blank" rel="noreferrer">Маршрут <img src="/icons/arrow-right.svg" alt="" /></a>
              </div>
            </article>
            <article>
              <span className="k-ico" style={{ backgroundImage: "url(/icons/contact-tg.svg)" }} aria-hidden />
              <div>
                <h2>Telegram</h2>
                <p className="k-strong">@foxfoodxplorer</p>
                <p>Новости и материалы</p>
                <a className="k-go" href="https://t.me/foxfoodxplorer" target="_blank" rel="noreferrer">Открыть канал <img src="/icons/arrow-right.svg" alt="" /></a>
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
              <LabsMap points={[{ id: "office", lab: "Офис", address: "ул. Таганская, 3", metro: "Марксистская", hours: "Пн–Пт 10–19", lat: 55.7406, lng: 37.653 }]} selected="office" onSelect={() => undefined} />
              <div>
                <h2>Офис Инмунотех</h2>
                <p>Москва, ул. Таганская, 3 · 5 минут от м. Марксистская</p>
                <a className="btn btn-dark k-route" href="https://yandex.ru/maps/-/CHwvqE4z" target="_blank" rel="noreferrer">Построить маршрут</a>
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
                <a href="mailto:info@inmunotech.ru">Написать <img src="/icons/arrow-right.svg" alt="" /></a>
              </article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

const REVIEWS = [
  { id: "r1", kind: "Видео", who: "Пациенты", tag: "ЖКТ", photo: "/figma/reviews/r1.png", video: true, title: "Наконец поняла, что менять в рационе", name: "Елена, 34 года", text: "" },
  { id: "r2", kind: "Текст", who: "Пациенты", tag: "Питание", photo: "/figma/reviews/r2.png", video: false, title: "", name: "Екатерина Ласковская", text: "Убирала молочку, потом глютен, потом всё сразу — и каждый раз наугад. Отчёт наконец дал конкретный список." },
  { id: "r3", kind: "Текст", who: "Пациенты", tag: "Общее самочувствие", photo: "/figma/reviews/r3.png", video: false, title: "", name: "Игорь Потруников", text: "Списывал всё на возраст и работу. Четыре месяца вёл дневник питания и не продвинулся ни на шаг." },
  { id: "r4", kind: "Текст", who: "Специалисты", tag: "Специалист", photo: "/figma/reviews/r4.png", video: false, title: "", name: "Алёна Вавилова", role: "Нутрициолог", text: "С отчётом легче выстроить разговор: пациент видит структуру, а не список запретов." },
  { id: "r5", kind: "Видео", who: "Пациенты", tag: "Кожа", photo: "/figma/reviews/r5.png", video: true, title: "Ответ оказался не в косметологии", name: "Алексей, 41 год", text: "" },
  { id: "r6", kind: "Текст", who: "Пациенты", tag: "Кожа", photo: "/figma/reviews/r6.png", video: false, title: "", name: "Марина К.", text: "С врачом собрали план по отчёту — без угадывания. Через два месяца стало заметно лучше." },
  { id: "r7", kind: "Текст", who: "Пациенты", tag: "Вес и отёчность", photo: "/figma/reviews/r7.png", video: false, title: "", name: "Ольга, 29 лет", text: "Думала, что дело в соли. С нутрициологом временно убрали лишнее — ушло ощущение тяжести." },
  { id: "r8", kind: "Текст", who: "Специалисты", tag: "Общее самочувствие", photo: "/figma/reviews/r8.png", video: false, title: "", name: "Клиника на Таганке", text: "Отчёт стал структурой приёма, а не списком запретов, который пациент составил сам." },
];

export function ReviewsPage() {
  const [filter, setFilter] = useState("Все");
  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "video") setFilter("Видео");
    if (type === "text" || type === "текст") setFilter("Текст");
  }, []);
  const [topic, setTopic] = useState("");
  const [page, setPage] = useState(1);
  const [video, setVideo] = useState<(typeof REVIEWS)[number] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const pick = (f: string, t: string) => REVIEWS.filter((item) => (f === "Все" || item.who === f || item.kind === f) && (!t || item.tag === t));
  const cards = pick(filter, topic);
  const slice = cards.slice((page - 1) * 7, page * 7);
  // V02 (Figma note): the grid rebuilds with FLIP 300 мс — leaving cards fade + scale .96, staying cards glide, new ones rise from +12px.
  const flip = (f: string, t: string, apply: () => void) => {
    const grid = gridRef.current;
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(); return; }
    const nextIds = new Set(pick(f, t).slice(0, 7).map((item) => item.id));
    const items = [...grid.querySelectorAll<HTMLElement>("[data-k]")];
    const first = new Map(items.map((el) => [el.dataset.k, el.getBoundingClientRect()]));
    const leaving = items.filter((el) => !nextIds.has(el.dataset.k ?? ""));
    leaving.forEach((el) => el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: 150, easing: "ease-out", fill: "forwards" }));
    window.setTimeout(() => {
      leaving.forEach((el) => el.getAnimations().forEach((anim) => anim.cancel()));
      flushSync(apply);
      grid.querySelectorAll<HTMLElement>("[data-k]").forEach((el) => {
        const was = first.get(el.dataset.k);
        const now = el.getBoundingClientRect();
        if (was && el.dataset.k !== "promo") {
          const dx = was.left - now.left, dy = was.top - now.top;
          if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
        } else if (!was) {
          el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
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
                <div className="v-rate-card">
                  <p className="v-rate"><b>4,9</b><span className="v-stars" aria-hidden="true">★★★★★</span></p>
                  <div className="v-rate-side">
                    <p className="v-rate-note">312 отзывов после модерации</p>
                    <p className="v-avatars">
                      <span><img src="/figma/reviews/r1.png" alt="" /><img src="/figma/reviews/r2.png" alt="" /><img src="/figma/reviews/r3.png" alt="" /><img src="/figma/reviews/r4.png" alt="" /><i className="v-more">+48</i></span>
                    </p>
                    <p className="v-rate-foot">из них 48 — от врачей и нутрициологов</p>
                  </div>
                </div>
              </div>
              {/* visual · коллаж (1277:858): lime circle, Алексей behind, Елена (video) in front, quote bubble with stars. */}
              <div className="v-collage2" aria-hidden="true" data-contrast>
                <i className="v-dot" />
                <img className="v-photo-a" src="/figma/reviews/hero-a.jpg" alt="" />
                <div className="v-photo-b">
                  <img src="/figma/reviews/hero-b.jpg" alt="" />
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
                  <button key={item} className={`chip${filter === item ? " is-active" : ""}`} type="button" onClick={() => {
                    flip(item, topic, () => { setFilter(item); setPage(1); });
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
                  <button key={item} className={`chip${topic === item ? " is-active" : ""}`} type="button" onClick={() => { const next = topic === item ? "" : item; flip(filter, next, () => { setTopic(next); setPage(1); }); }}>{item}</button>
                ))}
              </div>
              </div>
              <label className="v-sort">Сначала новые
                <select aria-label="Сначала новые" defaultValue="new"><option value="new">Сначала новые</option></select>
              </label>
              <p className="v-shown">Показано {Math.min(7, cards.length)} из 312</p>
            </div>
            <div className="v-grid" ref={gridRef}>
              {slice.map((item) => item.video ? (
                <article key={item.id} data-k={item.id} className="rev rev-video" style={{ backgroundImage: `url(${item.photo})` }}>
                  <p><span>{item.tag}</span><span>Видео</span></p>
                  <div>
                    <button type="button" className="rev-play" onClick={() => setVideo(item)}><img src="/figma/icons/play.svg" alt="" />Смотреть историю · 1:24</button>
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
                    <img src={item.photo} alt="" />
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
            <div className="v-pages">
              {[1, 2, 3].map((item) => (
                <button key={item} type="button" className={page === item ? "is-on" : ""} onClick={() => setPage(item)} aria-label={`Страница ${item}`}>{item}</button>
              ))}
            </div>
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
      {video && <VideoModal item={video} onClose={() => setVideo(null)} />}
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
   the poster with the play button and a «Видео пока не загружено» line instead of playback. */
function VideoModal({ item, onClose }: { item: (typeof REVIEWS)[number]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [subs, setSubs] = useState(true);
  useDialog(ref, onClose);
  return (
    <div className="rev-modal-scrim" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="rev-modal" ref={ref} role="dialog" aria-modal="true" aria-label={`Видеоотзыв: ${item.name}`}>
        <div className="rev-modal-head">
          <span><b>{item.name}</b></span>
          <button type="button" className="rev-modal-x" aria-label="Закрыть" onClick={onClose} data-autofocus>×</button>
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
   There is no review API yet, so the sending state lasts a short fixed time. */
function ReviewForm() {
  const [agree, setAgree] = useState(false);
  const [text, setText] = useState("");
  const [textErr, setTextErr] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const check = (value: string) => (value.trim().length < 10 ? "Напишите чуть подробнее" : "");
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
    <form className={shake ? "is-shake" : undefined} noValidate onSubmit={(event) => {
      event.preventDefault();
      if (!agree || busy) return;
      const err = check(text);
      setTextErr(err);
      if (err) { setShake(false); window.requestAnimationFrame(() => setShake(true)); return; }
      setBusy(true);
      window.setTimeout(() => { setBusy(false); setDone(true); }, 900);
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
