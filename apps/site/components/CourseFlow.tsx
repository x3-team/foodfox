"use client";

import { useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const LESSONS = [
  "Как устроен тест FOX",
  "Три зоны отчёта",
  "Anti-CCD и шум",
  "Разговор с пациентом",
  "Рацион после результата",
  "Границы метода",
];

export function CoursePage() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [opened, setOpened] = useState(0);

  function next() {
    if (step === 0 && name.trim().length < 2) return setError("Укажите имя");
    if (step === 1 && !email.includes("@")) return setError("Проверьте email");
    if (step === 2 && !agree) return setError("Нужно согласие на обработку данных");
    setError("");
    if (step < 2) setStep(step + 1);
    else setSent(true);
  }

  return (
    <>
      <Header />
      <main>
        <section className="wrap band">
          <p className="crumbs">Курс для специалистов</p>
          <h1 className="page-title">Научитесь читать отчёт FOX и применять его в практике</h1>
          <p className="lead">6 уроков, бесплатно, с сертификатом. Без баллов НМО.</p>
          <button className="btn btn-dark" style={{ marginTop: 20 }} onClick={() => { setOpen(true); setSent(false); setStep(0); }}>
            Зарегистрироваться
          </button>
        </section>
        <section className="wrap band">
          <h2>Программа</h2>
          {LESSONS.map((lesson, index) => (
            <button className="lesson" key={lesson} onClick={() => setOpened(index)} aria-expanded={opened === index}>
              <span>Урок {index + 1}. {lesson}</span>
              <span>{opened === index ? "−" : "+"}</span>
            </button>
          ))}
          {opened >= 0 && <p className="lead">Урок {opened + 1}: {LESSONS[opened]}. Коротко о том, как это выглядит на приёме.</p>}
        </section>
        {open && (
          <div className="modal-back" role="presentation" onClick={() => setOpen(false)}>
            <div className="modal" role="dialog" aria-labelledby="reg-title" onClick={(event) => event.stopPropagation()}>
              <h2 id="reg-title">{sent ? "Проверьте почту" : `Шаг ${step + 1} из 3`}</h2>
              {sent ? (
                <p className="lead">Ссылка на кабинет курса придёт на {email}. Доступ открывается сразу после перехода.</p>
              ) : (
                <>
                  {step === 0 && (
                    <label className="field">Имя
                      <input value={name} onChange={(event) => setName(event.target.value)} />
                    </label>
                  )}
                  {step === 1 && (
                    <label className="field">Email
                      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                    </label>
                  )}
                  {step === 2 && (
                    <label className="check-row">
                      <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
                      <span>Согласен на обработку данных по 152-ФЗ</span>
                    </label>
                  )}
                  {error && <p className="err" role="alert">{error}</p>}
                  <button className="btn btn-dark" style={{ marginTop: 16 }} onClick={next}>{step === 2 ? "Получить доступ" : "Дальше"}</button>
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

export function LessonsPage() {
  const [current, setCurrent] = useState(0);
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">Кабинет курса</h1>
        <div className="cards-2" style={{ marginTop: 24 }}>
          <div>
            {LESSONS.map((lesson, index) => (
              <button key={lesson} className="lesson" onClick={() => setCurrent(index)} aria-current={current === index ? "true" : undefined}>
                <span>{index < current ? "Готово" : index === current ? "Сейчас" : "Дальше"} · {lesson}</span>
              </button>
            ))}
          </div>
          <div className="player" aria-label="Плеер урока">
            <div>
              <p>Урок {current + 1}</p>
              <strong>{LESSONS[current]}</strong>
              <p>Субтитры включены. Продолжение с последнего места.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
