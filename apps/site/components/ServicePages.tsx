"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header, PARTNER_LOGIN } from "@/components/Header";

const FAQ = [
  ["Чем пищевая непереносимость отличается от аллергии?", "Аллергия — быстрая реакция IgE. FOX смотрит IgG, реакции могут быть отложенными. Тест не диагностирует аллергию."],
  ["Насколько надёжен тест FOX?", "В основе ELISA, европейская маркировка IVDR. Результат интерпретирует специалист."],
  ["Нужно ли голодать перед забором?", "Нет. Специальной подготовки и диеты накануне не требуется."],
  ["Можно ли доверять IgG-тестам?", "Споры возникают, когда IgG выдают за диагноз. FOX — карта для разговора о рационе, не запрет навсегда."],
  ["Сколько ждать результат?", "7–10 дней. Сам анализ занимает около трёх часов."],
  ["Мне уже делали тесты на аллергию. Нужен ли FOX?", "Это разные вопросы. Если симптомы остались, специалист может предложить FOX как отдельный инструмент."],
];

export function FaqPage() {
  const [open, setOpen] = useState(0);
  const [q, setQ] = useState("");
  const items = FAQ.filter((item) => item.join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">Вопросы и ответы</h1>
        <label className="search" style={{ margin: "20px 0", width: "min(480px, 100%)" }}>
          <img src="/icons/search.svg" alt="" />
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Поиск по вопросам" aria-label="Поиск по вопросам" />
        </label>
        {items.length === 0 && <p role="status">Ничего не нашлось. Сбросьте запрос или напишите нам.</p>}
        <div className="stack">
          {items.map((item, index) => (
            <button key={item[0]} className="acc" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
              <strong>{item[0]}</strong>
              {open === index && <p>{item[1]}</p>}
            </button>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

const LABS = ["Ситилаб", "Гемотест", "KDL", "ДНКОМ", "Инвитро", "CMD", "Хеликс", "Хромолаб", "Юнимед"];

export function LabsPage() {
  const [city, setCity] = useState("Москва");
  const [lab, setLab] = useState("Ситилаб");
  const [step, setStep] = useState(0);
  const [booked, setBooked] = useState(false);
  const empty = city.trim().toLowerCase() === "нет";
  return (
    <>
      <Header />
      <main className="wrap band" id="zapis">
        <h1 className="page-title">Где сдать тест FOX</h1>
        <p className="lead">Цена устанавливается лабораторией. На сайте её нет.</p>
        <label className="field">Город
          <input value={city} onChange={(event) => setCity(event.target.value)} aria-label="Город" />
        </label>
        {empty ? (
          <p role="status">В этом городе партнёров пока нет. Оставьте контакт — напишем, когда появится сеть.</p>
        ) : (
          <div className="cards-3" style={{ marginTop: 20 }}>
            {LABS.map((name) => (
              <button key={name} className="panel" onClick={() => setLab(name)} aria-pressed={lab === name}>
                <h3>{name}</h3>
                <p>{name === "Хромолаб" && city !== "Москва" ? "Нет в вашем городе" : "Пункты на карте"}</p>
              </button>
            ))}
          </div>
        )}
        <div className="map" aria-label="Карта отделений" style={{ marginTop: 20 }}>
          <i className="pin" style={{ left: "30%", top: "40%" }} />
          <i className="pin" style={{ left: "55%", top: "48%" }} />
          <i className="pin" style={{ left: "62%", top: "36%" }} />
        </div>
        <button className="btn btn-dark" style={{ marginTop: 20 }} onClick={() => setStep(1)}>Записаться на тест</button>
        {step > 0 && (
          <div className="modal-back" onClick={() => setStep(0)}>
            <div className="modal" role="dialog" aria-label="Запись" onClick={(event) => event.stopPropagation()}>
              {booked ? <p>Открываем сайт {lab}. Цена и слот — на стороне лаборатории.</p> : (
                <>
                  <h2>Шаг {step} из 2</h2>
                  {step === 1 && <p>Город: {city || "не выбран"}</p>}
                  {step === 2 && (
                    <label className="field">Сеть
                      <select value={lab} onChange={(event) => setLab(event.target.value)}>{LABS.map((name) => <option key={name}>{name}</option>)}</select>
                    </label>
                  )}
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
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [net, setNet] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (String(data.get("name") || "").trim().length < 2) return setError("Укажите имя");
    if (!String(data.get("email") || "").includes("@")) return setError("Проверьте email");
    if (!data.get("agree")) return setError("Нужно согласие");
    setError("");
    if (net) return setError("Не отправилось. Проверьте сеть и попробуйте ещё раз.");
    setOk(true);
  }
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">Контакты</h1>
        <p className="lead">+7 (495) 374-83-05 · info@inmunotech.ru · Москва, ул. Таганская, 3</p>
        <p><a href={PARTNER_LOGIN}>Кабинет партнёра</a></p>
        <form onSubmit={submit} className="panel" style={{ maxWidth: 560, marginTop: 20 }} noValidate>
          <label className="field">Имя<input name="name" /></label>
          <label className="field">Email<input name="email" type="email" /></label>
          <label className="field">Сообщение<textarea name="text" rows={4} /></label>
          <label className="check-row"><input type="checkbox" name="agree" /><span>Согласен на обработку данных</span></label>
          <label className="check-row"><input type="checkbox" checked={net} onChange={(event) => setNet(event.target.checked)} /><span>Сымитировать ошибку сети</span></label>
          {error && <p className="err" role="alert">{error}</p>}
          {ok && <p role="status">Сообщение отправлено. Ответим в ближайший рабочий день.</p>}
          <button className="btn btn-dark" style={{ marginTop: 12 }} type="submit">Отправить</button>
        </form>
      </main>
      <Footer />
    </>
  );
}

export function ReviewsPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">Отзывы</h1>
        <p className="lead">4,9 · истории людей и специалистов. Все отзывы проходят модерацию.</p>
        <article className="panel" style={{ marginTop: 20 }}>
          <h3>Екатерина Ласковская</h3>
          <p>Отчёт дал конкретный список. Двух продуктов из него я бы не заподозрила.</p>
        </article>
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
