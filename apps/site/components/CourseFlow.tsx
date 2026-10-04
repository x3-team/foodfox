"use client";

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        <section className="dark-hero" data-s="k01">
          <img className="bg" src="/blog/cover-lab.png" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <p className="crumbs">Курс для специалистов</p>
            <h1 className="page-title" style={{ color: "white" }}>Научитесь читать отчёт FOX и применять его в практике</h1>
            <p className="lead" style={{ color: "rgba(248,249,246,.78)" }}>6 уроков, бесплатно, с сертификатом. Без баллов НМО.</p>
            <button className="btn btn-light" style={{ marginTop: 20 }} onClick={() => { setOpen(true); setSent(false); setStep(0); }}>
              Зарегистрироваться
            </button>
          </div>
        </section>
        <section className="wrap band" data-s="k02">
          <h2 className="page-title">Для кого курс</h2>
          <div className="cards-3" style={{ marginTop: 20 }}>
            {["Гастроэнтерологи", "Дерматологи", "Нутрициологи", "Терапевты", "Эндокринологи", "Педиатры", "Неврологи", "Аллергологи", "Диетологи"].map((item) => (
              <article className="panel" key={item}><h3>{item}</h3><p>Как читать зоны и говорить о рационе, не подменяя очный приём.</p></article>
            ))}
          </div>
        </section>
        <section className="wrap band" id="program" data-s="k03">
          <h2 className="page-title">Программа</h2>
          {LESSONS.map((lesson, index) => (
            <button className="lesson" key={lesson} onClick={() => setOpened(opened === index ? -1 : index)} aria-expanded={opened === index}>
              <span>Урок {index + 1}. {lesson}</span>
              <span>{opened === index ? "−" : "+"}</span>
            </button>
          ))}
          {opened >= 0 && <p className="lead">Урок {opened + 1}: {LESSONS[opened]}. Коротко о том, как это выглядит на приёме.</p>}
        </section>
        <section className="wrap band" id="lectors" data-s="k04">
          <h2 className="page-title">Лекторы</h2>
          <div className="cards-2">
            {[
              ["Светлана Каневская", "Д. м. н., профессор · уроки 1, 2, 6"],
              ["Алёна Вавилова", "Клинический нутрициолог · урок 3"],
              ["Ксения Эллинская", "К. м. н., дерматовенеролог · урок 4"],
              ["Дмитрий Эллинский", "Дерматовенеролог, трихолог · урок 5"],
            ].map(([name, role]) => <article className="panel" key={name}><h3>{name}</h3><p>{role}</p></article>)}
          </div>
        </section>
        <section className="wrap band" data-s="k05">
          <h2 className="page-title">Что входит в курс</h2>
          <div className="cards-3">
            {["6 видеоуроков", "Конспекты PDF", "Пример отчёта", "Протокол элиминации", "Сертификат", "Бессрочный доступ", "Без баллов НМО"].map((item) => (
              <article className="panel" key={item}><h3>{item}</h3></article>
            ))}
          </div>
        </section>
        <section className="wrap band" data-s="k06">
          <h2 className="page-title">Вопросы о курсе</h2>
          <p>Баллы НМО курс не начисляет. Доступ открывается по ссылке из письма.</p>
        </section>
        <section className="wrap band" data-s="k07">
          <h2 className="page-title">Начните с регистрации</h2>
          <button className="btn btn-dark" onClick={() => { setOpen(true); setSent(false); setStep(0); }}>Зарегистрироваться на курс</button>
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
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    if (videoRef.current) videoRef.current.currentTime = 0;
  }, [current]);
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    const onTime = () => {
      if (!node.duration) return;
      setProgress(node.currentTime / node.duration);
    };
    node.addEventListener("timeupdate", onTime);
    return () => node.removeEventListener("timeupdate", onTime);
  }, [current]);
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
          <div>
            <div className="player" aria-label="Плеер урока">
              <video
                ref={videoRef}
                className="player-poster"
                poster="/blog/cover-lab.png"
                src="/course/lesson-loop.mp4"
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <div className="player-bar">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => {
                    const node = videoRef.current;
                    if (!node) return;
                    if (node.paused) void node.play();
                    else node.pause();
                  }}
                >
                  {playing ? "Пауза" : "Смотреть"}
                </button>
                <input
                  aria-label="Прогресс урока"
                  type="range"
                  min={0}
                  max={1000}
                  value={Math.round(progress * 1000)}
                  onChange={(event) => {
                    const node = videoRef.current;
                    if (!node?.duration) return;
                    node.currentTime = (Number(event.target.value) / 1000) * node.duration;
                  }}
                />
                <span>Урок {current + 1}/6</span>
              </div>
            </div>
            <h2>Конспект</h2>
            <p>Короткий конспект урока {current + 1}: зоны, формулировки и то, чего в разговоре нет.</p>
            <a className="btn btn-ghost" href="/report">Скачать конспект PDF</a>
            {current < 5 ? (
              <button className="btn btn-dark" type="button" onClick={() => setCurrent(current + 1)}>Следующий урок</button>
            ) : (
              <p>Сертификат откроется после 6/6. Сейчас пройдено {current + 1} из 6.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
