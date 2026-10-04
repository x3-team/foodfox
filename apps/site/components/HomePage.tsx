"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const GROUPS = [
  { id: "gut", title: "ЖКТ", items: ["Вздутие после еды", "Тяжесть", "Нерегулярный стул"] },
  { id: "skin", title: "Кожа", items: ["Высыпания", "Зуд", "Сухость"] },
  { id: "weight", title: "Вес и отёчность", items: ["Вес стоит", "Отёки", "Тяга к сладкому"] },
  { id: "well", title: "Общее самочувствие", items: ["Усталость", "Туман в голове", "Сонливость после еды"] },
];

export function HomePage() {
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const products = ["Казеин", "Коровье молоко", "Гречка", "Пшеница", "Глютен", "Рис", "Соя", "Яйцо"];
  const shown = useMemo(
    () => products.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  );

  function toggle(label: string) {
    setChecked((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]));
  }

  return (
    <>
      <Header />
      <main>
        <section className="dark-hero">
          <img className="bg" src="/blog/cover-lactose.png" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <h1 className="page-title" style={{ color: "white", maxWidth: "14ch" }}>
              Узнайте, какие продукты не подходят именно вам
            </h1>
            <p className="lead" style={{ color: "rgba(248,249,246,.75)" }}>
              Персональный тест питания против болей в животе, вздутия, акне и других симптомов.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <Link className="btn btn-light" href="/labs#zapis">Записаться на тест</Link>
              <Link className="btn btn-ghost" href="/report" style={{ color: "white", borderColor: "rgba(248,249,246,.35)" }}>Пример отчёта</Link>
            </div>
            <div className="facts">
              <div><strong>1 сеанс</strong><span>сдачи крови</span></div>
              <div><strong>286</strong><span>продуктов</span></div>
              <div><strong>7–10</strong><span>дней до результата</span></div>
            </div>
          </div>
        </section>

        <section className="wrap band" aria-label="Лаборатории">
          <p className="meta-line">Тест доступен в лабораториях</p>
          <div className="marquee">
            {["Ситилаб", "Гемотест", "KDL", "ДНКОМ", "Инвитро", "CMD", "Хеликс"].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </section>

        <section className="wrap band" id="scale">
          <h2 className="page-title">До 20% людей живут с пищевой непереносимостью и не знают об этом</h2>
        </section>

        <section className="wrap band" id="checker">
          <h2 className="page-title">Отметьте, что беспокоит вас последние 4 недели</h2>
          <p className="lead">Не диагноз. Список, с которым удобно прийти к специалисту.</p>
          <div className="cards-2" style={{ marginTop: 24 }}>
            {GROUPS.map((group) => (
              <div className="panel" key={group.id}>
                <h3>{group.title}</h3>
                {group.items.map((item) => (
                  <label className="check-row" key={item}>
                    <input type="checkbox" checked={checked.includes(item)} onChange={() => toggle(item)} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="panel" style={{ marginTop: 16, background: "#1c2414", color: "white" }}>
            <h3 style={{ color: "white" }}>{checked.length ? `Отмечено ${checked.length}` : "Пока ничего не отмечено"}</h3>
            <p style={{ color: "rgba(248,249,246,.75)" }}>
              {checked.length
                ? "С этим списком удобно начать разговор со специалистом. Тест не ставит диагноз."
                : "Отметьте жалобы — здесь появится короткий итог для визита."}
            </p>
            <Link className="btn btn-light" href="/labs" style={{ marginTop: 16 }}>Где сдать тест</Link>
          </div>
        </section>

        <section className="wrap band" id="products">
          <h2 className="page-title">Продукты, которые исследует FOX</h2>
          <label className="search" style={{ marginTop: 20, width: "min(420px, 100%)" }}>
            <img src="/icons/search.svg" alt="" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, гречка" aria-label="Поиск продукта" />
          </label>
          <div className="tags" style={{ marginTop: 16 }}>
            {shown.map((item) => (
              <span className="tag" key={item}>{item}</span>
            ))}
            {shown.length === 0 && <p>В панели нет такого запроса. Спросите специалиста.</p>}
          </div>
        </section>

        <section className="wrap band">
          <div className="cards-3">
            <Link className="panel" href="/report"><h3>Как читать отчёт</h3><p>Три зоны IgG и что делать после результата.</p></Link>
            <Link className="panel" href="/labs"><h3>Где сдать</h3><p>9 сетей, цена устанавливает лаборатория.</p></Link>
            <Link className="panel" href="/blog"><h3>Блог</h3><p>Статьи врачей и нутрициологов.</p></Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
