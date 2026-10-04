"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header, PARTNER_LOGIN } from "@/components/Header";
import { LabsMap, type Branch } from "@/components/LabsMap";

const FAQ: Array<[string, string, string]> = [
  ["О тесте и методе", "Можно ли доверять FOX, если IgG-тесты критикуют?", "Споры возникают, когда пищеспецифические IgG используют как окончательный диагноз или готовый список запрещённой еды. FOX измеряет IgG к 286 антигенам и собирает их в отчёт для плана временной элиминации."],
  ["О тесте и методе", "Чем пищевая непереносимость отличается от аллергии?", "Аллергия — быстрая реакция IgE. FOX смотрит IgG, реакции могут быть отложенными. Тест не диагностирует аллергию."],
  ["О тесте и методе", "Почему сложно самостоятельно определить триггеры?", "Отсроченная реакция проявляется через 3–72 часа, поэтому дневник без опоры быстро становится догадкой."],
  ["Как читать результат", "Может ли результат измениться со временем?", "FOX показывает текущее состояние IgG, а не предрасположенность. Повторный отчёт может отличаться."],
  ["Как читать результат", "Какие продукты входят в панель?", "286 пищевых антигенов из 13 групп: от молочных белков до специй и компонентов добавок."],
  ["Как читать результат", "Что такое anti-CCD-контроль?", "Отдельный канал на перекрёстные углеводные структуры. Он снижает риск принять шум за сигнал."],
  ["После теста и рацион", "Нужно ли голодать перед забором крови?", "Нет. Специальной подготовки и диеты накануне не требуется."],
  ["После теста и рацион", "Подходит ли тест детям?", "Решение принимает специалист, который ведёт ребёнка. Тест не заменяет педиатра."],
  ["После теста и рацион", "Можно ли сдавать тест на фоне приёма лекарств?", "Это вопрос к врачу перед записью. Сайт не даёт индивидуальных назначений."],
  ["Оплата и лаборатории", "Сколько стоит тест FOX?", "Цену устанавливает лаборатория. На сайте её нет."],
  ["Скепсис и критика IgG", "Насколько надёжен тест FOX?", "В основе ELISA и европейская маркировка IVDR. Результат интерпретирует специалист."],
  ["Скепсис и критика IgG", "Можно ли доверять IgG-тестам?", "Споры возникают, когда IgG выдают за диагноз. FOX — карта для разговора о рационе, не запрет навсегда."],
  ["Для специалистов", "Мне уже делали тесты на аллергию. Нужен ли FOX?", "Это разные вопросы. Если симптомы остались, специалист может предложить FOX как отдельный инструмент."],
  ["Для специалистов", "Сколько ждать результат?", "7–10 дней. Сам анализ занимает около трёх часов."],
];

export function FaqPage() {
  const [open, setOpen] = useState(0);
  const [q, setQ] = useState("");
  const [section, setSection] = useState("Все");
  const sections = ["Все", ...new Set(FAQ.map((item) => item[0]))];
  const items = FAQ.filter((item) => (section === "Все" || item[0] === section) && item.join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <Header />
      <main>
        <section className="dark-hero" style={{ minHeight: 420 }}>
          <img className="bg" src="/blog/cover-symptoms.jpg" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <h1 className="page-title" style={{ color: "white" }}>Вопросы и ответы</h1>
            <p className="lead" style={{ color: "rgba(248,249,246,.8)" }}>{FAQ.length} ответов · проверены экспертами FOX</p>
          </div>
        </section>
        <section className="wrap band faq-layout">
          <aside className="stack">
            {sections.map((item) => (
              <button key={item} className={`chip${section === item ? " is-active" : ""}`} type="button" onClick={() => setSection(item)}>{item}</button>
            ))}
          </aside>
          <div>
            <label className="search" style={{ marginBottom: 16, width: "min(480px, 100%)" }}>
              <img src="/icons/search.svg" alt="" />
              <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Например: anti-CCD, дети, цена" aria-label="Поиск по вопросам" />
            </label>
            {items.length === 0 && <p role="status">Ничего не нашлось. Сбросьте запрос или напишите нам.</p>}
            <div className="stack">
              {items.map((item, index) => (
                <button key={item[1]} className="acc" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
                  <strong>{item[1]}</strong>
                  {open === index && <p>{item[2]}</p>}
                </button>
              ))}
            </div>
            <article className="panel" style={{ marginTop: 28 }}>
              <h2>Не нашли ответ?</h2>
              <p>Напишите нам. Медицинскую интерпретацию отчёта дистанционно не даём.</p>
              <Link className="btn btn-dark" href="/contacts">Задать вопрос</Link>
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

export function LabsPage() {
  const [city, setCity] = useState("Москва");
  const [selected, setSelected] = useState(BRANCHES[0].id);
  const [step, setStep] = useState(0);
  const [booked, setBooked] = useState(false);
  const known = ["москва", "санкт-петербург", "спб"];
  const empty = city.trim().length > 0 && !known.includes(city.trim().toLowerCase());
  const current = BRANCHES.find((item) => item.id === selected) ?? BRANCHES[0];
  useEffect(() => {
    if (step === 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStep(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);
  return (
    <>
      <Header />
      <main className="wrap band" id="zapis">
        <h1 className="page-title">Где сдать тест FOX</h1>
        <p className="lead">Цена устанавливается лабораторией. На сайте её нет.</p>
        <label className="field">Город
          <input value={city} onChange={(event) => setCity(event.target.value)} aria-label="Город" />
        </label>
        <section>
          <h2>Сети-партнёры</h2>
          <div className="lab-grid">
            {["Ситилаб", "Гемотест", "KDL", "ДНКОМ", "Инвитро", "CMD", "Хеликс", "Гемотест", "Инвитро"].map((name, index) => (
              <article className="lab-tile" key={`${name}-${index}`}>{name}</article>
            ))}
          </div>
        </section>
        <section>
          <h2>Перед визитом</h2>
          <p>Голодать не нужно. Диету накануне не назначают. Возьмите паспорт и направление, если его дал специалист.</p>
        </section>
        {empty ? (
          <p role="status">Вашего города нет в списке: партнёров пока нет. Оставьте контакт — напишем, когда появится сеть.</p>
        ) : (
          <div className="cards-2" style={{ marginTop: 20 }}>
            <div className="stack" data-lab-list>
              {BRANCHES.map((item) => (
                <button key={item.id} className="panel" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                  <h3>{item.lab}</h3>
                  <p>{item.address}</p>
                  <p>{item.metro}</p>
                  <p>{item.hours}</p>
                </button>
              ))}
            </div>
            <LabsMap points={BRANCHES} selected={selected} onSelect={setSelected} />
          </div>
        )}
        <button className="btn btn-dark" style={{ marginTop: 20 }} onClick={() => setStep(1)}>Записаться на тест</button>
        {step > 0 && (
          <div className="modal-back" onClick={() => setStep(0)}>
            <div className="modal" role="dialog" aria-label="Запись" onClick={(event) => event.stopPropagation()}>
              {booked ? <p>Открываем сайт {current.lab}. Цена и слот — на стороне лаборатории.</p> : (
                <>
                  <h2>Шаг {step} из 2</h2>
                  {step === 1 && <p>Город: {city || "не выбран"}</p>}
                  {step === 2 && <p>Сеть: {current.lab}, {current.address}</p>}
                  <button className="btn btn-dark" style={{ marginTop: 12 }} onClick={() => step === 1 ? setStep(2) : setBooked(true)}>
                    {step === 1 ? "Дальше" : "Перейти на сайт сети"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export function ContactsPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ok, setOk] = useState(false);
  const [who, setWho] = useState("Пациент");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Record<string, string> = {};
    if (String(data.get("name") || "").trim().length < 2) next.name = "Укажите имя";
    if (!String(data.get("email") || "").includes("@")) next.email = "Проверьте email";
    if (!data.get("agree")) next.agree = "Нужно согласие";
    setErrors(next);
    setOk(Object.keys(next).length === 0);
  }
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">Контакты</h1>
        <div className="cards-3" style={{ marginTop: 20 }}>
          <article className="panel"><h3>Телефон</h3><p><a href="tel:+74953748305">+7 (495) 374-83-05</a></p></article>
          <article className="panel"><h3>Почта</h3><p><a href="mailto:info@inmunotech.ru">info@inmunotech.ru</a></p></article>
          <article className="panel"><h3>Офис</h3><p>Москва, ул. Таганская, 3</p></article>
        </div>
        <p><a href={PARTNER_LOGIN}>Кабинет партнёра</a></p>
        <div className="chips" style={{ margin: "16px 0" }}>
          {["Пациент", "Специалист", "Лаборатория"].map((item) => (
            <button key={item} type="button" className={`chip${who === item ? " is-active" : ""}`} onClick={() => setWho(item)}>{item}</button>
          ))}
        </div>
        <p className="lead">
          {who === "Пациент" && "Запись на тест идёт через лабораторию. Здесь можно задать вопрос о сайте и документах."}
          {who === "Специалист" && "Курс, протокол и пример отчёта — в разделе для специалистов."}
          {who === "Лаборатория" && "Подключение сети: обучение персонала и материалы для пациентов."}
        </p>
        <div className="cards-2">
          <form onSubmit={submit} className="panel" noValidate>
            <label className={`field${errors.name ? " is-error" : ""}`}>Имя<input name="name" aria-invalid={!!errors.name} />{errors.name && <span className="err">{errors.name}</span>}</label>
            <label className={`field${errors.email ? " is-error" : ""}`}>Email<input name="email" type="email" aria-invalid={!!errors.email} />{errors.email && <span className="err">{errors.email}</span>}</label>
            <label className="field">Сообщение<textarea name="text" rows={4} /></label>
            <label className="check-row"><input type="checkbox" name="agree" /><span>Согласен на обработку данных</span></label>
            {errors.agree && <p className="err" role="alert">{errors.agree}</p>}
            {ok && <p role="status">Сообщение отправлено. Ответим в ближайший рабочий день.</p>}
            <button className="btn btn-dark" style={{ marginTop: 12 }} type="submit">Отправить</button>
          </form>
          <div className="leaflet-map" aria-label="Карта офиса" style={{ background: "#d7d8cd" }}>
            <p style={{ padding: 24 }}>Москва, ул. Таганская, 3</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function ReviewsPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Все");
  const [page, setPage] = useState(1);
  const cards = [
    ["Екатерина Ласковская", "Пациенты", "Отчёт дал конкретный список. Двух продуктов из него я бы не заподозрила."],
    ["Игорь Потруников", "Пациенты", "Убрал три продукта и возвращал их по одному. Через два месяца день перестал зависеть от желудка."],
    ["Клиника на Таганке", "Специалисты", "Отчёт стал структурой приёма, а не списком запретов, который пациент составил сам."],
  ].filter((item) => filter === "Все" || item[1] === filter);
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">Отзывы</h1>
        <p className="lead">4,9 · истории людей и специалистов. Все отзывы проходят модерацию.</p>
        <div className="chips" style={{ marginTop: 16 }}>
          {["Все", "Пациенты", "Специалисты"].map((item) => (
            <button key={item} className={`chip${filter === item ? " is-active" : ""}`} type="button" onClick={() => { setFilter(item); setPage(1); }}>{item}</button>
          ))}
        </div>
        <div className="cards-3" style={{ marginTop: 20 }}>
          {cards.slice((page - 1) * 6, page * 6).map(([name, kind, text]) => (
            <article className="panel" key={name}><p className="meta-line">{kind}</p><h3>{name}</h3><p>{text}</p></article>
          ))}
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => setPage(page === 1 ? 2 : 1)}>Страница {page}</button>
        <form className="panel" style={{ marginTop: 16, maxWidth: 640 }} onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (!data.get("agree")) return setError("Нужно согласие на публикацию");
          if (String(data.get("text") || "").trim().length < 10) return setError("Напишите чуть подробнее");
          setError("");
          setSent(true);
        }}>
          <h3>Оставить отзыв</h3>
          <label className="field">Текст<textarea name="text" rows={4} /></label>
          <label className="check-row"><input name="agree" type="checkbox" /><span>Согласен на модерацию и публикацию</span></label>
          {error && <p className="err" role="alert">{error}</p>}
          {sent && <p role="status">Отзыв отправлен на модерацию.</p>}
          <button className="btn btn-dark" type="submit">Отправить</button>
        </form>
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
