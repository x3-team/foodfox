"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header, PARTNER_LOGIN } from "@/components/Header";
import { LabsMap, type Branch } from "@/components/LabsMap";

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
  useEffect(() => {
    const openHash = () => {
      const id = window.location.hash.replace("#", "");
      if (!FAQ_GROUPS.some((group) => group.id === id)) return;
      setShowAll(true);
      setNav(id);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 0);
    };
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => window.removeEventListener("hashchange", openHash);
  }, []);
  const query = q.trim().toLowerCase();
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
                <p className="fx-lead">Коротко о методе, подготовке и том, как читать отчёт. Медицинскую интерпретацию по переписке не даём.</p>
                <form className="search f-search" onSubmit={(event) => event.preventDefault()}>
                  <img src="/icons/search.svg" alt="" />
                  <input data-hotkey value={q} onChange={(event) => setQ(event.target.value)} placeholder="Например: anti-CCD, дети, цена" aria-label="Поиск по вопросам" />
                  <kbd>/</kbd>
                  <button className="btn btn-dark" type="submit">Найти</button>
                </form>
                <div className="chips">
                  {["Критика IgG", "Подготовка", "Детям", "Сроки", "Цена"].map((item) => (
                    <button key={item} className="chip" type="button" onClick={() => setQ(item === "Критика IgG" ? "критикуют" : item === "Подготовка" ? "готовиться" : item === "Детям" ? "детям" : item === "Сроки" ? "дней" : "стоит")}>{item}</button>
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
                    const mark = (text: string) => {
                      if (query.length < 2) return text;
                      const i = text.toLowerCase().indexOf(query);
                      if (i < 0) return text;
                      return <>{text.slice(0, i)}<mark className="hit">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
                    };
                    return (
                      <article key={question} className={expanded ? "is-open" : ""}>
                        <button type="button" aria-expanded={expanded} onClick={() => setOpen((current) => expanded ? current.filter((item) => item !== question) : [...current, question])}>
                          <strong>{mark(question)}</strong>
                          <img src="/icons/chevron-down.svg" alt="" />
                        </button>
                        <div className="f-answer">
                          <div>
                            <p>{mark(answer)}</p>
                            <div className="f-actions">
                              <span>Ссылка на ответ</span>
                              <span>Ответ помог?</span>
                              <button type="button">Да</button>
                              <button type="button">Нет</button>
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

const PARTNERS = [
  { name: "Ситилаб", logo: "/figma/labs/citilab.svg", count: "86 отделений", here: true, href: "https://citilab.ru" },
  { name: "Гемотест", logo: "/figma/labs/gemotest.svg", count: "140 отделений", here: true, href: "https://gemotest.ru" },
  { name: "KDL", logo: "/figma/labs/kdl.svg", count: "54 отделения", here: true, href: "https://kdl.ru" },
  { name: "ДНКОМ", logo: "/figma/labs/dnkom.svg", count: "17 отделений", here: true, href: "https://dnkom.ru" },
  { name: "INVITRO", logo: "/figma/labs/invitro.svg", count: "128 отделений", here: true, href: "https://www.invitro.ru" },
  { name: "CMD", logo: "/figma/labs/cmd.svg", count: "41 отделение", here: true, href: "https://cmd-online.ru" },
  { name: "CHROMOLAB", logo: "/figma/labs/chromolab.png", count: "23 отделения", here: true, href: "https://chromolab.ru" },
  { name: "Хеликс", logo: "/figma/labs/helix.svg", count: "32 отделения", here: true, href: "https://helix.ru" },
  { name: "Юнимед", logo: "/figma/labs/unimed.svg", count: "Нет в вашем городе", here: false, href: "#l05" },
];

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
  const [told, setTold] = useState(false);
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
                <h1>Где сдать тест FOX</h1>
                <p className="fx-lead">Выберите город — покажем сети-партнёры и ближайшие отделения. Цену, срок и правила подготовки устанавливает лаборатория — уточняйте на её официальном сайте.</p>
                <article className="l-city">
                  <div className="l-city-top">
                    <span className="l-pin"><img src="/icons/pin.svg" alt="" /></span>
                    <div className="l-city-name">
                      <span>Ваш город · определили по IP</span>
                      <input value={city} onChange={(event) => setCity(event.target.value)} aria-label="Город" />
                    </div>
                    <button type="button" className="l-change" onClick={() => document.querySelector<HTMLInputElement>("[aria-label='Город']")?.focus()}>
                      Изменить город <img src="/icons/chevron-down.svg" alt="" />
                    </button>
                  </div>
                  <div className="l-stats">
                    <p><b>8</b><span>сетей-партнёров в городе</span></p>
                    <p><b>{empty ? "0" : key.startsWith("санкт") || key === "спб" || key === "петербург" ? String(points.length) : "128"}</b><span>{empty ? "отделений рядом" : `отделений в ${city || "городе"}`}</span></p>
                    <p><b>7–10 дней</b><span>до готового отчёта</span></p>
                  </div>
                </article>
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
              {PARTNERS.map((item) => (
                <a key={item.name} className={item.here ? "" : "is-away"} href={item.href} {...(item.here ? { target: "_blank", rel: "noreferrer" } : {})}>
                  <img src={item.logo} alt="" />
                  <strong>{item.name}</strong>
                  <span><i />{item.count}</span>
                  <em>{item.here ? "Сдать тест на сайте сети" : "Смотреть города"} <img src="/icons/arrow-up-right.svg" alt="" /></em>
                </a>
              ))}
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
                  <p className="l-found"><span>Найдено {shown.length} {shown.length === 1 ? "отделение" : "отделений"}</span><span>Сначала ближайшие</span></p>
                  <div data-lab-list>
                    {shown.map((item) => (
                      <article key={item.id} className={selected === item.id ? "is-on" : ""} onClick={() => setSelected(item.id)}>
                        <h3>{item.lab}</h3>
                        <p>{item.address}</p>
                        <p>{item.metro}</p>
                        <p className="l-badge">Открыто · {item.hours}</p>
                        <div className="l-actions" onClick={(event) => event.stopPropagation()}>
                          <a className="btn btn-dark" href={PARTNERS.find((partner) => partner.name === item.lab || (item.lab === "Инвитро" && partner.name === "INVITRO"))?.href ?? "/labs"} target="_blank" rel="noreferrer">Сдать здесь</a>
                          <a className="btn btn-ghost" href={`https://yandex.ru/maps/?text=${encodeURIComponent(`${item.address}, ${city}`)}`} target="_blank" rel="noreferrer">Маршрут</a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                {(wide || labView === "map") && (
                  <div className="l03-map">
                    <LabsMap points={points} selected={selected} onSelect={setSelected} />
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
                <form onSubmit={(event) => { event.preventDefault(); if (mail.includes("@")) setTold(true); }}>
                  <input type="email" value={mail} onChange={(event) => setMail(event.target.value)} placeholder="Ваш e-mail" aria-label="Почта для уведомления" />
                  <button className="btn btn-dark" type="submit">Сообщить, когда появится</button>
                </form>
                {told && <p role="status">Записали. Напишем один раз, когда сеть появится.</p>}
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

const WHO = ["Пациент", "Специалист", "Лаборатория"] as const;

export function ContactsPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ok, setOk] = useState(false);
  const [who, setWho] = useState<(typeof WHO)[number]>("Пациент");
  const [shake, setShake] = useState(false);
  const [net, setNet] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Record<string, string> = {};
    const contact = String(data.get("email") || "").trim();
    if (String(data.get("name") || "").trim().length < 2) next.name = "Укажите имя";
    if (!contact.includes("@") && contact.replace(/\D/g, "").length < 10) next.email = "Укажите e-mail или телефон";
    if (!data.get("agree")) next.agree = "Нужно согласие";
    setErrors(next);
    if (Object.keys(next).length) {
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      setOk(false);
      setNet(false);
      return;
    }
    if (!navigator.onLine) {
      setNet(true);
      setOk(false);
      return;
    }
    setNet(false);
    setOk(true);
  }
  const moscowHour = (new Date().getUTCHours() + 3) % 24;
  const officeOpen = moscowHour >= 10 && moscowHour < 19;
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
                <p className="fx-lead">Вопросы о сайте, документах и партнёрстве. Дистанционную медицинскую интерпретацию отчёта не делаем.</p>
                <p className="k-note">Офис — не лаборатория: анализы здесь не берут. Где сдать тест — на странице <Link href="/labs">/labs</Link>.</p>
              </div>
              <div className="k-hero-photo">
                <img src="/figma/contacts/hero.jpg" alt="" />
                <p className="k-hero-card">Сейчас открыто · Москва, ул. Таганская, 3</p>
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
            <form id="k-form" className={shake ? "is-shake" : ""} onSubmit={submit} noValidate>
              <h2>Задать вопрос</h2>
              <p>Выберите, кто вы — так письмо попадёт к нужному сотруднику.</p>
              <div className="who-tabs" role="tablist" aria-label="Тип обращения">
                {WHO.map((item) => (
                  <button key={item} type="button" role="tab" aria-selected={who === item} className={who === item ? "is-active" : ""} onClick={() => setWho(item)}>{item}</button>
                ))}
              </div>
              <p className="k-who">
                {who === "Пациент" && "Запись на тест идёт через лабораторию. Здесь можно задать вопрос о сайте и документах."}
                {who === "Специалист" && "Курс, протокол и пример отчёта — в разделе для специалистов."}
                {who === "Лаборатория" && <>Подключение сети: обучение персонала и материалы для пациентов. <a href={PARTNER_LOGIN}>Кабинет партнёра</a></>}
              </p>
              <div className="k-fields">
                <label className={`field${errors.name ? " is-error" : ""}`}>Имя<input name="name" aria-invalid={!!errors.name} />{errors.name && <span className="err">{errors.name}</span>}</label>
                <label className={`field${errors.email ? " is-error" : ""}`}>E-mail или телефон<input name="email" aria-invalid={!!errors.email} />{errors.email && <span className="err">{errors.email}</span>}</label>
              </div>
              <label className="field">Сообщение<textarea name="text" rows={4} maxLength={500} /></label>
              <label className={`check-row${errors.agree ? " is-error" : ""}`}><input type="checkbox" name="agree" /><span>Согласен на обработку персональных данных по 152-ФЗ и с политикой конфиденциальности</span></label>
              {errors.agree && <p className="err" role="alert">{errors.agree}</p>}
              {net && <p className="err" role="alert">Не удалось отправить. Проверьте соединение и попробуйте ещё раз.</p>}
              {ok && <p role="status">Сообщение отправлено. Ответим в ближайший рабочий день.</p>}
              <button className="btn btn-dark" type="submit">Отправить</button>
              <p className="k-hint">Отвечаем в течение 1 рабочего дня</p>
            </form>
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
                <a href="#k-form">Оставить заявку <img src="/icons/arrow-right.svg" alt="" /></a>
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
  { id: "r5", kind: "Видео", who: "Пациенты", tag: "Кожа", photo: "/figma/reviews/r5.png", video: true, title: "«Ответ оказался не в косметологии»", name: "Алексей, 41 год", text: "" },
  { id: "r6", kind: "Текст", who: "Пациенты", tag: "Кожа", photo: "/figma/reviews/r6.png", video: false, title: "", name: "Марина К.", text: "С врачом собрали план по отчёту — без угадывания. Через два месяца стало заметно лучше." },
  { id: "r7", kind: "Текст", who: "Пациенты", tag: "Вес и отёчность", photo: "/figma/reviews/r7.png", video: false, title: "", name: "Ольга, 29 лет", text: "Думала, что дело в соли. С нутрициологом временно убрали лишнее — ушло ощущение тяжести." },
  { id: "r8", kind: "Текст", who: "Специалисты", tag: "Общее самочувствие", photo: "/figma/reviews/r8.png", video: false, title: "", name: "Клиника на Таганке", text: "Отчёт стал структурой приёма, а не списком запретов, который пациент составил сам." },
];

export function ReviewsPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Все");
  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "video") setFilter("Видео");
    if (type === "text" || type === "текст") setFilter("Текст");
  }, []);
  const [topic, setTopic] = useState("");
  const [page, setPage] = useState(1);
  const cards = REVIEWS.filter((item) => (filter === "Все" || item.who === filter || item.kind === filter) && (!topic || item.tag === topic));
  const slice = cards.slice((page - 1) * 7, page * 7);
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
                <p className="fx-lead">Истории людей, которые сдали тест FOX, и специалистов, которые разбирают отчёт на приёме. Публикуем после модерации.</p>
                <div className="v-rate-card">
                  <p className="v-rate"><b>4,9</b><span className="v-stars" aria-hidden="true">★★★★★</span></p>
                  <div className="v-rate-side">
                    <p className="v-rate-note">312 отзывов</p>
                    <p className="v-avatars">
                      <span><img src="/figma/reviews/r1.png" alt="" /><img src="/figma/reviews/r2.png" alt="" /><img src="/figma/reviews/r3.png" alt="" /><img src="/figma/reviews/r4.png" alt="" /></span>
                      +48
                    </p>
                    <p className="v-rate-foot">из них 48 — от врачей и нутрициологов</p>
                  </div>
                </div>
              </div>
              <div className="v-collage">
                <img src="/figma/reviews/hero-a.jpg" alt="" />
                <img src="/figma/reviews/hero-b.jpg" alt="" />
                <p>Отчёт наконец дал конкретный список</p>
              </div>
            </div>
          </div>
        </section>
        <section data-s="v02">
          <div className="wrap v02">
            <div className="v-tools">
              <div className="chips">
                {["Все", "Пациенты", "Специалисты", "Видео"].map((item) => (
                  <button key={item} className={`chip${filter === item ? " is-active" : ""}`} type="button" onClick={() => {
                    setFilter(item);
                    setPage(1);
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
                  <button key={item} className={`chip${topic === item ? " is-active" : ""}`} type="button" onClick={() => { setTopic(topic === item ? "" : item); setPage(1); }}>{item}</button>
                ))}
              </div>
              <label className="v-sort">Сначала новые
                <select aria-label="Сначала новые" defaultValue="new"><option value="new">Сначала новые</option></select>
              </label>
            </div>
            <p className="v-shown">Показано {Math.min(7, cards.length)} из 312</p>
            <div className="v-grid">
              {slice.map((item) => item.video ? (
                <article key={item.id} className="rev rev-video" style={{ backgroundImage: `url(${item.photo})` }}>
                  <p><span>{item.tag}</span><span>Видео</span></p>
                  <div>
                    <p className="rev-play"><img src="/figma/icons/play.svg" alt="" />Смотреть историю · 1:24</p>
                    <h3>{item.title}</h3>
                    <b>{item.name}</b>
                    <small><img src="/figma/icons/check.svg" alt="" />Отзыв проверен модератором</small>
                  </div>
                </article>
              ) : (
                <article key={item.id} className={`rev${item.who === "Специалисты" ? " is-pro" : ""}`}>
                  <p><span>{item.tag}</span><em>{item.kind}</em></p>
                  <i aria-hidden="true">“</i>
                  <blockquote>{item.text}</blockquote>
                  <footer>
                    <img src={item.photo} alt="" />
                    <span><b>{item.name}</b>{item.role && <small>{item.role}</small>}<small><img src="/figma/icons/check.svg" alt="" />Отзыв проверен модератором</small></span>
                  </footer>
                </article>
              ))}
              <article className="rev rev-promo">
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
            <form onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              if (!data.get("agree")) return setError("Нужно согласие на публикацию");
              if (String(data.get("text") || "").trim().length < 10) return setError("Напишите чуть подробнее");
              setError("");
              setSent(true);
            }}>
              <label className="field">Имя<input name="name" /></label>
              <label className="field">Город<input name="city" /></label>
              <label className="field">О ком отзыв
                <select name="who" defaultValue="Пациент"><option>Пациент</option><option>Специалист</option></select>
              </label>
              <label className="field">Текст<textarea name="text" rows={5} /></label>
              <label className="check-row"><input name="agree" type="checkbox" /><span>Согласен на публикацию отзыва и обработку персональных данных (152-ФЗ)</span></label>
              {error && <p className="err" role="alert">{error}</p>}
              {sent && <p role="status">Отзыв отправлен на модерацию.</p>}
              <button className="btn btn-dark" type="submit">Отправить</button>
              <p className="v-hint">Кнопка активна после согласия</p>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
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
