import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ReportFaq, ReportViewer } from "@/components/ReportStage";
import { ReportToc, ShareButton } from "@/components/ReportToc";
import "./frame.css";
import "@/app/adaptive/report.css";

export const metadata = { title: "Отчёт FOX: как читать" };

const TOC = [
  ["zones", "Три зоны реактивности"],
  ["anatomy", "Анатомия отчёта"],
  ["units", "Значения в U/mL"],
  ["ccd", "Anti-CCD-контроль"],
  ["after", "Что делать после результата"],
  ["limits", "Границы метода"],
  ["faq", "Частые вопросы"],
];

const ZONES = [
  {
    tone: "green",
    title: "Зелёная зона",
    level: "Уровень не повышен",
    text: "Продукты обычно сохраняют в рационе, если для исключения нет других медицинских показаний.",
  },
  {
    tone: "yellow",
    title: "Жёлтая зона",
    level: "Уровень повышен",
    text: "Продукты временно исключают. Через несколько недель их постепенно возвращают по одному и наблюдают за реакцией.",
  },
  {
    tone: "red",
    title: "Красная зона",
    level: "Уровень значительно повышен",
    text: "Исключают на первом этапе работы с рационом. Порядок возвращения обсуждают со специалистом позже и осторожнее.",
  },
];

const ACTIONS = [
  ["Зафиксируйте исходную точку", "Симптомы, их частота и привычный рацион — без этого невозможно оценить изменения."],
  ["Обсудите со специалистом", "Продолжительность элиминации и замены определяют с врачом или нутрициологом."],
  ["Не убирайте всё сразу без замен", "Элиминация без полноценных замен — риск дефицитов и срыва режима."],
  ["Ведите дневник", "Реакция отсроченная — без записей её почти невозможно поймать."],
  ["Возвращайте по одному", "Иначе непонятно, какой именно продукт дал реакцию."],
  ["Не ждите диагноза от отчёта", "Отчёт — лабораторный профиль, решение принимает специалист."],
];

const LIMITS = [
  "Нет диагноза",
  "Нет назначения препаратов",
  "Нет универсального меню",
  "Не оценка риска анафилаксии",
  "Не тест на аллергию (IgE)",
  "Не целиакия и не лактазная недостаточность",
];

export default function Page() {
  return (
    <>
      <Header />
      <main className="report-page">
        <section className="rf-hero" data-s="r01">
          <div className="wrap rf-hero-in">
            <p className="crumbs d-only">
              <Link href="/">Главная</Link>
              <span className="sep">/</span>
              <span aria-current="page">Отчёт FOX: как читать</span>
            </p>
            <div className="rf-hero-row">
              <div className="rf-hero-copy">
                <h1>Как читать отчёт FOX</h1>
                <p className="rf-lead d-only">
                  Отчёт — не список запретов, а карта реактивности. Здесь разбираем каждый блок: что значат зоны и значения в U/mL, зачем нужен anti-CCD-контроль и что делать после получения результата.
                </p>
                <p className="rf-lead m-only">Отчёт — не список запретов, а карта реактивности. Разбираем каждый блок — для пациента и специалиста.</p>
                <div className="rf-hero-cta d-only">
                  <a className="btn btn-dark" href="#anatomy">Открыть пример отчёта</a>
                  <a className="text-link" href="/figma/report/front.png">
                    Скачать PDF
                    <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
                  </a>
                </div>
                <div className="rf-stats d-only">
                  <div><strong>286</strong><span>пищевых антигенов в отчёте</span></div>
                  <div><strong>13</strong><span>групп продуктов</span></div>
                  <div><strong>3</strong><span>зоны реактивности</span></div>
                  <div><strong>12</strong><span>страниц в PDF</span></div>
                </div>
              </div>
              <div className="rf-hero-visual">
                <div className="rf-paper">
                  <span className="rf-paper-back" />
                  <img src="/figma/report/front.webp" alt="Первая страница примера отчёта FOX" />
                </div>
                <div className="rf-audiences d-only">
                  <span>Пациентам — до и после теста</span>
                  <span>Специалистам — опора на консультации</span>
                </div>
                <div className="rf-audiences-m m-only" data-contrast>
                  <span><i className="g" />Пациенту</span>
                  <span><i className="y" />Специалисту</span>
                </div>
                <p className="d-only">Отчёт можно открыть вместе с пациентом — страница построена как общая карта для обоих.</p>
              </div>
              <a className="btn btn-dark rf-pdf-m m-only" href="/figma/report/front.png">Скачать пример отчёта</a>
              <div className="rf-stats-m m-only">
                <div><i className="g" /><strong>286</strong><span>антигенов</span></div>
                <div><i className="y" /><strong>3</strong><span>зоны</span></div>
                <div><i className="r" /><strong>U/mL</strong><span>единицы</span></div>
                <div><i className="l" /><strong>7–10</strong><span>дней</span></div>
              </div>
            </div>
          </div>
        </section>

        <div className="rf-body wrap">
          <ReportToc items={TOC as Array<[string, string]>} />
          <div className="rf-col">
            <section id="zones" data-s="zones" className="rf-sec">
              <span className="rf-num">01</span>
              <h2>Три зоны реактивности</h2>
              <div className="rf-zones">
                {ZONES.map((zone) => (
                  <article key={zone.title} className={`rf-zone rf-zone-${zone.tone}`}>
                    <div className="rf-zone-head">
                      <i />
                      <h3>{zone.title}</h3>
                    </div>
                    <span className="rf-level">{zone.level}</span>
                    <p>{zone.text}</p>
                  </article>
                ))}
              </div>
              <p className="rf-note">
                Важно: цвет зоны показывает уровень пищеспецифических IgG, а не питательную ценность или вред продукта. Красная зона — временная, а не пожизненный запрет.
              </p>
            </section>

            <section id="anatomy" data-s="anatomy" className="rf-sec">
              <span className="rf-num">02</span>
              <h2>Анатомия отчёта</h2>
              <p className="rf-anatomy-lead d-only">Кликните на маркер — справа подсветится объяснение блока. Связь работает в две стороны.</p>
              <p className="rf-anatomy-lead m-only">Нажмите на маркер — описание раздела подсветится ниже, под отчётом.</p>
              <ReportViewer />
            </section>

            <section id="units" data-s="units" className="rf-sec">
              <span className="rf-num">03</span>
              <h2>Значения в U/mL</h2>
              <p className="rf-uml-lead">
                Результат по каждому пищевому антигену — полуколичественный: показывает, насколько выражен аналитический сигнал, а не степень тяжести симптомов. Сравнивать значения корректно внутри одного отчёта.
              </p>
              <div className="rf-deck" data-uml>
                <article className="uml-card low">
                  <div className="rf-deck-top"><span className="rf-deck-chip">Зелёная зона</span><span>01 / 03</span></div>
                  <p className="rf-deck-value"><strong>&lt; 7,5</strong><small>U/mL</small></p>
                  <div className="rf-scale"><i /><i /><i /></div>
                  <p>Уровень не повышен — продукт обычно остаётся в рационе</p>
                  <span className="rf-deck-action">Оставить в рационе</span>
                </article>
                <article className="uml-card mid">
                  <div className="rf-deck-top"><span className="rf-deck-chip">Жёлтая зона</span><span>02 / 03</span></div>
                  <p className="rf-deck-value"><strong>7,5–20</strong><small>U/mL</small></p>
                  <div className="rf-scale"><i /><i /><i /></div>
                  <p>Уровень повышен — временное исключение и возврат по одному</p>
                  <span className="rf-deck-action">Исключить на время</span>
                </article>
                <article className="uml-card high">
                  <div className="rf-deck-top"><span className="rf-deck-chip">Красная зона</span><span>03 / 03</span></div>
                  <p className="rf-deck-value"><strong>&gt; 20</strong><small>U/mL</small></p>
                  <div className="rf-scale"><i /><i /><i /></div>
                  <p>Уровень значительно повышен — исключение на первом этапе</p>
                  <span className="rf-deck-action">Исключить на первом этапе</span>
                </article>
                <table className="rf-hidden-table">
                  <caption>Пример границ U/mL</caption>
                  <tbody>
                    <tr><th scope="row">&lt;7.5</th><td>green</td></tr>
                    <tr><th scope="row">7.5–20</th><td>yellow</td></tr>
                    <tr><th scope="row">&gt;20</th><td>red</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="rf-uml-note">Значения в таблице — пример границ для макета. Финальные диапазоны берём из официальной инструкции MADx.</p>
            </section>

            <section id="ccd" data-s="ccd" className="rf-sec">
              <span className="rf-num">04</span>
              <h2>Anti-CCD-контроль</h2>
              <div className="rf-ccd">
                <img src="/figma/course/ccd.jpg" alt="" />
                <div className="rf-ccd-copy">
                  <p>CCD — перекрёстно-реагирующие углеводные структуры, которые встречаются в растительных продуктах. IgG иногда связываются не с уникальным белком продукта, а с общей для нескольких растений углеводной структурой.</p>
                  <p>В тесте предусмотрена отдельная зона, которая помогает распознать связывание с CCD; программа учитывает этот сигнал при обработке результата. Для специалиста это значит: риск переоценить совпадение между растительными продуктами ниже, но клиническая проверка элиминацией и возвращением остаётся обязательной.</p>
                </div>
                <aside>
                  <strong>В отчёте</strong>
                  <p>Контрольные параметры и anti-CCD — в разделе 4, маркер 5 в просмотрщике выше.</p>
                </aside>
              </div>
            </section>

            <section id="after" data-s="after" className="rf-sec rf-after">
              <span className="rf-num">05</span>
              <h2>Что делать после получения результата</h2>
              <div className="rf-actions">
                {ACTIONS.map(([title, text]) => (
                  <article key={title}>
                    <i />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="limits" data-s="limits" className="rf-sec rf-limits">
              <span className="rf-num">06</span>
              <h2>Границы метода</h2>
              <p className="rf-limits-lead">Отчёт показывает уровень пищеспецифических IgG — и только его. Чего в отчёте нет:</p>
              <ul>
                {LIMITS.map((item) => (
                  <li key={item}>
                    <img src="/figma/icons/close.svg" alt="" width={12} height={12} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="rf-limits-note">Результат может меняться со временем: уровень IgG зависит от состава рациона и частоты употребления продуктов, поэтому повторный тест через несколько месяцев может показать новый профиль.</p>
            </section>

            <ReportFaq />

            <section data-s="cta" className="rf-cta d-only">
              <img src="/figma/course/cta-bg.webp" alt="" />
              <div className="rf-cta-shade" />
              <div className="rf-cta-copy">
                <h2>Готовы сдать тест или нужно обсудить отчёт?</h2>
                <p>Выберите лабораторию-партнёра или покажите эту страницу своему врачу или нутрициологу — она собрана и для специалистов.</p>
              </div>
              <div className="rf-cta-actions">
                <Link className="btn btn-light" href="/labs">Где сдать тест</Link>
                <Link className="text-link rf-light-link" href="/specialists">
                  Специалистам
                  <img src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                </Link>
              </div>
            </section>
            <section data-s="cta-m" className="rf-cta-m m-only">
              <i />
              <h2>Готовы сдать тест или нужно обсудить отчёт?</h2>
              <p>Выберите лабораторию-партнёра или покажите эту страницу своему врачу.</p>
              <img src="/figma/course/cta-bg.webp" alt="" />
              <Link className="btn btn-dark" href="/labs">Где сдать тест</Link>
              <ShareButton />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
