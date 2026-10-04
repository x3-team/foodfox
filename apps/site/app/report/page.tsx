import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ReportStage } from "@/components/ReportStage";
import { ReportToc } from "@/components/ReportToc";

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

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <section className="dark-hero" data-s="r01" style={{ minHeight: 560 }}>
          <img className="bg" src="/report/page-zones.svg" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <p className="crumbs">Главная / Отчёт FOX: как читать</p>
            <h1 className="page-title" style={{ color: "white" }}>Как читать отчёт FOX</h1>
            <p className="lead" style={{ color: "rgba(248,249,246,.8)" }}>Отчёт — не список запретов, а карта реактивности. Зоны, значения в U/mL, anti-CCD и то, что делать после результата.</p>
          </div>
        </section>
        <div className="wrap article-grid">
          <ReportToc items={TOC as Array<[string, string]>} />
          <div>
            <section id="zones">
              <h2>Три зоны реактивности</h2>
              <div className="stack">
                <article className="zone low"><h3>Зелёная зона</h3><p>Уровень не повышен. Продукты обычно сохраняют в рационе, если нет других показаний.</p></article>
                <article className="zone mid"><h3>Жёлтая зона</h3><p>Уровень повышен. Временно исключают и возвращают по одному.</p></article>
                <article className="zone high"><h3>Красная зона</h3><p>Уровень значительно повышен. Исключают на первом этапе. Это временная зона, не пожизненный запрет.</p></article>
              </div>
            </section>
            <section id="anatomy">
              <h2>Анатомия отчёта</h2>
              <p>Маркеры 1–5: шапка, сводка зон, таблица семейства, отдельные белки, контрольные параметры.</p>
              <ol>
                <li>Шапка отчёта</li>
                <li>Сводка по зонам</li>
                <li>Таблица семейства</li>
                <li>Отдельные белки</li>
                <li>Контрольные параметры</li>
              </ol>
              <ReportStage />
            </section>
            <section id="units">
              <h2>Значения в U/mL</h2>
              <p>Полуколичественный сигнал, а не степень тяжести симптомов. Сравнивать числа корректно внутри одного отчёта. До 7,5 — зелёная, 7,5–20 — жёлтая, выше 20 — красная.</p>
            </section>
            <section id="ccd">
              <h2>Anti-CCD-контроль</h2>
              <p>CCD — перекрёстно-реагирующие углеводные структуры. Отдельный канал помогает не принять шум за сигнал и не отменяет проверку элиминацией.</p>
            </section>
            <section id="after">
              <h2>Что делать дальше</h2>
              <div className="cards-2">
                {["Зафиксировать симптомы", "Выбрать замены", "Убрать повышенную зону на время", "Ротировать среднюю", "Возвращать по одному", "Назначить повторную оценку"].map((title) => (
                  <article className="panel" key={title}><h3>{title}</h3></article>
                ))}
              </div>
            </section>
            <section id="limits">
              <h2>Границы метода</h2>
              <p>Это не тест на аллергию IgE, не диагноз и не замена очного приёма. Нет назначения препаратов и универсального меню.</p>
            </section>
            <section id="faq">
              <h2>Частые вопросы</h2>
              <p>Цвет зоны показывает уровень IgG, а не вред продукта. Красная зона временная.</p>
            </section>
          </div>
          <aside className="aside-card report-aside">
            <h2>Пример отчёта</h2>
            <p>Страницы молочной группы, злаков и сводка трёх зон. Значения читаются на тёмной карточке.</p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
