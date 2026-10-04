"use client";

import Link from "next/link";
import { useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ReportStage } from "@/components/ReportStage";

const AREAS = [
  ["Гастроэнтерология", "СРК и функциональные жалобы ЖКТ", "Пациенты со вздутием, дискомфортом после еды, болью или нестабильным стулом. FOX рассматривают после базового обследования, когда самостоятельные ограничения не собрали устойчивый рацион.", "гастро"],
  ["Дерматология и косметология", "Кожа и рацион", "Высыпания, зуд и атопические проявления. Отчёт сужает разговор о возможных пищевых триггерах и не заменяет очный приём.", "дерма"],
  ["Нутрициология", "Структура рациона", "Список из 286 позиций становится тремя зонами и порядком возврата, а не запретом полки целиком.", "нутри"],
  ["Терапия и общая практика", "С чего начать разговор", "Усталость, тяжесть и отёчность, которые человек уже списывает на возраст. FOX даёт точку отсчёта для направления.", "тера"],
  ["Аутоиммунные заболевания", "Часть комплексной работы", "Тест не ставит диагноз. Его обсуждают как часть работы с питанием, если это уместно клинически.", "ауто"],
  ["Неврология", "Головные боли и режим", "Когда специалист предполагает связь самочувствия с рационом, отчёт помогает отделить гипотезы от догадок дневника.", "невро"],
];

const ARGS = [
  ["01 / Покрытие", "286 пищевых антигенов", "Один забор вместо нескольких отдельных исследований."],
  ["02 / Тип результата", "Значения в U/mL", "Уровни реактивности помогают расставить приоритеты. Клинический эффект смотрят по дневнику."],
  ["03 / Контроль сигнала", "Anti-CCD-контроль", "Отдельный канал снижает риск переоценить совпадение растительных продуктов."],
  ["04 / Платформа", "Система MADx", "Автоматизированные этапы и сопоставимость результатов во времени."],
  ["05 / Формат отчёта", "Семейства и зоны", "Специалист видит зоны, числа и контроль, а не сплошной список запретов."],
];

const ROUTE = [
  ["Назначение и забор", "Вы направляете пациента. До теста не нужно исключать привычные продукты."],
  ["Анализ IgG", "286 антигенов за один запуск. На лабораторном этапе участие специалиста не требуется."],
  ["Контроль и отчёт", "Система учитывает anti-CCD и группирует семейства."],
  ["Интерпретация", "Вы строите тактику, объясняете результат и назначаете точку повторной оценки."],
];

const PROTOCOL = [
  ["Подготовка", "до старта", "Зафиксируйте симптомы и выберите полноценные замены."],
  ["Элиминация", "~6 недель", "Красную и жёлтую зоны временно исключают. Срок определяет специалист."],
  ["Контроль", "всю элиминацию", "Дневник питания и заранее выбранные показатели."],
  ["Возвращение", "с 7 недели", "Жёлтая зона — по одному. Красная — позже и осторожнее."],
  ["Итоговый рацион", "далее", "То, что не воспроизводит симптомы, возвращают. Триггеры ограничивают индивидуально."],
];

export function SpecialistsView() {
  const [area, setArea] = useState(0);
  const current = AREAS[area];
  return (
    <>
      <Header />
      <main>
        <section className="dark-hero" data-s="p01">
          <img className="bg" src="/blog/cover-lab.png" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <p className="meta-line">Для врачей и нутрициологов · Платформа MADx · Австрия</p>
            <h1 className="page-title" style={{ color: "white" }}>Пищеспецифические IgG к 286 антигенам — в одном подробном отчёте</h1>
            <p className="lead" style={{ color: "rgba(248,249,246,.78)" }}>
              FOX исследует иммунную реактивность к 286 продуктам. Один образец крови даёт основу для персональной тактики питания и не заменяет приём.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link className="btn btn-light" href="/report">Скачать пример отчёта</Link>
              <Link className="btn btn-ghost" href="/labs" style={{ color: "white", borderColor: "rgba(248,249,246,.35)" }}>Найти лабораторию-партнёра</Link>
            </div>
          </div>
        </section>

        <section className="wrap band" data-s="p02">
          <h2 className="page-title">Где FOX дополняет работу специалиста</h2>
          <p className="lead">Выберите специализацию — покажем сценарий и то, что даёт отчёт в практике.</p>
          <div className="chips" data-allow-x style={{ marginTop: 16 }}>
            {AREAS.map((item, index) => (
              <button key={item[0]} className={`chip${area === index ? " is-active" : ""}`} type="button" onClick={() => setArea(index)}>{item[0]}</button>
            ))}
          </div>
          <div className="area-panel" key={current[3]}>
            <h3>{current[1]}</h3>
            <p>{current[2]}</p>
            <p><Link href="/report">Опорный протокол</Link> · <Link href="/course">Урок курса</Link> · <Link href="/blog">Кейсы в блоге</Link></p>
          </div>
        </section>

        <section className="wrap band" data-s="p03">
          <h2 className="page-title">Почему специалисты выбирают FOX</h2>
          <div className="stack" style={{ marginTop: 20 }}>
            {ARGS.map(([k, title, text]) => (
              <article className="panel" key={k}><p className="meta-line">{k}</p><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </section>

        <section className="wrap band" data-s="p04">
          <h2 className="page-title">От назначения до готового отчёта — обычно 7–10 дней</h2>
          <p className="lead">Точный срок устанавливает лаборатория.</p>
          <ol className="route">
            {ROUTE.map(([title, text], index) => (
              <li key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>
            ))}
          </ol>
        </section>

        <section className="wrap band" data-s="p05">
          <h2 className="page-title">Опорный протокол работы с рационом</h2>
          <p className="lead">Сроки определяет специалист. Элиминация только с полноценными заменами.</p>
          <a className="btn btn-dark" href="/report">Скачать протокол PDF</a>
          <div className="stack" style={{ marginTop: 20 }}>
            {PROTOCOL.map(([title, when, text]) => (
              <article className="panel" key={title}><p className="meta-line">{when}</p><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </section>

        <section className="wrap band" data-s="p06">
          <h2 className="page-title">Анатомия отчёта · 4 раздела</h2>
          <p className="lead">Листайте страницы: отчёт переворачивается, зоны подсвечиваются.</p>
          <ReportStage />
          <p>Чего в отчёте нет: диагноза, назначения препаратов, универсального меню и оценки риска анафилаксии.</p>
        </section>

        <section className="wrap band" data-s="p07">
          <h2 className="page-title">Наши эксперты</h2>
          <div className="cards-3" style={{ marginTop: 20 }}>
            {[
              ["Алёна Вавилова", "Клинический нутрициолог, health-coach", "/blog/author-alyona.png"],
              ["Ксения Эллинская", "К. м. н., врач-дерматовенеролог, нутрициолог", "/blog/author-ksenia.png"],
              ["Дмитрий Эллинский", "Врач-дерматовенеролог, трихолог, нутрициолог", "/blog/author-dmitry.png"],
            ].map(([name, role, src]) => (
              <article className="panel" key={name}><img src={src} alt="" style={{ height: 220, width: "100%", objectFit: "cover", borderRadius: 16 }} /><h3>{name}</h3><p>{role}</p></article>
            ))}
          </div>
        </section>

        <section className="wrap band" data-s="p08">
          <h2 className="page-title">Лаборатории-партнёры</h2>
          <div className="lab-grid">
            {["Ситилаб", "Гемотест", "KDL", "ДНКОМ", "Инвитро", "CMD", "Хеликс", "Гемотест", "Инвитро"].map((name, index) => (
              <a className="lab-tile" key={`${name}-${index}`} href="/labs">Направить пациента · {name}</a>
            ))}
          </div>
          <Link className="btn btn-ghost" href="/contacts">Стать лабораторией-партнёром</Link>
        </section>

        <section className="wrap band" data-s="p09">
          <h2 className="page-title">Научитесь работать с FOX Food Xplorer бесплатно</h2>
          <p className="lead">6 модулей, около 90 минут, сертификат, бессрочный доступ.</p>
          <Link className="btn btn-dark" href="/course">Зарегистрироваться на курс</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
