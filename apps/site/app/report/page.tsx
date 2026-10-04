import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata = { title: "Отчёт FOX: как читать" };

const SECTIONS = [
  ["zones", "Три зоны", "Низкий, средний и повышенный IgG. Цвет подписан названием и уровнем."],
  ["anatomy", "Анатомия отчёта", "Группы продуктов, значения и пометки, которых в отчёте нет: диагноза и запрета навсегда."],
  ["units", "Значения U/mL", "Число стоит рядом с зоной. Решение о рационе принимает специалист."],
  ["ccd", "Anti-CCD", "Контроль помогает не принять шум за сигнал."],
  ["after", "Что делать дальше", "Элиминация повышенной зоны, ротация средней, затем возврат по одному."],
  ["limits", "Границы метода", "Это не тест на аллергию IgE и не замена очного приёма."],
];

export default function Page() {
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">Как читать отчёт FOX</h1>
        <div className="cards-3" style={{ marginTop: 24 }}>
          <article className="zone low"><h3>Низкий</h3><p>Можно оставить в рационе.</p></article>
          <article className="zone mid"><h3>Средний</h3><p>Ротация и наблюдение.</p></article>
          <article className="zone high"><h3>Повышенный</h3><p>Временное исключение, не навсегда.</p></article>
        </div>
        <div className="article-grid" style={{ marginTop: 32 }}>
          <nav className="toc" aria-label="Содержание">
            {SECTIONS.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}
          </nav>
          <div>
            {SECTIONS.map(([id, title, text]) => (
              <section key={id} id={id} style={{ marginBottom: 28 }}>
                <h2>{title}</h2>
                <p>{text}</p>
              </section>
            ))}
          </div>
          <aside className="aside-card">
            <img className="bokeh" src="/blog/footer-bokeh.png" alt="" />
            <div className="shade" />
            <h2>Пример отчёта</h2>
            <p>Страницы молочной группы и три зоны.</p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
