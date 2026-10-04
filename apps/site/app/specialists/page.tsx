import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const AREAS = ["Гастроэнтерология", "Дерматология", "Нутрициология", "Терапия", "Эндокринология", "Педиатрия"];

export const metadata = { title: "Специалистам" };

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <section className="dark-hero">
          <img className="bg" src="/blog/cover-story.png" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <h1 className="page-title" style={{ color: "white" }}>FOX дополняет приём, а не заменяет его</h1>
            <p className="lead" style={{ color: "rgba(248,249,246,.75)" }}>286 антигенов, IgG1–IgG4, ELISA, IVDR, ISO 13485. Платформа MADx, Вена.</p>
            <Link className="btn btn-light" href="/course">Зарегистрироваться на курс</Link>
          </div>
        </section>
        <section className="wrap band">
          <h2>Где FOX дополняет работу</h2>
          <div className="tags" style={{ marginTop: 16 }}>
            {AREAS.map((area) => <span className="tag" key={area}>{area}</span>)}
          </div>
          <div className="cards-3" style={{ marginTop: 24 }}>
            {[
              ["Отчёт как структура", "Пациент видит зоны, а не список запретов."],
              ["Anti-CCD", "Контроль перекрёстных углеводных структур."],
              ["7–10 дней", "Один забор, без подготовки. Цену называет лаборатория."],
            ].map(([title, text]) => (
              <article className="panel" key={title}><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </section>
        <section className="wrap band">
          <h2>Лаборатории</h2>
          <p className="lead">Направьте пациента в одну из 9 сетей. <Link href="/labs">Смотреть карту</Link></p>
        </section>
      </main>
      <Footer />
    </>
  );
}
