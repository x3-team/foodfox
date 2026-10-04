"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const GROUPS = [
  { id: "gut", title: "ЖКТ", items: ["Вздутие после еды", "Тяжесть", "Нерегулярный стул"] },
  { id: "skin", title: "Кожа", items: ["Высыпания", "Зуд", "Сухость"] },
  { id: "weight", title: "Вес и отёчность", items: ["Вес стоит", "Отёки", "Тяга к сладкому"] },
  { id: "well", title: "Общее самочувствие", items: ["Усталость", "Туман в голове", "Сонливость после еды"] },
];

const SCALE_WORDS = "До 20% людей живут с пищевой непереносимостью и не знают об этом".split(" ");
const DECK = [
  ["Узнайте причину, а не симптомы", "Реакция на продукт проявляется через 3–72 часа. Поэтому связь с едой легко потерять."],
  ["Симптомы маскируются под другие состояния", "Усталость, высыпания и тяжесть после еды часто списывают на стресс, возраст или работу."],
  ["Не предрасположенность, а текущее состояние", "В отличие от генетических тестов, FOX показывает IgG сейчас — и этот снимок может измениться."],
];

export function HomePage() {
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const scaleRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const words = scaleRef.current?.querySelectorAll<HTMLElement>("[data-word]");
    const pin = scaleRef.current;
    const onScroll = () => {
      if (pin && words && !reduce) {
        const rect = pin.getBoundingClientRect();
        const total = pin.offsetHeight - window.innerHeight;
        const progress = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total));
        words.forEach((word, index) => {
          const start = index / words.length;
          const local = Math.min(1, Math.max(0, (progress - start) / (1 / words.length)));
          const blur = 12 * (1 - local);
          word.style.filter = `blur(${blur}px)`;
          word.style.opacity = String(0.18 + 0.82 * local);
        });
      }
      if (!reduce && deckRef.current) {
        const cards = [...deckRef.current.querySelectorAll<HTMLElement>(".deck-card")];
        cards.forEach((card, index) => {
          const next = cards[index + 1];
          if (!next) {
            card.style.transform = "";
            card.style.filter = "";
            card.style.opacity = "1";
            return;
          }
          const overlap = card.getBoundingClientRect().bottom - next.getBoundingClientRect().top;
          const amount = Math.min(1, Math.max(0, overlap / 220));
          card.style.transform = `scale(${1 - 0.06 * amount})`;
          card.style.filter = `blur(${3 * amount}px)`;
          card.style.opacity = String(1 - 0.45 * amount);
        });
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
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

        <section className="scale" id="scale" ref={scaleRef} data-scale>
          <div className="scale-pin">
            <h2 className="page-title">
              {SCALE_WORDS.map((word, index) => (
                <span data-word key={`${word}-${index}`}>{word} </span>
              ))}
            </h2>
          </div>
        </section>

        <section className="wrap deck" ref={deckRef} data-deck>
          {DECK.map(([title, text], index) => (
            <article className="deck-card" key={title} style={{ top: 96 + index * 12 }}>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
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
