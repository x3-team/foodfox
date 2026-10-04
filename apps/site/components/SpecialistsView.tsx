"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const AREAS = [
  {
    slug: "gastro",
    tab: "Гастроэнтерология",
    kicker: "Гастроэнтерология",
    title: "СРК и функциональные жалобы ЖКТ",
    text: "Пациенты со вздутием, постпрандиальным дискомфортом, болью, запором или нестабильным стулом. FOX можно рассматривать после базового обследования, когда стандартные рекомендации и самостоятельные ограничения не помогли выстроить устойчивый рацион.",
    gives: "Профиль пищеспецифических IgG к 286 антигенам помогает сформировать список диетических гипотез и перейти от хаотичных ограничений к структурированной элиминации с последующим возвращением продуктов.",
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
  ["/report", "Опорный протокол ведения PDF"],
  ["/course", "Урок 5 курса: FOX в разных специализациях"],
  ["/blog", "Клинические кейсы в блоге"],
  ["/report#ccd", "Anti-CCD-контроль: разбор"],
];

const ARGS = [
  {
    k: "01 / Покрытие",
    title: "286 пищевых антигенов",
    head: "Мультиплексный microarray-формат",
    text: "На небольшой тестовой поверхности размещены сотни пищевых антигенов. Лаборатория исследует весь профиль за один запуск и использует небольшой объём образца.",
    practice: "Не нужно назначать несколько отдельных исследований под разные пищевые гипотезы. Один забор крови даёт подробный аналитический профиль по 286 позициям.",
    graphic: "/figma/specialists/arg-1.svg",
  },
  {
    k: "02 / Тип результата",
    title: "Полуколичественные значения",
    head: "Значения в U/mL и уровни реактивности",
    text: "Результат по каждому пищевому антигену представлен в U/mL и распределён по уровням реактивности. Это помогает расставить приоритеты при планировании диетического вмешательства.",
    practice: "При повторном тестировании через несколько месяцев можно сопоставить аналитические профили. Клинический эффект оценивают отдельно — по дневнику и динамике жалоб.",
    graphic: "/figma/specialists/arg-2.svg",
  },
  {
    k: "03 / Контроль сигнала",
    title: "Anti-CCD-контроль",
    head: "Отдельный контрольный канал",
    text: "CCD — перекрёстно-реагирующие углеводные структуры растительных продуктов. В тесте предусмотрена отдельная зона, которая помогает распознать связывание с CCD.",
    practice: "Anti-CCD-контроль снижает риск переоценить аналитическое совпадение между растительными продуктами. Он не отменяет клиническую проверку продукта элиминацией и возвращением.",
    graphic: "/figma/specialists/arg-3.svg",
  },
  {
    k: "04 / Лабораторная платформа",
    title: "Автоматизированная система MADx",
    head: "Контроль этапов анализа",
    text: "FOX выполняют на лабораторной платформе MacroArray Diagnostics. Оборудование контролирует основные этапы, а программная система обрабатывает сигнал и формирует отчёт.",
    practice: "Стандартизированный процесс снижает влияние ручных операций и позволяет сопоставлять результаты, полученные в разные временные точки.",
    graphic: "/figma/specialists/arg-4.svg",
  },
  {
    k: "05 / Формат отчёта",
    title: "Структурированный результат",
    head: "Группировка по семействам и зонам",
    text: "Данные сгруппированы по продуктовым семействам и уровням реактивности. Специалист видит зоны, количественные показатели и результаты контрольных параметров.",
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
  ["Подготовка", "до старта", "До начала элиминации зафиксируйте исходные симптомы, частоту их появления и привычный рацион. Выберите нутритивно полноценные замены для каждого исключаемого продукта."],
  ["Элиминация", "~6 недель", "Продукты из красной и жёлтой зон временно исключают из рациона. Срок можно изменить с учётом состояния пациента, выраженности реакций и риска дефицитов."],
  ["Контроль", "всю элиминацию", "Пациент ведёт дневник питания и симптомов. Заранее определите показатели: боль, вздутие, частота стула, головные боли, состояние кожи или уровень энергии."],
  ["Возвращение продуктов", "с 7 недели", "Жёлтая зона — по одному с интервалом, достаточным для оценки отсроченной реакции. Красная — позже и осторожнее; последовательность зависит от уровня IgG, клиники и пищевой ценности продукта."],
  ["Итоговый рацион", "далее", "Продукты, после возвращения которых симптомы не воспроизводятся, возвращают в меню. Подтверждённые триггеры ограничивают индивидуально, сохраняя рацион максимально разнообразным."],
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
    src: "/figma/specialists/alyona.png",
    facts: ["7+ лет в нутрициологии", "Основатель сообщества нутрициологов Москвы", "Член Международной ассоциации нутрициологов и коучей"],
  },
  {
    name: "Ксения Эллинская",
    role: "К. м. н., врач-дерматовенеролог, косметолог, нутрициолог",
    src: "/figma/specialists/ksenia.png",
    facts: ["21 год клинической практики", "Автор профессионального блога с аудиторией 85 000+ подписчиков", "Эксперт по связи питания и состояния кожи"],
  },
  {
    name: "Дмитрий Эллинский",
    role: "Врач-дерматовенеролог, трихолог, нутрициолог",
    src: "/figma/specialists/dmitry.png",
    facts: ["15 лет клинической практики", "Главный дерматолог холдинга «СМ-Клиника»", "Наставник более 100 врачей-дерматологов"],
  },
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

const LECTURERS = [
  ["Светлана Каневская", "Д. м. н., профессор, гастроэнтеролог-нутрициолог · уроки 1, 2, 6", "/figma/specialists/svetlana.png"],
  ["Алёна Вавилова", "Клинический нутрициолог · урок 3", "/figma/specialists/alyona.png"],
  ["Ксения Эллинская", "К. м. н., дерматовенеролог · урок 4", "/figma/specialists/ksenia.png"],
  ["Дмитрий Эллинский", "Дерматовенеролог, трихолог · урок 5", "/figma/specialists/dmitry.png"],
];

const HERO_TILES = [
  ["286 пищевых антигенов", "Широкая панель привычных продуктов, отдельных белков, специй, суперфудов и компонентов популярных добавок."],
  ["Общий IgG1–IgG4", "Суммарный уровень четырёх подклассов пищеспецифического IgG — единый профиль реактивности."],
  ["Мультиплексный непрямой ELISA", "Сотни антигенов за один анализ. Связывание IgG с антигеном преобразуется в измеримый сигнал."],
  ["IVDR", "Соответствие требованиям ЕС к медизделиям для лабораторной диагностики: безопасность, производство, контроль качества."],
  ["EN ISO 13485", "Международный стандарт менеджмента качества для медицинских изделий: разработка, производство, контроль систем."],
  ["Платформа MADx · Австрия", "FOX разработала австрийская компания MacroArray Diagnostics. Единая платформа автоматизирует обработку и стандартизирует анализ."],
];

export function SpecialistsView() {
  const [area, setArea] = useState(0);
  const [report, setReport] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = AREAS[area];

  useEffect(() => {
    const apply = () => {
      const slug = new URLSearchParams(window.location.search).get("area");
      const index = AREAS.findIndex((item) => item.slug === slug);
      if (index >= 0) setArea(index);
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  function pickArea(index: number) {
    const el = panelRef.current;
    const prev = el?.getBoundingClientRect().height ?? 0;
    setArea(index);
    const url = new URL(window.location.href);
    url.searchParams.set("area", AREAS[index].slug);
    window.history.replaceState(null, "", url);
    requestAnimationFrame(() => {
      if (!el) return;
      const next = el.scrollHeight;
      el.style.height = `${prev}px`;
      requestAnimationFrame(() => {
        el.style.height = `${next}px`;
      });
    });
  }

  const [turning, setTurning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  function pickReport(index: number) {
    if (index < 0 || index >= REPORT.length || index === report) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReport(index);
      return;
    }
    setTurning(true);
    window.setTimeout(() => {
      setReport(index);
      setTurning(false);
    }, 340);
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let paused = false;
    const node = stageRef.current;
    const enter = () => { paused = true; };
    const leave = () => { paused = false; };
    node?.addEventListener("mouseenter", enter);
    node?.addEventListener("mouseleave", leave);
    const timer = window.setInterval(() => {
      if (paused) return;
      setReport((current) => (current + 1) % REPORT.length);
    }, 6000);
    return () => {
      window.clearInterval(timer);
      node?.removeEventListener("mouseenter", enter);
      node?.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <>
      <Header />
      <main>
        <section className="dark-hero" data-s="p01">
          <img className="bg" src="/figma/specialists/hero.jpeg" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <div className="sp-hero-copy">
              <div className="sp-pills">
                <span>Для врачей и нутрициологов</span>
                <span>Платформа MADx · Австрия</span>
              </div>
              <h1>Пищеспецифические IgG к 286 антигенам — в одном подробном отчёте</h1>
              <p className="sp-lead-inv">
                FOX Food Xplorer исследует иммунную реактивность к 286 продуктам и пищевым компонентам. Один образец крови позволяет одновременно оценить широкую панель и получить основу для персональной тактики питания.
              </p>
              <p className="sp-body-inv">
                FOX можно использовать в комплексной работе с пациентами с функциональными жалобами ЖКТ, кожными проявлениями, головными болями и другими состояниями, при которых специалист предполагает связь самочувствия с рационом.
              </p>
              <div className="sp-cta">
                <Link className="btn btn-light" href="/report">Скачать пример отчёта</Link>
                <Link className="sp-arrow sp-arrow-light" href="/labs">
                  Найти лабораторию-партнёра
                  <img src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                </Link>
              </div>
            </div>
            <div className="sp-specs">
              {[0, 1].map((row) => (
                <div className="sp-spec-row" key={row}>
                  {HERO_TILES.slice(row * 3, row * 3 + 3).map(([title, text]) => (
                    <article className="sp-tile" key={title}>
                      <span className="sp-bar" />
                      <h2>{title}</h2>
                      <p>{text}</p>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sp-sec" data-s="p02">
          <div className="wrap sp-stack-48">
            <div className="sp-head">
              <h2 className="sp-h2">Где FOX дополняет работу специалиста</h2>
              <p className="sp-lead">Выберите свою специализацию — покажем клинические сценарии и то, что даёт отчёт именно в вашей практике.</p>
            </div>
            <div className="sp-tabs" role="tablist" aria-label="Специализации">
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
            <div className="area-panel sp-panel" ref={panelRef} role="tabpanel">
              <div className="sp-panel-copy">
                <p className="sp-kicker">{current.kicker}</p>
                <h3>{current.title}</h3>
                <p className="sp-lead sp-lead-ink">{current.text}</p>
                {current.gives ? (
                  <div className="sp-gives">
                    <p className="sp-kicker">Что даёт FOX</p>
                    <p>{current.gives}</p>
                  </div>
                ) : null}
              </div>
              <div className="sp-related">
                <img src="/figma/specialists/scenario.jpg" alt="" />
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

        <section className="sp-sec sp-white" data-s="p03">
          <div className="wrap sp-stack-40">
            <h2 className="sp-h2 sp-narrow">Почему специалисты выбирают FOX</h2>
            <div className="sp-args" data-allow-x>
              {ARGS.map((item) => (
                <article className="sp-arg" key={item.k}>
                  <div className="sp-arg-visual">
                    <img className="sp-arg-bg" src="/figma/specialists/arg-bg.png" alt="" />
                    <img className="sp-arg-graphic" src={item.graphic} alt="" />
                  </div>
                  <div>
                    <p className="sp-note">{item.k}</p>
                    <h3>{item.title}</h3>
                  </div>
                  <div>
                    <p className="sp-kicker">{item.head}</p>
                    <p>{item.text}</p>
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

        <section className="sp-sec sp-dark" data-s="p04">
          <div className="wrap sp-stack-48">
            <div className="sp-head sp-head-tight">
              <h2 className="sp-h2">От назначения до готового отчёта — обычно 7–10 дней</h2>
              <p className="sp-lead-inv">Точный срок устанавливает лаборатория, которая проводит исследование.</p>
            </div>
            <div className="sp-timeline">
              <svg className="sp-route-line" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden>
                <line x1="0" y1="1" x2="100" y2="1" pathLength="1" />
              </svg>
              <div className="sp-steps" data-allow-x>
                {ROUTE.map((step, index) => (
                  <article className="sp-step" key={step.title}>
                    <div className="sp-step-top">
                      <span>{index + 1}</span>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                    <div className="sp-step-you">
                      <p>{step.role}</p>
                      <p>{step.you}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="sp-sec" data-s="p05">
          <div className="wrap sp-stack-40">
            <div className="sp-proto-head">
              <div className="sp-head sp-head-tight">
                <h2 className="sp-h2">Опорный протокол работы с рационом</h2>
                <p className="sp-lead">Схема носит опорный характер. Сроки и последовательность специалист определяет индивидуально — с учётом состояния пациента, выраженности реакций и риска дефицитов.</p>
              </div>
              <Link className="btn btn-dark" href="/report">Скачать протокол PDF</Link>
            </div>
            <div className="sp-table">
              {PROTOCOL.map(([title, when, text], index) => (
                <article className={index % 2 === 0 ? "is-odd" : ""} key={title}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                  <b>{when}</b>
                </article>
              ))}
            </div>
            <p className="sp-compliance">
              Важно: элиминацию проводят только с полноценными заменами — иначе растёт риск дефицита питательных веществ. Уровень IgG не говорит о вреде продукта и не означает пожизненного запрета.
            </p>
          </div>
        </section>

        <section className="sp-sec sp-report" data-s="p06">
          <div className="wrap sp-stack-72">
            <div className="sp-anatomy">
              <div className="sp-anatomy-copy">
                <p className="sp-eyebrow"><i />Анатомия отчёта · 4 раздела</p>
                <h2>Отчёт FOX — структурированная основа для консультации</h2>
                <p className="sp-lead-inv">Один отчёт — четыре уровня чтения. Листайте разделы: страница переворачивается, а на отчёте подсвечивается нужная зона.</p>
                <div className="sp-report-tabs">
                  {REPORT.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      className={report === index ? "is-active" : ""}
                      onClick={() => pickReport(index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <strong>{item.title}</strong>
                        {report === index && item.text ? <em>{item.text}</em> : null}
                        {report === index ? <i /> : null}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="sp-cta">
                  <Link className="btn btn-light" href="/report">Скачать пример отчёта</Link>
                  <Link className="sp-arrow sp-arrow-light" href="/report">
                    Как читать отчёт
                    <img src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                  </Link>
                </div>
              </div>
              <div className="sp-stage" ref={stageRef}>
                <div className="sp-sheet is-back-2" aria-hidden>
                  <img src="/figma/report/front.png" alt="" />
                </div>
                <div className="sp-sheet is-back-1" aria-hidden>
                  <img src="/figma/report/front.png" alt="" />
                </div>
                <div className={`sp-sheet is-front is-zone-${report + 1}${turning ? " is-turning" : ""}`}>
                  <img src="/figma/report/front.png" alt="" />
                  <span className="sp-highlight" />
                  <b>{String(report + 1).padStart(2, "0")}</b>
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
            <div className="sp-absent">
              <h3>Чего в отчёте нет — и почему</h3>
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

        <section className="sp-sec" data-s="p07">
          <div className="wrap sp-stack-48">
            <h2 className="sp-h2 sp-narrow">Наши эксперты</h2>
            <div className="sp-experts" data-allow-x>
              {EXPERTS.map((person) => (
                <article key={person.name}>
                  <div className="sp-portrait">
                    <img src={person.src} alt={person.name} />
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
          </div>
        </section>

        <section className="sp-sec sp-grey" data-s="p08">
          <div className="wrap sp-stack-40">
            <div className="sp-head sp-head-tight">
              <h2 className="sp-h2">Лаборатории-партнёры</h2>
              <p className="sp-lead">Выберите лабораторию-партнёр FOX и уточните актуальные условия, стоимость и срок выполнения исследования.</p>
            </div>
            <div className="sp-labs">
              {LABS.map(([name, src]) => (
                <Link key={name} href="/labs">
                  <img src={src} alt={name} />
                  <span>
                    Направить пациента
                    <img src="/icons/arrow-up-right.svg" alt="" width={16} height={16} />
                  </span>
                </Link>
              ))}
            </div>
            <div className="sp-partner">
              <div>
                <h3>Стать лабораторией-партнёром</h3>
                <p>Отдельный вход для сетей и клиник: условия подключения, обучение персонала и материалы для пациентов.</p>
              </div>
              <Link href="/contacts">Оставить заявку</Link>
            </div>
          </div>
        </section>

        <section className="sp-sec sp-white" data-s="p09">
          <div className="wrap">
            <div className="sp-course">
              <div className="sp-course-copy">
                <span className="sp-bar sp-bar-lg" />
                <h2 className="sp-h2">Научитесь работать с FOX Food Xplorer бесплатно</h2>
                <p className="sp-lead">Авторский курс для врачей, нутрициологов и других профильных специалистов: от механизмов пищевых реакций до интерпретации отчёта и построения элиминационно-ротационной тактики.</p>
                <div className="sp-facts">
                  <span>6 модулей</span>
                  <span>≈ 90 минут</span>
                  <span>Сертификат</span>
                  <span>Бессрочный доступ</span>
                </div>
                <div className="sp-cta">
                  <Link className="btn btn-dark" href="/course">Зарегистрироваться на курс</Link>
                  <Link className="sp-arrow" href="/course#program">
                    Программа курса
                    <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
                  </Link>
                </div>
              </div>
              <aside className="sp-lectors">
                <p>Лекторы</p>
                {LECTURERS.map(([name, role, src]) => (
                  <div key={name}>
                    <img src={src} alt="" />
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
