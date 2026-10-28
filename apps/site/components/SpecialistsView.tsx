"use client";

import Link from "next/link";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Footer } from "@/components/Footer";
import { useContent } from "@/components/ContentProvider";
import { Header } from "@/components/Header";
import { useReveal } from "@/components/useReveal";
import { ARG_GRAPHICS } from "@/app/specialists/arg-graphics";

const AREAS = [
  {
    slug: "gastro",
    tab: "Гастроэнтерология",
    kicker: "Гастроэнтерология",
    title: "СРК и функциональные жалобы ЖКТ",
    text: "Пациенты со вздутием, постпрандиальным дискомфортом, болью или нестабильным стулом.",
    textDesk: "Пациенты со вздутием, постпрандиальным дискомфортом, болью, запором или нестабильным стулом. FOX можно рассматривать после базового обследования, когда стандартные рекомендации и самостоятельные ограничения не помогли выстроить устойчивый рацион.",
    gives: "Список диетических гипотез вместо хаотичных исключений.",
    givesDesk: "Профиль пищеспецифических IgG к 286 антигенам помогает сформировать список диетических гипотез и перейти от хаотичных ограничений к структурированной элиминации с последующим возвращением продуктов.",
  },
  {
    slug: "auto",
    tab: "Аутоиммунные заболевания",
    kicker: "Аутоиммунные заболевания",
    title: "Часть комплексной работы",
    text: "Тест не ставит диагноз. Его обсуждают как часть работы с питанием, если это уместно клинически.",
    gives: "",
  },
  {
    slug: "neuro",
    tab: "Неврология",
    kicker: "Неврология",
    title: "Головные боли и режим",
    text: "Когда специалист предполагает связь самочувствия с рационом, отчёт помогает отделить гипотезы от догадок дневника.",
    gives: "",
  },
  {
    slug: "derma",
    tab: "Дерматология и косметология",
    kicker: "Дерматология и косметология",
    title: "Кожа и рацион",
    text: "Высыпания, зуд и атопические проявления. Отчёт сужает разговор о возможных пищевых триггерах и не заменяет очный приём.",
    gives: "",
  },
  {
    slug: "nutri",
    tab: "Нутрициология",
    kicker: "Нутрициология",
    title: "Структура рациона",
    text: "Список из 286 позиций становится тремя зонами и порядком возврата, а не запретом полки целиком.",
    gives: "",
  },
  {
    slug: "therapy",
    tab: "Терапия и общая практика",
    kicker: "Терапия и общая практика",
    title: "С чего начать разговор",
    text: "Усталость, тяжесть и отёчность, которые человек уже списывает на возраст. FOX даёт точку отсчёта для направления.",
    gives: "",
  },
];

const RELATED = [
  ["/blog", "Клинические кейсы"],
  ["/report", "Опорный протокол ведения PDF"],
  ["/course", "Урок 5 курса: FOX в разных специализациях"],
  ["/report#ccd", "Anti-CCD-контроль: разбор"],
];

const ARGS = [
  {
    k: "01 / Покрытие",
    title: "286 пищевых антигенов",
    head: "Мультиплексный microarray-формат",
    text: "Мультиплексный microarray: весь профиль за один забор крови — без отдельных исследований под каждую гипотезу.",
    textDesk: "На небольшой тестовой поверхности размещены сотни пищевых антигенов. Лаборатория исследует весь профиль за один запуск и использует небольшой объём образца.",
    practice: "Не нужно назначать несколько отдельных исследований под разные пищевые гипотезы. Один забор крови даёт подробный аналитический профиль по 286 позициям.",
    graphic: "/figma/specialists/arg-1.svg",
  },
  {
    k: "02 / Тип результата",
    title: "Полуколичественные значения",
    head: "Значения в U/mL и уровни реактивности",
    text: "Каждый антиген — в U/mL и по уровням реактивности. Профили можно сравнить при повторном тесте.",
    textDesk: "Результат по каждому пищевому антигену представлен в U/mL и распределён по уровням реактивности. Это помогает расставить приоритеты при планировании диетического вмешательства.",
    practice: "При повторном тестировании через несколько месяцев можно сопоставить аналитические профили. Клинический эффект оценивают отдельно — по дневнику и динамике жалоб.",
    graphic: "/figma/specialists/arg-2.svg",
  },
  {
    k: "03 / Контроль сигнала",
    title: "Anti-CCD-контроль",
    head: "Отдельный контрольный канал",
    text: "Отдельный канал снижает риск переоценить перекрёстное связывание между растительными продуктами.",
    textDesk: "CCD — перекрёстно-реагирующие углеводные структуры растительных продуктов. В тесте предусмотрена отдельная зона, которая помогает распознать связывание с CCD.",
    practice: "Anti-CCD-контроль снижает риск переоценить аналитическое совпадение между растительными продуктами. Он не отменяет клиническую проверку продукта элиминацией и возвращением.",
    graphic: "/figma/specialists/arg-3.svg",
  },
  {
    k: "04 / Лабораторная платформа",
    title: "Автоматизированная система MADx",
    head: "Контроль этапов анализа",
    text: "Оборудование контролирует этапы анализа — результаты сопоставимы между лабораториями.",
    textDesk: "FOX выполняют на лабораторной платформе MacroArray Diagnostics. Оборудование контролирует основные этапы, а программная система обрабатывает сигнал и формирует отчёт.",
    practice: "Стандартизированный процесс снижает влияние ручных операций и позволяет сопоставлять результаты, полученные в разные временные точки.",
    graphic: "/figma/specialists/arg-4.svg",
  },
  {
    k: "05 / Формат отчёта",
    title: "Структурированный результат",
    head: "Группировка по семействам и зонам",
    text: "Семейства продуктов и зоны реактивности — опора для консультации и плана питания.",
    textDesk: "Данные сгруппированы по продуктовым семействам и уровням реактивности. Специалист видит зоны, количественные показатели и результаты контрольных параметров.",
    practice: "Отчёт служит опорой для консультации: помогает объяснить пациенту логику временных ограничений, составить план замен и определить порядок возвращения продуктов.",
    graphic: "/figma/specialists/arg-5.svg",
  },
];

const ROUTE = [
  {
    title: "Назначение теста и забор крови",
    text: "Вы направляете пациента в лабораторию-партнёр FOX. Забор крови проводят по стандартному лабораторному протоколу.",
    role: "Что делаете вы",
    you: "Определяете задачу исследования, объясняете роль FOX и даёте рекомендации по подготовке. До теста не нужно исключать привычные продукты.",
  },
  {
    title: "Мультиплексный анализ IgG",
    text: "Образец исследуют одновременно по 286 пищевым антигенам. Автоматизированная система измеряет интенсивность сигнала для каждой позиции.",
    role: "Участие специалиста",
    you: "На лабораторном этапе не требуется",
  },
  {
    title: "Контроль качества и формирование отчёта",
    text: "Система проверяет внутренние контрольные параметры, учитывает anti-CCD-канал и формирует структурированный отчёт с группировкой по семействам.",
    role: "Участие специалиста",
    you: "Единая методика стандартизирует лабораторный процесс",
  },
  {
    title: "Интерпретация и работа с пациентом",
    text: "Вы получаете PDF-отчёт: индивидуальный IgG-профиль, распределение по уровням, группировку и данные контроля качества.",
    role: "Что делаете вы",
    you: "Строите тактику питания, объясняете результат, контролируете полноценность меню и назначаете точку повторной оценки.",
  },
];

const PROTOCOL = [
  {
    title: "Подготовка",
    when: "до старта",
    text: "Зафиксируйте исходные симптомы и привычный рацион.",
    textDesk: "До начала элиминации зафиксируйте исходные симптомы, частоту их появления и привычный рацион. Выберите нутритивно полноценные замены для каждого исключаемого продукта.",
  },
  {
    title: "Элиминация",
    when: "~6 недель",
    text: "Красная и жёлтая зоны временно исключаются.",
    textDesk: "Продукты из красной и жёлтой зон временно исключают из рациона. Срок можно изменить с учётом состояния пациента, выраженности реакций и риска дефицитов.",
  },
  {
    title: "Контроль",
    when: "всю элиминацию",
    text: "Дневник питания и симптомов.",
    textDesk: "Пациент ведёт дневник питания и симптомов. Заранее определите показатели: боль, вздутие, частота стула, головные боли, состояние кожи или уровень энергии.",
  },
  {
    title: "Возвращение",
    titleDesk: "Возвращение продуктов",
    when: "с 7 недели",
    text: "Жёлтая зона — по одному, красная — позже.",
    textDesk: "Жёлтая зона — по одному с интервалом, достаточным для оценки отсроченной реакции. Красная — позже и осторожнее; последовательность зависит от уровня IgG, клиники и пищевой ценности продукта.",
  },
  {
    title: "Итоговый рацион",
    when: "далее",
    text: "Подтверждённые триггеры ограничивают.",
    textDesk: "Продукты, после возвращения которых симптомы не воспроизводятся, возвращают в меню. Подтверждённые триггеры ограничивают индивидуально, сохраняя рацион максимально разнообразным.",
  },
];

const REPORT = [
  {
    title: "Сводка реактивности",
    text: "Пищевые антигены распределены по красной, жёлтой и зелёной зонам. Пациент видит общую картину, а специалист определяет приоритеты.",
  },
  { title: "Значения по каждому антигену", text: "" },
  { title: "Группировка по семействам", text: "" },
  { title: "Контроль качества и anti-CCD", text: "" },
];

const EXPERTS = [
  {
    name: "Алёна Вавилова",
    role: "Клинический нутрициолог, health-coach",
    src: "/figma/specialists/alyona.webp",
    facts: ["7+ лет в нутрициологии", "Основатель сообщества нутрициологов Москвы", "Член Международной ассоциации нутрициологов и коучей"],
  },
  {
    name: "Ксения Эллинская",
    role: "К. м. н., врач-дерматовенеролог, косметолог, нутрициолог",
    src: "/figma/specialists/ksenia.webp",
    facts: ["21 год клинической практики", "Автор профессионального блога с аудиторией 85 000+ подписчиков", "Эксперт по связи питания и состояния кожи"],
  },
  {
    name: "Дмитрий Эллинский",
    role: "Врач-дерматовенеролог, трихолог, нутрициолог",
    src: "/figma/specialists/dmitry.webp",
    facts: ["15 лет клинической практики", "Главный дерматолог холдинга «СМ-Клиника»", "Наставник более 100 врачей-дерматологов"],
  },
];

const LABS: Array<[string, string]> = [
  ["Гемотест", "/figma/labs/fig/gemotest.svg"],
  ["KDL", "/figma/labs/fig/kdl.svg"],
  ["ДНКОМ", "/figma/labs/fig/dnkom.svg"],
  ["Инвитро", "/figma/labs/fig/invitro.svg"],
  ["CMD", "/figma/labs/fig/cmd.svg"],
  ["Юнимед", "/figma/labs/fig/unimed.svg"],
  ["Ситилаб", "/figma/labs/fig/citilab.svg"],
  ["Хромолаб", "/figma/labs/fig/chromolab.svg"],
  ["Хеликс", "/figma/labs/fig/helix.svg"],
];

const LECTURERS = [
  ["Светлана Каневская", "Д. м. н., профессор, гастроэнтеролог-нутрициолог · уроки 1, 2, 6", "/figma/specialists/svetlana.webp"],
  ["Алёна Вавилова", "Клинический нутрициолог · урок 3", "/figma/specialists/alyona.webp"],
  ["Ксения Эллинская", "К. м. н., дерматовенеролог · урок 4", "/figma/specialists/ksenia.webp"],
  ["Дмитрий Эллинский", "Дерматовенеролог, трихолог · урок 5", "/figma/specialists/dmitry.webp"],
];

const HERO_TILES: Array<[string, string, string, string]> = [
  ["286", "пищевых антигенов", "286 пищевых антигенов", "Широкая панель привычных продуктов, отдельных белков, специй, суперфудов и компонентов популярных добавок."],
  ["IgG1–4", "суммарный профиль", "Общий IgG1–IgG4", "Суммарный уровень четырёх подклассов пищеспецифического IgG — единый профиль реактивности."],
  ["ELISA", "мультиплексный", "Мультиплексный непрямой ELISA", "Сотни антигенов за один анализ. Связывание IgG с антигеном преобразуется в измеримый сигнал."],
  ["IVDR", "ISO 13485", "IVDR", "Соответствие требованиям ЕС к медизделиям для лабораторной диагностики: безопасность, производство, контроль качества."],
  ["ISO", "EN ISO 13485", "EN ISO 13485", "Международный стандарт менеджмента качества для медицинских изделий: разработка, производство, контроль систем."],
  ["MADx", "платформа · Австрия", "Платформа MADx · Австрия", "FOX разработала австрийская компания MacroArray Diagnostics. Единая платформа автоматизирует обработку и стандартизирует анализ."],
];

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* P03: «Hover строки — графика проигрывает свою анимацию ещё раз». The graphic's animations are named in pairs
   (ag-x / ag-x-b, motion.css); flipping data-play swaps the names, which restarts every part of the graphic once,
   without the ~rv delay of the entrance. */
function replayGraphic(event: React.MouseEvent<HTMLElement>) {
  const row = event.currentTarget;
  if (!row.classList.contains("rv-in") || reduceMotion() || !window.matchMedia("(hover: hover)").matches) return;
  row.style.setProperty("--ag-base", "0ms");
  row.dataset.play = row.dataset.play === "b" ? "a" : "b";
}


/** Horizontal swipe (touch): calls back with +1 (finger to the left) / −1 (to the right). */
function useSwipe(onSwipe: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (event: React.TouchEvent) => { const t = event.touches[0]; start.current = { x: t.clientX, y: t.clientY }; },
    onTouchEnd: (event: React.TouchEvent) => {
      const from = start.current;
      start.current = null;
      const t = event.changedTouches[0];
      if (!from || !t) return;
      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
    },
  };
}

/** P02 «Области»: own state, so a tab switch re-renders this block only (not the whole page). */
function AreasSection() {
  const [area, setArea] = useState(0);
  // The panel shows `shown`; the tab row follows `area` at once (P2: chip fill 150 мс, panel crossfade after it).
  const [shown, setShown] = useState(0);
  const [swapped, setSwapped] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const current = AREAS[shown];
  // M09: a horizontal swipe over the panel switches the tab.
  const swipe = useSwipe((dir) => pickArea(area + dir));

  /* M09 (phone): the black pill is one element that slides and resizes to the picked tab (240 мс ease-in-out) instead
     of the fill jumping from chip to chip. It sits inside the scrolling row, so it scrolls with the tabs. */
  const pillRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const place = () => {
      const tab = tabsRef.current?.children[area + 1] as HTMLElement | undefined;
      const pill = pillRef.current;
      if (!tab || !pill) return;
      pill.style.setProperty("--pill-x", `${tab.offsetLeft}px`);
      pill.style.setProperty("--pill-w", `${tab.offsetWidth}px`);
      pill.style.setProperty("--pill-h", `${tab.offsetHeight}px`);
      pill.style.setProperty("--pill-y", `${tab.offsetTop}px`);
    };
    place();
    // first placement without motion
    const frame = window.requestAnimationFrame(() => pillRef.current?.classList.add("is-ready"));
    window.addEventListener("resize", place);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", place); };
  }, [area]);

  useEffect(() => {
    const apply = () => {
      const slug = new URLSearchParams(window.location.search).get("area");
      const index = AREAS.findIndex((item) => item.slug === slug);
      if (index >= 0) { setArea(index); setShown(index); }
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  /* P2 / M09: the outgoing panel fades 1→0 in 120 мс, the incoming one fades in with an 8px shift (200 мс) starting
     60 мс later (overlap 60 мс); the container height animates 250 мс between the two measured heights and then goes
     back to auto — a fixed px height used to stay forever (the panel never shrank again on a phone and clipped
     after a resize). On a phone the shift goes toward the picked tab, the photo settles 1.04→1. */
  function pickArea(index: number) {
    if (index < 0 || index >= AREAS.length || index === area) return;
    const panel = panelRef.current;
    const dir = index > area ? 1 : -1;
    setArea(index);
    const url = new URL(window.location.href);
    url.searchParams.set("area", AREAS[index].slug);
    window.history.replaceState(null, "", url);
    const row = tabsRef.current;
    const tab = row?.children[index + 1] as HTMLElement | undefined; // [0] is the M09 pill
    if (row && tab && row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2, behavior: reduceMotion() ? "auto" : "smooth" });
    }
    if (!panel || reduceMotion()) { setShown(index); return; }
    const before = panel.getBoundingClientRect().height;
    const copy = panel.querySelector<HTMLElement>(".sp-panel-copy");
    panel.querySelectorAll(".sp-ghost").forEach((node) => node.remove());
    if (copy) {
      const ghost = copy.cloneNode(true) as HTMLElement;
      ghost.classList.add("sp-ghost");
      ghost.classList.remove("is-in");
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      Object.assign(ghost.style, { left: `${copy.offsetLeft}px`, top: `${copy.offsetTop}px`, width: `${copy.offsetWidth}px` });
      panel.appendChild(ghost);
      window.setTimeout(() => ghost.remove(), 160);
    }
    panel.style.setProperty("--sp-dir", String(dir));
    panel.style.height = "";
    flushSync(() => { setShown(index); setSwapped(true); });
    const after = panel.getBoundingClientRect().height;
    if (Math.abs(after - before) < 1) return;
    panel.style.height = `${before}px`;
    void panel.offsetHeight;
    panel.style.height = `${after}px`;
    const done = (event?: TransitionEvent) => {
      if (event && (event.target !== panel || event.propertyName !== "height")) return;
      panel.style.height = "";
      panel.removeEventListener("transitionend", done);
    };
    panel.addEventListener("transitionend", done);
    window.setTimeout(() => done(), 400);
  }

  return (
        <section className="sp-sec" id="areas" data-s="p02">
          <div className="wrap sp-stack-48">
            <div className="sp-head">
              <h2 className="sp-h2">Где FOX дополняет работу специалиста</h2>
              <p className="sp-lead">
                <span className="is-desk">Выберите свою специализацию — покажем клинические сценарии и то, что даёт отчёт именно в вашей практике.</span>
                <span className="is-mob">Выберите специализацию — покажем клинические сценарии.</span>
              </p>
            </div>
            <div className="sp-tabs" role="tablist" aria-label="Специализации" data-allow-x ref={tabsRef}>
              <i className="sp-tab-pill" aria-hidden ref={pillRef} />
              {AREAS.map((item, index) => (
                <button
                  key={item.slug}
                  className={`sp-tab${area === index ? " is-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={area === index}
                  onClick={() => pickArea(index)}
                >
                  {item.tab}
                </button>
              ))}
            </div>
            <div className="area-panel sp-panel" ref={panelRef} role="tabpanel" {...swipe}>
              <div className={`sp-panel-copy${swapped ? " is-in" : ""}`} key={shown}>
                <p className="sp-kicker">{current.kicker}</p>
                <h3>{current.title}</h3>
                <p className="sp-lead sp-lead-ink">
                  {"textDesk" in current && current.textDesk ? (
                    <>
                      <span className="is-desk">{current.textDesk}</span>
                      <span className="is-mob">{current.text}</span>
                    </>
                  ) : current.text}
                </p>
                {current.gives ? (
                  <div className="sp-gives">
                    <p className="sp-kicker">Что даёт FOX</p>
                    <p>
                      {"givesDesk" in current && current.givesDesk ? (
                        <>
                          <span className="is-desk">{current.givesDesk}</span>
                          <span className="is-mob">{current.gives}</span>
                        </>
                      ) : current.gives}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="sp-related">
                <img key={shown} className={swapped ? "is-in" : undefined} src="/figma/specialists/scenario.jpg" alt="" />
                <p className="sp-note">Смежные материалы</p>
                {RELATED.map(([href, label]) => (
                  <Link key={label} href={href}>
                    <span>{label}</span>
                    <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
  );
}

/** P06 «Анатомия отчёта»: own state — the 6 s autoplay and the page turns re-render this block only (before, every
    turn re-rendered the whole page: 100–170 ms main-thread frames at 4× CPU while scrolling). */
function ReportSection() {
  const [report, setReport] = useState(0);
  /* P6: the front sheet turns over its left edge (rotateY 0 → −165°, perspective 1800, 700 мс
     cubic-bezier(.6,.05,.3,1)) with a shadow running across it; the next sheet straightens out of the stack
     (−3.5° → 0) into its place; then the zone frame and marker fade in (scale .98 → 1, 200 мс).
     Clicks during a turn retarget it instead of restarting. Reduced motion: no turn, a 200 мс crossfade. */
  const [turning, setTurning] = useState(false);
  const [turned, setTurned] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef(0);
  const pending = useRef<number | null>(null);
  const turnTimer = useRef<number | null>(null);

  function pickReport(index: number) {
    const next = ((index % REPORT.length) + REPORT.length) % REPORT.length;
    if (turnTimer.current) { pending.current = next; return; }
    if (next === reportRef.current) return;
    if (reduceMotion()) {
      setTurned(true);
      reportRef.current = next;
      setReport(next);
      return;
    }
    const stage = stageRef.current;
    const front = stage?.querySelector<HTMLElement>(".sp-sheet.is-front");
    const under = stage?.querySelector<HTMLElement>(".sp-sheet.is-back-1");
    if (front && under) {
      if (getComputedStyle(under).display === "none") {
        // No visible stack on this width: the next sheet waits right under the front one.
        Object.assign(under.style, { display: "block", position: "absolute", margin: "0", left: `${front.offsetLeft}px`, top: `${front.offsetTop}px`, width: `${front.offsetWidth}px`, height: `${front.offsetHeight}px`, transform: "none" });
      } else {
        under.style.setProperty("--dx", `${front.offsetLeft - under.offsetLeft}px`);
        under.style.setProperty("--dy", `${front.offsetTop - under.offsetTop}px`);
      }
    }
    setTurning(true);
    turnTimer.current = window.setTimeout(() => {
      const target = pending.current ?? next;
      pending.current = null;
      turnTimer.current = null;
      reportRef.current = target;
      // the under sheet's inline box is cleared by the layout effect below, in the same frame as the front sheet
      // comes back (clearing it here first left a frame or two with no page at all)
      // the zone fade-in is armed only now, so the old zone does not replay while the page turns
      setTurned(true);
      setReport(target);
      setTurning(false);
    }, 700);
  }

  useEffect(() => () => { if (turnTimer.current) window.clearTimeout(turnTimer.current); }, []);
  useLayoutEffect(() => {
    if (turning) return;
    stageRef.current?.querySelector<HTMLElement>(".sp-sheet.is-back-1")?.removeAttribute("style");
  }, [turning]);

  // Autoplay every 6 s is driven by the progress bar under the active tab (its animationend), so the bar and the
  // turn are always in step; the bar pauses on hover over the block and while the block is off screen.
  const anatomyRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    // the section, not .sp-anatomy: on a phone that box is display: contents and is never «on screen»
    const node = anatomyRef.current?.closest("section");
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.3 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const swipe = useSwipe((dir) => pickReport(report + dir));

  return (
        <section className="sp-sec sp-report" id="report" data-s="p06">
          <div className="wrap sp-stack-72">
            <div className={`sp-anatomy${onScreen ? " is-live" : ""}`} ref={anatomyRef}>
              <div className="sp-anatomy-copy">
                <p className="sp-eyebrow"><i />Анатомия отчёта · 4 раздела</p>
                <h2><span className="is-desk">Отчёт FOX — структурированная основа для консультации</span><span className="is-mob">Отчёт FOX — основа для консультации</span></h2>
                <p className="sp-lead-inv">Один отчёт — четыре уровня чтения. Листайте разделы: страница переворачивается, а на отчёте подсвечивается нужная зона.</p>
                <div className="sp-report-tabs" data-allow-x>
                  {REPORT.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      className={report === index ? "is-active" : ""}
                      onClick={() => pickReport(index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <strong><span className="is-desk">{item.title}</span><span className="is-mob">{["Сводка", "Значения", "Семейства", "Контроль"][index]}</span></strong>
                        {report === index && item.text ? <em>{item.text}</em> : null}
                        {report === index ? <i key={report} onAnimationEnd={(event) => { if (event.animationName.startsWith("sp-progress") && !reduceMotion()) pickReport(report + 1); }} /> : null}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="sp-cta sp-report-cta">
                  <Link className="btn btn-light" href="/report">Скачать пример отчёта</Link>
                  <Link className="sp-arrow sp-arrow-light" href="/report">
                    <span className="is-desk">Как читать отчёт</span><span className="is-mob">Подробно: как читать отчёт</span>
                    <img className="is-desk" src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                    <img className="is-mob" src="/figma/home/checker/plus.svg" alt="" width={16} height={16} />
                  </Link>
                </div>
              </div>
              <div className={`sp-stage${turned ? " has-turned" : ""}`} ref={stageRef} {...swipe}>
                <div className="sp-sheet is-back-2" aria-hidden>
                  <img src="/figma/report/p4.webp" alt="" />
                </div>
                <div className={`sp-sheet is-back-1${turning ? " is-rising" : ""}`} aria-hidden>
                  <img src="/figma/report/p4.webp" alt="" />
                </div>
                <div className={`sp-sheet is-front is-zone-${report + 1}${turning ? " is-turning" : ""}`}>
                  <img src="/figma/report/p4.webp" alt="" />
                  <span className="sp-highlight" key={`h${report}`} />
                  <b key={`b${report}`}>{String(report + 1).padStart(2, "0")}</b>
                </div>
                <div className="sp-controls">
                  <button type="button" aria-label="Предыдущий раздел отчёта" onClick={() => pickReport(report - 1)} disabled={report === 0}>
                    <img className="sp-flip" src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                  </button>
                  <button type="button" aria-label="Следующий раздел отчёта" onClick={() => pickReport(report + 1)} disabled={report === REPORT.length - 1}>
                    <img src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                  </button>
                  <p>{String(report + 1).padStart(2, "0")} / 04</p>
                  <div className="sp-dots">
                    {REPORT.map((item, index) => (
                      <i key={item.title} className={report === index ? "is-on" : ""} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* All four captions share one grid cell: the block keeps the height of the longest one, so the autoplay no
                longer changes the page height (it made the page jump 60px every 6 s on a phone via scroll anchoring). */}
            <div className="sp-active is-mob-block" aria-live="polite">
              {REPORT.map((item, index) => (
                <div key={item.title} className={report === index ? "is-on" : undefined} aria-hidden={report !== index}>
                  <h3>{item.title}</h3>
                  {item.text ? <p>{item.text}</p> : null}
                </div>
              ))}
            </div>
            <div className="sp-absent">
              <h3><span className="is-desk">Чего в отчёте нет — и почему</span><span className="is-mob">Чего в отчёте нет</span></h3>
              <p className="sp-lead">FOX предоставляет лабораторный профиль пищеспецифических IgG, но не заменяет клиническое решение специалиста.</p>
              <div className="sp-negatives">
                {["Нет диагноза", "Нет назначения препаратов", "Нет универсального меню", "Не оценка риска анафилаксии"].map((label) => (
                  <span key={label}>
                    <img src="/figma/specialists/close.svg" alt="" width={16} height={16} />
                    {label}
                  </span>
                ))}
              </div>
              <p className="sp-note-wide">
                Специалист сопоставляет данные FOX с анамнезом, рационом, результатами обследования и динамикой жалоб, а затем составляет индивидуальный план элиминации и возвращения продуктов.
              </p>
            </div>
          </div>
        </section>
  );
}

/** M10: the index of the card a phone carousel is snapped to, read from its scroll through rAF; state changes only
    when the index changes, so only the owning block re-renders. */
function useCarouselIndex(count: number) {
  const [index, setIndex] = useState(0);
  const frame = useRef(0);
  const onScroll = (event: React.UIEvent<HTMLElement>) => {
    const row = event.currentTarget;
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      const card = row.firstElementChild as HTMLElement | null;
      const step = (card?.offsetWidth ?? 290) + (parseFloat(getComputedStyle(row).columnGap) || 12);
      // the last card cannot reach the left edge: the end of the scroll range counts as the last card
      const end = row.scrollLeft >= row.scrollWidth - row.clientWidth - 2;
      const next = end ? count - 1 : Math.min(count - 1, Math.round(row.scrollLeft / step));
      setIndex((prev) => (prev === next ? prev : next));
    });
  };
  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);
  return [index, onScroll] as const;
}

/** P04 route. M10 (phone carousel): the current step's number stays lime, the steps already passed turn dark; the
    dots under the row follow the snapped card (Figma «Мобайл · Специалистам · 390» → P04: lime 20×6 + 6×6). */
function RouteSection() {
  const [step, onScroll] = useCarouselIndex(ROUTE.length);
  return (
        <section className="sp-sec sp-dark" id="route" data-s="p04">
          <div className="wrap sp-stack-48">
            <div className="sp-head sp-head-tight">
              <h2 className="sp-h2"><span className="is-desk">От назначения до готового отчёта — обычно 7–10 дней</span><span className="is-mob">От назначения до отчёта — обычно 7–10 дней</span></h2>
              <p className="sp-lead-inv"><span className="is-desk">Точный срок устанавливает лаборатория, которая проводит исследование.</span><span className="is-mob">Точный срок устанавливает лаборатория.</span></p>
            </div>
            <div className="sp-timeline" data-rv="0">
              <svg className="sp-route-line" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden>
                <line x1="0" y1="1" x2="100" y2="1" pathLength="1" />
              </svg>
              <div className="sp-steps" data-allow-x onScroll={onScroll}>
                {ROUTE.map((item, index) => (
                  <article className={`sp-step${index < step ? " is-passed" : index === step ? " is-current" : ""}`} key={item.title}>
                    <div className="sp-step-top">
                      <span>{index + 1}</span>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                    <div className="sp-step-you">
                      <p>{item.role}</p>
                      <p>{item.you}</p>
                    </div>
                  </article>
                ))}
              </div>
              {/* M10 (note 1344:19028): «счётчик „2 / 5“ и точки» — the dots (frame P04 390: lime 20×6 + 6×6) and, on the same
                  line at the right edge of the wrap, the counter «N / 4» (Label/Medium 14/18 of the carousel element
                  1303:2802, inverted secondary colour on the dark section). Both follow the snapped card. */}
              <div className="sp-route-foot is-mob-block">
                <div className="sp-dots-m sp-route-dots" aria-hidden>
                  {ROUTE.map((item, index) => <i key={item.title} className={step === index ? "is-on" : ""} />)}
                </div>
                <span className="sp-count sp-route-count" aria-live="polite">{step + 1} / {ROUTE.length}</span>
              </div>
            </div>
          </div>
        </section>
  );
}

/** P07 experts: the phone carousel counter / dots follow the scroll (M10). */
function ExpertsSection() {
  const [expert, onScroll] = useCarouselIndex(EXPERTS.length);

  return (
        <section className="sp-sec" id="experts" data-s="p07">
          <div className="wrap sp-stack-48">
            <div className="sp-experts-head">
              <h2 className="sp-h2 sp-narrow">Наши эксперты</h2>
              <span className="sp-count is-mob">{expert + 1} / {EXPERTS.length}</span>
            </div>
            <div className="sp-experts" data-allow-x onScroll={onScroll}>
              {EXPERTS.map((person) => (
                <article key={person.name}>
                  <div className="sp-portrait">
                    <img src={person.src} srcSet={`${person.src.replace(".webp", "-512.webp")} 512w, ${person.src} 1024w`} sizes="(min-width: 1101px) 480px, 290px" alt={person.name} />
                  </div>
                  <div>
                    <h3>{person.name}</h3>
                    <p>{person.role}</p>
                  </div>
                  <ul>
                    {person.facts.map((fact) => (
                      <li key={fact}><span>—</span>{fact}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="sp-dots-m is-mob-block" aria-hidden>
              {EXPERTS.map((person, index) => <i key={person.name} className={expert === index ? "is-on" : ""} />)}
            </div>
          </div>
        </section>
  );
}

export function SpecialistsView() {
  const content = useContent();
  const heroRef = useRef<HTMLElement>(null);
  useReveal();

  // M10: the first time a phone carousel is 40% on screen it nudges 24px and comes back — once per session.
  useEffect(() => {
    if (reduceMotion()) return;
    const timers: number[] = [];
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const row = entry.target as HTMLElement;
      io.unobserve(row);
      if (row.scrollWidth <= row.clientWidth + 4 || row.scrollLeft > 0) return;
      const key = `fox-nudge:${row.closest("[data-s]")?.getAttribute("data-s")}`;
      try {
        if (window.sessionStorage.getItem(key)) return;
        window.sessionStorage.setItem(key, "1");
      } catch { /* storage blocked: nudge anyway */ }
      // after the entrance of the cards, so the two motions do not overlap
      timers.push(window.setTimeout(() => {
        row.classList.add("sp-nudge");
        timers.push(window.setTimeout(() => row.classList.remove("sp-nudge"), 700));
      }, 900));
    }), { threshold: 0.4 });
    document.querySelectorAll('[data-s="p04"] .sp-steps, [data-s="p07"] .sp-experts').forEach((row) => io.observe(row));
    return () => { io.disconnect(); timers.forEach((t) => window.clearTimeout(t)); };
  }, []);

  // P3: the chip's scan line loops (3 s) only while its row is on screen.
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => entry.target.classList.toggle("is-live", entry.isIntersecting)));
    document.querySelectorAll('[data-s="p03"] .sp-arg').forEach((row) => io.observe(row));
    return () => io.disconnect();
  }, []);

  // P1: if the photo is still loading when the page wakes up, its entrance waits for it (a late photo used to pop in
  // after its animation had already run); a cached photo is not held back.
  // The photo drops will-change once its blur entrance is over (P01: the layer is promoted only while it runs).
  useEffect(() => {
    heroRef.current?.querySelectorAll<HTMLImageElement>("img.bg:not(.sp-hero-blur), img.sp-hero-m").forEach((img) => {
      const settle = (event: AnimationEvent) => { if (event.target === img) img.classList.add("is-settled"); };
      img.addEventListener("animationend", settle, { once: true });
      if (getComputedStyle(img).display === "none") img.classList.add("is-settled");
      if (img.complete) return;
      img.classList.add("is-wait");
      const go = () => img.classList.remove("is-wait");
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
    });
  }, []);

  // P1: the hero photo follows the scroll at 0.85 (moves down 0.15 of the scroll inside the clipped hero).
  useEffect(() => {
    if (reduceMotion()) return;
    const hero = heroRef.current;
    if (!hero) return;
    // Only the full-bleed (absolute) photo: the in-flow phone photo would open a gap under the header.
    const photos = Array.from(hero.querySelectorAll<HTMLElement>("img.bg"));
    let frame = 0;
    let last = -1;
    let live = false;
    let height = 0;
    const measure = () => {
      // desktop only: on a tablet the photo ends above the glass tiles, and moving it down slid the white coat under
      // their light text (contrast 1.4:1 while scrolling)
      live = window.innerWidth >= 1101 && photos.some((img) => getComputedStyle(img).position === "absolute");
      height = hero.offsetHeight;
    };
    const apply = () => {
      frame = 0;
      const y = live ? Math.round(Math.min(window.scrollY, height) * 0.15) : 0;
      if (y === last) return;
      last = y;
      photos.forEach((img) => { img.style.translate = y ? `0 ${y}px` : ""; });
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(apply); };
    const onResize = () => { measure(); onScroll(); };
    measure();
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <Header />
      <main>
        <section className="dark-hero" data-s="p01" ref={heroRef}>
          {/* P1: a 128px pre-blurred copy under the photo — the photo comes «from blur» by opacity + scale only
              (animating filter: blur on a full-bleed photo cost 80–120 ms frames at 4× CPU). */}
          <img className="bg sp-hero-blur" src="/figma/specialists/hero-blur.webp" alt="" aria-hidden data-no-sk />
          <img className="bg" data-no-sk src="/figma/specialists/hero-1440.webp" srcSet="/figma/specialists/hero-1440.webp 1440w, /figma/specialists/hero.webp 2400w" sizes="(min-width: 1440px) 100vw, 1440px" alt="" />
          <img className="sp-hero-m-blur" src="/figma/specialists/hero-m-blur.webp" alt="" aria-hidden data-no-sk />
          <img className="sp-hero-m" data-no-sk src="/figma/specialists/hero-m.webp" srcSet="/figma/specialists/hero-m.webp 780w, /figma/specialists/hero-m@3x.webp 1170w" sizes="100vw" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <div className="sp-hero-copy">
              <div className="sp-pills">
                <span>{content.text("specialists.hero.pill1")}</span>
                <span>{content.text("specialists.hero.pill2")}</span>
              </div>
              <h1>{content.text("specialists.hero.title").split(" ").map((word, index, all) => (
                <Fragment key={index}><span className="sp-w" style={{ "--i": index } as React.CSSProperties}>{word}</span>{index < all.length - 1 ? " " : null}</Fragment>
              ))}</h1>
              <p className="sp-lead-inv">
                <span className="is-desk">{content.text("specialists.hero.lead")}</span>
                <span className="is-mob">{content.text("specialists.hero.leadMobile")}</span>
              </p>
              <p className="sp-body-inv">{content.text("specialists.hero.body")}</p>
              <div className="sp-cta">
                <Link className="btn btn-light" href="/report">{content.text("specialists.hero.cta")}</Link>
                <Link className="sp-arrow sp-arrow-light" href="/labs">
                  Найти лабораторию-партнёра
                  <img className="is-desk" src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                  <img className="is-mob sp-plus" src="/figma/home/checker/plus.svg" alt="" width={16} height={16} />
                </Link>
              </div>
            </div>
            <div className="sp-specs">
              {[0, 1].map((row) => (
                <div className="sp-spec-row" key={row}>
                  {HERO_TILES.slice(row * 3, row * 3 + 3).map(([value, caption, title, text], index) => (
                    <article className={`sp-tile${row * 3 + index >= 4 ? " is-extra" : ""}`} key={title}>
                      <span className="sp-bar" />
                      <h2>
                        <span className="sp-tile-long">{title}</span>
                        <b className="sp-tile-value">{value}</b>
                        <span className="sp-tile-cap">{caption}</span>
                      </h2>
                      <p>{text}</p>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <AreasSection />

        <section className="sp-sec sp-white" id="method" data-s="p03">
          <div className="wrap sp-stack-40">
            <h2 className="sp-h2 sp-narrow">Почему специалисты выбирают FOX</h2>
            <div className="sp-args" data-allow-x>
              {ARGS.map((item, index) => (
                <article className="sp-arg" key={item.k} data-rv="70" onMouseEnter={replayGraphic}>
                  <div className="sp-arg-visual">
                    <img className="sp-arg-bg" src="/figma/home/hero-panel-texture.webp" alt="" />
                    <svg className={`sp-arg-graphic ag-${index + 1}`} viewBox="0 0 160 160" fill="none" aria-hidden dangerouslySetInnerHTML={{ __html: ARG_GRAPHICS[index] }} />
                  </div>
                  <div>
                    <p className="sp-note">{item.k}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <div>
                    <p className="sp-kicker">{item.head}</p>
                    <p>
                      <span className="is-desk">{item.textDesk}</span>
                      <span className="is-mob">{item.text}</span>
                    </p>
                  </div>
                  <div className="sp-practice">
                    <p className="sp-kicker">В практике</p>
                    <p>{item.practice}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <RouteSection />

        <section className="sp-sec" id="protocol" data-s="p05">
          <div className="wrap sp-stack-40">
            <div className="sp-proto-head">
              <div className="sp-head sp-head-tight">
                <h2 className="sp-h2">Опорный протокол работы с рационом</h2>
                <p className="sp-lead">
                  <span className="is-desk">Схема носит опорный характер. Сроки и последовательность специалист определяет индивидуально — с учётом состояния пациента, выраженности реакций и риска дефицитов.</span>
                  <span className="is-mob">Сроки и последовательность специалист определяет индивидуально.</span>
                </p>
              </div>
              <Link className="btn btn-dark" href="/report">Скачать протокол PDF</Link>
            </div>
            <div className="sp-table">
              {PROTOCOL.map((step, index) => (
                <article className={index % 2 === 0 ? "is-odd" : ""} key={step.title}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>
                      <span className="is-desk">{step.titleDesk ?? step.title}</span>
                      <span className="is-mob">{step.title}</span>
                    </h3>
                    <p>
                      <span className="is-desk">{step.textDesk}</span>
                      <span className="is-mob">{step.text}</span>
                    </p>
                  </div>
                  <b>{step.when}</b>
                </article>
              ))}
            </div>
            <p className="sp-compliance">
              Важно: элиминацию проводят только с полноценными заменами — иначе растёт риск дефицита питательных веществ. Уровень IgG не говорит о вреде продукта и не означает пожизненного запрета.
            </p>
          </div>
        </section>

        <ReportSection />

        <ExpertsSection />

        <section className="sp-sec sp-grey" id="labs" data-s="p08">
          <div className="wrap sp-stack-40">
            <div className="sp-head sp-head-tight">
              <h2 className="sp-h2">Лаборатории-партнёры</h2>
              <p className="sp-lead">
                <span className="is-desk">Выберите лабораторию-партнёр FOX и уточните актуальные условия, стоимость и срок выполнения исследования.</span>
                <span className="is-mob">Уточните условия, стоимость и срок в выбранной сети.</span>
              </p>
            </div>
            <div className="sp-labs" data-allow-x>
              {LABS.map(([name, src]) => (
                <Link key={name} href="/labs" data-rv="40">
                  <img src={src} alt={name} />
                  <span>
                    Направить пациента
                    <img src="/icons/arrow-up-right.svg" alt="" width={16} height={16} />
                  </span>
                </Link>
              ))}
            </div>
            <Link className="btn btn-dark sp-labs-m" href="/labs">Направить пациента</Link>
            <div className="sp-partner">
              <div>
                <h3>Стать лабораторией-партнёром</h3>
                <p><span className="is-desk">Отдельный вход для сетей и клиник: условия подключения, обучение персонала и материалы для пациентов.</span><span className="is-mob">Условия подключения, обучение персонала и материалы для пациентов.</span></p>
              </div>
              <Link href="/contacts">Оставить заявку<img className="is-mob" src="/icons/arrow-right.svg" alt="" width={16} height={16} /></Link>
            </div>
          </div>
        </section>

        <section className="sp-sec sp-white" id="course" data-s="p09">
          <div className="wrap">
            <div className="sp-course">
              <div className="sp-course-copy">
                <span className="sp-bar sp-bar-lg" data-rv="0" />
                <h2 className="sp-h2" data-rv="0" data-rv-base="160">Научитесь работать с FOX Food Xplorer бесплатно</h2>
                <p className="sp-lead" data-rv="0" data-rv-base="220">
                  <span className="is-desk">Авторский курс для врачей, нутрициологов и других профильных специалистов: от механизмов пищевых реакций до интерпретации отчёта и построения элиминационно-ротационной тактики.</span>
                  <span className="is-mob">Авторский курс: от механизмов пищевых реакций до интерпретации отчёта.</span>
                </p>
                <div className="sp-facts">
                  {["6 модулей", "≈ 90 минут", "Сертификат", "Бессрочный доступ"].map((fact) => <span key={fact} data-rv="80" data-rv-base="380">{fact}</span>)}
                </div>
                <div className="sp-cta" data-rv="0" data-rv-base="700">
                  <Link className="btn btn-dark" href="/course">Зарегистрироваться на курс</Link>
                  <Link className="sp-arrow" href="/course#program">
                    Программа курса
                    <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
                  </Link>
                </div>
              </div>
              <aside className="sp-lectors" data-rv="0" data-rv-base="220">
                <div className="sp-fan" aria-hidden="true">
                  {LECTURERS.map(([name, , src]) => (
                    <img key={name} src={src.replace(".webp", "-256.webp")} srcSet={`${src.replace(".webp", "-256.webp")} 256w, ${src.replace(".webp", "-512.webp")} 512w`} sizes="64px" alt="" />
                  ))}
                </div>
                <p className="sp-fan-cap">4 лектора · врачи и нутрициологи</p>
                <p className="sp-lector-label">Лекторы</p>
                {LECTURERS.map(([name, role, src]) => (
                  <div key={name}>
                    <img src={src.replace(".webp", "-256.webp")} srcSet={`${src.replace(".webp", "-256.webp")} 256w, ${src.replace(".webp", "-512.webp")} 512w`} sizes="64px" alt="" />
                    <div>
                      <strong>{name}</strong>
                      <span>{role}</span>
                    </div>
                  </div>
                ))}
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
