"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useDialog } from "@/components/useDialog";

const AUDIENCE = [
  {
    icon: "/figma/icons/spec-1.svg",
    title: "Нутрициологи и диетологи",
    text: "Персонализация рациона при повторяющихся пищевых реакциях, длительных самостоятельных ограничениях и отсутствии понятной связи между едой и самочувствием.",
    course: "Как интерпретировать отчёт FOX, составлять план элиминации, подбирать полноценные замены и возвращать продукты в рацион.",
    lesson: 2,
  },
  {
    icon: "/figma/icons/spec-2.svg",
    title: "Гастроэнтерологи",
    text: "Пациенты с СРК, вздутием, болью, постпрандиальным дискомфортом, запором или нестабильным стулом.",
    course: "В каких случаях FOX можно использовать после базового обследования и как встроить результат в комплексную работу с рационом.",
    lesson: 1,
  },
  {
    icon: "/figma/icons/spec-3.svg",
    title: "Терапевты и врачи общей практики",
    text: "Полисимптомные пациенты, у которых сочетаются жалобы со стороны ЖКТ, кожи и нервной системы, но связь с продуктами неясна.",
    course: "Как определить место FOX в диагностическом маршруте и объяснить пациенту роль исследования.",
    lesson: 0,
  },
  {
    icon: "/figma/icons/spec-4.svg",
    title: "Специалисты по аутоиммунным заболеваниям",
    text: "Питание как часть комплексного сопровождения пациентов с подтверждёнными аутоиммунными заболеваниями.",
    course: "Как использовать FOX для формирования пищевых гипотез, не представляя тест как диагностику или метод лечения.",
    lesson: 3,
  },
  {
    icon: "/figma/icons/spec-5.svg",
    title: "Неврологи",
    text: "Мигрень, повторяющиеся головные боли, снижение концентрации и ощущение «тумана» в голове.",
    course: "Как использовать отчёт для выбора продуктов, которые стоит последовательно проверить в рамках комплексного ведения.",
    lesson: 3,
  },
  {
    icon: "/figma/icons/spec-6.svg",
    title: "Аллергологи и иммунологи",
    text: "Разграничение IgE-опосредованной аллергии, иммунологической пищевой непереносимости и неиммунных реакций на пищу.",
    course: "Что измеряет FOX, чем пищеспецифический IgG отличается от IgE и почему результаты нельзя использовать для оценки риска анафилаксии.",
    lesson: 1,
  },
  {
    icon: "/figma/icons/spec-7.svg",
    title: "Дерматологи и косметологи",
    text: "Атопический дерматит, акне, розацеа, высыпания и ограниченный эффект наружной терапии или процедур.",
    course: "Как оценивать роль рациона в комплексной работе с кожей и использовать FOX для формирования диетических гипотез.",
    lesson: 3,
  },
  {
    icon: "/figma/icons/spec-8.svg",
    title: "Эндокринологи и специалисты по массе тела",
    text: "Трудности со снижением веса, стойкая отёчность и слабая приверженность рациону из-за дискомфорта после еды.",
    course: "Как использовать FOX для построения переносимого рациона, не представляя тест как метод похудения.",
    lesson: 4,
  },
  {
    icon: "/figma/icons/spec-9.svg",
    title: "Педиатры",
    text: "Сложные ЖКТ- и кожные жалобы у детей, когда специалист предполагает связь с рационом.",
    course: "Как безопасно интерпретировать отчёт, оценивать риск дефицитов и планировать элиминацию только с полноценными заменами.",
    lesson: 5,
  },
];

const LESSONS = [
  {
    title: "Кому и зачем нужен FOX",
    short: "Кому и зачем нужен FOX",
    lecturer: "Светлана Каневская",
    minutes: 14,
    clock: "14:00",
    content: "В каких клинических и консультационных сценариях можно использовать FOX. Жалобы со стороны ЖКТ, кожи и нервной системы, аутоиммунные заболевания, программы коррекции массы тела и работа с отёчностью.",
    after: "Поймёте, каким пациентам можно предложить FOX и как корректно объяснить ценность исследования.",
    about: "Когда исследование уместно на приёме и как объяснить его место в маршруте, не подменяя очную диагностику.",
  },
  {
    title: "Основы иммунологической пищевой непереносимости",
    short: "Основы иммунологической пищевой непереносимости",
    lecturer: "Светлана Каневская",
    minutes: 16,
    clock: "16:40",
    content: "Чем отсроченные иммунологические реакции отличаются от IgE-аллергии, целиакии и лактазной недостаточности. Что показывает пищеспецифический IgG внутри одного отчёта.",
    after: "Сможете понятным языком объяснить пациенту механизмы пищевых реакций и роль IgG.",
    about: "Чем отсроченные иммунологические реакции отличаются от IgE-аллергии, целиакии, лактазной недостаточности и других неиммунных реакций на пищу. Какую роль играют пищеспецифические IgG и почему результат нельзя трактовать отдельно от клинической картины.",
    aboutMob: "Чем отсроченные иммунологические реакции отличаются от IgE-аллергии, целиакии и лактазной недостаточности. Как объяснить пациенту роль IgG.",
  },
  {
    title: "Что такое FOX Food Xplorer",
    short: "Что такое FOX Food Xplorer",
    lecturer: "Алёна Вавилова",
    minutes: 18,
    clock: "18:00",
    content: "Панель антигенов, группы продуктов, зоны и контрольные параметры. Как устроен отчёт и что сравнивать корректно только внутри одного бланка.",
    after: "Разберёте структуру отчёта и сможете открыть его вместе с пациентом за первые минуты консультации.",
  },
  {
    title: "Иммунологическая пищевая непереносимость и состояние организма",
    short: "Непереносимость и состояние организма",
    lecturer: "Ксения Эллинская",
    minutes: 15,
    clock: "15:00",
    content: "ЖКТ, кожа, нервная система и аутоиммунные заболевания: где отчёт помогает сформировать пищевую гипотезу и где он не заменяет лечение.",
    after: "Сформулируете гипотезу по рациону, не называя тест диагностикой или методом лечения.",
  },
  {
    title: "FOX в разных специализациях",
    short: "FOX в разных специализациях",
    lecturer: "Дмитрий Эллинский",
    minutes: 17,
    clock: "17:00",
    content: "Как один и тот же бланк читают гастроэнтеролог, дерматолог, эндокринолог и нутрициолог — без универсального меню.",
    after: "Увидите, какие вопросы к отчёту уместны в вашей специализации.",
  },
  {
    title: "Как внедрить FOX в работу",
    short: "Как внедрить FOX в работу",
    lecturer: "Светлана Каневская",
    minutes: 12,
    clock: "12:00",
    content: "Разговор на приёме, элиминация с заменами, дневник и возвращение продуктов по одному. Сертификат открывается после всех шести уроков.",
    after: "Соберёте понятный следующий шаг для пациента и не пообещаете того, чего в отчёте нет.",
  },
];

const LECTURERS = [
  {
    name: "Светлана Каневская",
    role: "Ведущий лектор · д. м. н., профессор, гастроэнтеролог-нутрициолог",
    facts: ["Более 25 лет клинической практики", "Автор клинических протоколов по пищевой непереносимости"],
    chip: "Ведёт уроки 1, 2 и 6",
    href: "/blog/authors/svetlana-kanevskaya",
    photo: "/figma/course/lector-1a.png",
  },
  {
    name: "Алёна Вавилова",
    role: "Клинический нутрициолог, health-coach",
    facts: ["Более семи лет в нутрициологии", "Основатель сообщества нутрициологов Москвы"],
    chip: "Ведёт урок 3",
    href: "/blog/authors/alyona-vavilova",
    photo: "/figma/course/lector-2a.png",
  },
  {
    name: "Ксения Эллинская",
    role: "К. м. н., врач-дерматовенеролог, косметолог, нутрициолог",
    facts: ["21 год клинической практики", "Автор профессионального блога, 85 000+ подписчиков"],
    chip: "Ведёт урок 4",
    href: "/blog/authors/kseniya-ellinskaya",
    photo: "/figma/course/lector-3a.png",
  },
  {
    name: "Дмитрий Эллинский",
    role: "Врач-дерматовенеролог, трихолог, нутрициолог",
    facts: ["15 лет клинической практики", "Главный дерматолог холдинга «СМ-Клиника»"],
    chip: "Ведёт урок 5",
    href: "/blog/authors/dmitry-ellinskiy",
    photo: "/figma/course/lector-4a.png",
  },
];

const INCLUDES = [
  ["/figma/icons/include-1.svg", "6 видеоуроков", "Короткие блоки по 12–18 минут: от основ иммунологической пищевой непереносимости до внедрения FOX в практику."],
  ["/figma/icons/include-2.svg", "Конспекты к каждому уроку", "PDF с ключевыми тезисами, схемами и алгоритмами. К материалам можно возвращаться во время консультаций."],
  ["/figma/icons/include-5.svg", "Практический гайд по работе с отчётом", "Опорный шестинедельный протокол элиминации, правила возвращения продуктов, дневник симптомов и рекомендации по подбору замен."],
  ["search", "Клинические кейсы", "Разборы пациентов с готовыми отчётами FOX: ЖКТ, кожа, нервная система, аутоиммунные заболевания."],
  ["/figma/icons/include-1.svg", "Сертификат о прохождении", "Подтверждает участие в курсе и знакомство с методикой работы с FOX."],
  ["/figma/icons/include-2.svg", "Экспертная Q&A", "Возможность задать вопрос авторам курса и обсудить сложные случаи из своей практики."],
  ["/figma/icons/include-5.svg", "Бессрочный доступ", "Материалы остаются доступны после прохождения курса — к урокам и конспектам можно возвращаться."],
];

const COURSE_FAQ = [
  ["Курс действительно бесплатный?", "Да. Все шесть уроков, конспекты и гайд по отчёту доступны без оплаты и без привязки к закупке тестов. Достаточно регистрации по e-mail — доступ открывается сразу."],
  ["Даёте ли вы баллы НМО?", "Нет. Курс не начисляет баллы НМО и не является программой непрерывного медицинского образования. Сертификат подтверждает только прохождение."],
  ["Какие документы я получу после курса?", "После всех шести уроков открывается сертификат о прохождении. Конспекты PDF и гайд по отчёту доступны сразу после регистрации."],
  ["Можно ли смотреть уроки с телефона?", "Да. Кабинет, видео и конспекты открываются с телефона — отдельное приложение не нужно."],
  ["Как задать вопрос лектору?", "Вопрос отправляется из кабинета урока и попадает к автору этого урока."],
  ["Нужно ли проходить уроки по порядку?", "Нет. Уроки можно смотреть в удобном порядке. Сертификат открывается, когда отмечены все шесть."],
];

const SPECIALTIES = ["Нутрициолог", "Диетолог", "Гастроэнтеролог", "Терапевт / врач общей практики", "Специалист по аутоиммунным заболеваниям", "Невролог"];

/* K08 (Figma 1136:561 «Модалка регистрации · 3 коротких шага»): e-mail + consent → name → specialty → «Проверьте почту».
   Steps crossfade 200 мс + y 8, the indicator segment fills 150 мс, «Назад» keeps the input, autofocus + Enter on every step,
   e-mail checked on blur, the button is inactive without consent, Esc asks before dropping typed data, resend timer 60 s.
   The request goes to /api/lead (kind: "course"). */
function useRegistration() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [spec, setSpec] = useState(SPECIALTIES[0]);
  const [agree, setAgree] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    // M04 «Доступ» on a phone (Figma CTA bar on /course).
    const onCourse = () => start();
    window.addEventListener("fox:course", onCourse);
    return () => window.removeEventListener("fox:course", onCourse);
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait(wait - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  function start() {
    setOpen(true);
    setSent(false);
    setStep(0);
    setError("");
  }

  const emailError = (value: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? "" : "Укажите корректный e-mail — на него придёт ссылка для входа");

  async function send() {
    setBusy(true);
    try {
      await Promise.all([
        fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "course", email, name, specialty: spec }) }),
        new Promise((resolve) => window.setTimeout(resolve, 600)),
      ]);
      setSent(true);
      setWait(60);
    } catch {
      window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text: "Нет соединения — попробуйте ещё раз", type: "error" } }));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (busy) return;
    if (step === 0) { const err = emailError(email); setError(err); if (err || !agree) return; }
    if (step === 1 && name.trim().length < 2) return setError("Укажите имя и фамилию");
    setError("");
    if (step < 2) setStep(step + 1);
    else void send();
  }

  function close() {
    const typed = !sent && (email.trim() || name.trim());
    if (typed && !window.confirm("Прервать регистрацию?")) return;
    setOpen(false);
  }

  return { open, close, step, setStep, sent, setSent, busy, error, setError, email, setEmail, name, setName, spec, setSpec, agree, setAgree, wait, start, next, send, emailError };
}

function RegistrationDialog({ flow }: { flow: ReturnType<typeof useRegistration> }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(flow.close);
  closeRef.current = flow.close;
  useDialog(ref, () => closeRef.current(), flow.open);
  if (!flow.open) return null;
  const heads = [
    ["Начнём с e-mail", "На него придёт ссылка для входа — без пароля. Шаг 1 из 3."],
    ["Как к вам обращаться?", "Имя попадёт в сертификат о прохождении. Шаг 2 из 3."],
    ["Ваша специальность", "Подберём примеры и порядок уроков под вашу практику. Шаг 3 из 3."],
  ];
  const [title, lead] = flow.sent ? ["Проверьте почту", ""] : heads[flow.step];
  return (
    <div className="modal-back" role="presentation" onClick={() => { if (!flow.email.trim() && !flow.name.trim()) flow.close(); }}>
      <div className="modal reg-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="reg-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="lead-x reg-x" aria-label="Закрыть" onClick={flow.close}>×</button>
        {!flow.sent && <div className="reg-steps" aria-hidden>{[0, 1, 2].map((index) => <i key={index} className={index <= flow.step ? "is-on" : ""} />)}</div>}
        <div className="reg-body" key={flow.sent ? "sent" : flow.step}>
          <h2 id="reg-title">{title}</h2>
          {flow.sent ? (
            <>
              <p className="lead">Мы отправили ссылку для входа на {flow.email}. Ссылка действует 24 часа и открывает кабинет без пароля.</p>
              <p className="reg-hint">Не пришло письмо? Проверьте папку «Спам» или отправьте повторно через 60 секунд.</p>
              <button type="button" className="btn btn-ghost" disabled={flow.wait > 0 || flow.busy} onClick={() => void flow.send()}>
                Отправить снова{flow.wait > 0 ? ` (${Math.floor(flow.wait / 60)}:${String(flow.wait % 60).padStart(2, "0")})` : ""}
              </button>
              <button type="button" className="text-link reg-link" onClick={() => { flow.setSent(false); flow.setStep(0); }}>Изменить e-mail</button>
            </>
          ) : (
            <form noValidate onSubmit={(event) => { event.preventDefault(); flow.next(); }}>
              <p className="lead">{flow.step === 0 && flow.error ? "Проверьте адрес — на него придёт ссылка для входа." : lead}</p>
              {flow.step === 0 && (
                <>
                  <label className={`field${flow.error ? " is-error" : ""}`}>E-mail
                    <input type="email" autoFocus value={flow.email} aria-invalid={Boolean(flow.error)}
                      onChange={(event) => { flow.setEmail(event.target.value); if (flow.error) flow.setError(flow.emailError(event.target.value)); }}
                      onBlur={() => { if (flow.email.trim()) flow.setError(flow.emailError(flow.email)); }} />
                    <span className={`lf-err${flow.error ? " is-on" : ""}`} aria-live="polite"><span className="err">{flow.error}</span></span>
                  </label>
                  <label className="check-row">
                    <input type="checkbox" checked={flow.agree} onChange={(event) => flow.setAgree(event.target.checked)} />
                    <span>Согласен с политикой конфиденциальности и обработкой персональных данных (152-ФЗ)</span>
                  </label>
                </>
              )}
              {flow.step === 1 && (
                <label className={`field${flow.error ? " is-error" : ""}`}>Имя и фамилия
                  <input autoFocus value={flow.name} aria-invalid={Boolean(flow.error)} onChange={(event) => { flow.setName(event.target.value); if (flow.error) flow.setError(""); }} />
                  <span className={`lf-err${flow.error ? " is-on" : ""}`} aria-live="polite"><span className="err">{flow.error}</span></span>
                </label>
              )}
              {flow.step === 2 && (
                <label className="field">Специальность
                  <select autoFocus value={flow.spec} onChange={(event) => flow.setSpec(event.target.value)}>
                    {SPECIALTIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
              )}
              <button className={`btn btn-dark${flow.busy ? " is-loading is-labelled" : ""}`} type="submit" disabled={(flow.step === 0 && !flow.agree) || flow.busy}>
                {flow.busy ? "Отправляем…" : flow.step === 2 ? "Получить доступ" : "Продолжить"}
              </button>
              {flow.step === 0 ? (
                <p className="reg-hint">Уже есть доступ? <Link href="/course/lessons">Войти</Link></p>
              ) : (
                <p className="reg-hint"><button type="button" className="text-link reg-link" onClick={() => { flow.setError(""); flow.setStep(flow.step - 1); }}>← Назад</button>{flow.step === 2 ? " · Город спросим позже в кабинете" : ""}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function CoursePage() {
  const flow = useRegistration();
  const [opened, setOpened] = useState(0);
  const [allAud, setAllAud] = useState(false);
  const [faq, setFaq] = useState(0);

  function openLesson(index: number) {
    setOpened(index);
    document.getElementById("program")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <Header />
      <main>
        <section className="dark-hero" data-s="k01">
          <img className="bg" src="/figma/course/hero-bg.png" alt="" />
          <div className="shade" />
          <div className="wrap inner">
            <div className="kf-hero-row">
              <div className="kf-hero-copy">
                <span className="kf-chip">Бесплатный курс для специалистов</span>
                <h1>Научитесь применять FOX Food Xplorer в работе с пациентами</h1>
                <p className="kf-lead-d">За шесть видеоуроков вы разберёте основы иммунологической пищевой непереносимости, принципы работы FOX, структуру отчёта и алгоритм применения результатов в практике.</p>
                <p className="kf-lead-m">Шесть видеоуроков: от основ иммунологической пищевой непереносимости до работы с отчётом.</p>
                <img className="kf-hero-visual-m" src="/figma/course/hero-visual.jpg" alt="" />
                <div className="kf-hero-cta">
                  <button className="btn btn-light" type="button" onClick={flow.start}>Получить доступ</button>
                  <a className="text-link kf-light-link" href="#program">
                    Программа курса
                    <img src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                  </a>
                </div>
                <p className="kf-caption kf-lead-d">Около 30 секунд на регистрацию · доступ открывается сразу</p>
                <p className="kf-caption kf-lead-m">Около 30 секунд на регистрацию · доступ сразу</p>
              </div>
              <img className="kf-hero-visual" src="/figma/course/hero-visual.jpg" alt="" />
            </div>
            <div className="kf-facts">
              <span>6 видеоуроков по 12–18 минут</span>
              <span>Конспекты PDF к каждому уроку</span>
              <span>Сертификат о прохождении</span>
              <span>Бессрочный доступ</span>
            </div>
          </div>
        </section>

        <section className="kf-band" id="audience" data-s="k02">
          <div className="wrap kf-stack">
            <div className="kf-head">
              <h2><span className="kf-lead-d">Для кого курс по иммунологической пищевой непереносимости</span><span className="kf-lead-m">Для кого курс</span></h2>
              <p className="kf-lead-d">Найдите свою специальность — покажем, что именно вы разберёте на уроках. Клик по карточке открывает соответствующий урок в программе.</p>
              <p className="kf-lead-m">Найдите свою специальность — покажем, что именно вы разберёте.</p>
            </div>
            <div className={`kf-audience${allAud ? " is-all" : ""}`} data-allow-x>
              {AUDIENCE.map((card) => (
                <button key={card.title} type="button" className="kf-aud" onClick={() => openLesson(card.lesson)}>
                  <span className="kf-aud-top">
                    <span className="kf-badge"><img src={card.icon} alt="" width={28} height={28} /></span>
                    <span className="kf-aud-title">
                      <strong>{card.title}</strong>
                      <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
                    </span>
                    <span className="kf-aud-text">{card.text}</span>
                  </span>
                  <span className="kf-aud-foot">
                    <span>На курсе</span>
                    <span>{card.course}</span>
                  </span>
                </button>
              ))}
            </div>
            {!allAud && (
              <button type="button" className="btn kf-aud-more" onClick={() => setAllAud(true)}>
                Показать все {AUDIENCE.length} специальностей
                <img src="/figma/icons/plus-dark.svg" alt="" width={24} height={24} />
              </button>
            )}
          </div>
        </section>

        <section className="kf-band kf-grey" id="program" data-s="k03">
          <div className="wrap kf-program">
            <div className="kf-program-head">
              <h2>Программа курса</h2>
              <p>6 уроков · ≈ 90 минут · конспекты PDF</p>
            </div>
            <div className="kf-acc">
              {LESSONS.map((lesson, index) => {
                const on = opened === index;
                return (
                  <article key={lesson.title} className={on ? "is-open" : ""}>
                    <button type="button" aria-expanded={on} onClick={() => setOpened(on ? -1 : index)}>
                      <span className="kf-num">{index + 1}</span>
                      <span>
                        <strong>{lesson.title}</strong>
                        <small>{lesson.lecturer} · {lesson.minutes} мин</small>
                      </span>
                      <img src="/icons/chevron-down.svg" alt="" width={24} height={24} />
                    </button>
                    <div className="kf-lesson-body" hidden={!on}>
                      <div>
                        <span>Содержание урока</span>
                        <p>{lesson.content}</p>
                      </div>
                      <aside>
                        <span>После урока</span>
                        <p>{lesson.after}</p>
                      </aside>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="kf-band" id="lectors" data-s="k04">
          <div className="wrap kf-stack">
            <div className="kf-head">
              <h2>Лекторы курса</h2>
              <p className="kf-lead-d">Каждый лектор ведёт свои уроки — номера указаны на карточке. Клик открывает профиль автора в блоге.</p>
              <p className="kf-lead-m">Номера уроков — на карточке. Тап открывает профиль автора.</p>
            </div>
            <div className="kf-lectors" data-allow-x>
              {LECTURERS.map((person) => (
                <Link key={person.name} href={person.href} className="kf-lector">
                  <img src={person.photo} alt="" />
                  <span className="kf-lector-body">
                    <span>
                      <strong>{person.name}</strong>
                      <span className="kf-role">{person.role}</span>
                      <span className="kf-facts-list">
                        {person.facts.map((fact) => <span key={fact}>— {fact}</span>)}
                      </span>
                    </span>
                    <span className="kf-chip-lime">{person.chip}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="kf-includes" id="includes" data-s="k05">
          <img className="kf-includes-bg" src="/figma/course/hero-bg.png" alt="" />
          <div className="kf-includes-shade" />
          <div className="wrap kf-includes-in">
            <h2>Что входит в курс</h2>
            <div className="kf-include-row kf-include-3">
              {INCLUDES.slice(0, 3).map(([icon, title, text]) => (
                <article key={title}>
                  {icon === "search" ? <i className="kf-search" /> : <img src={icon} alt="" width={24} height={24} />}
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="kf-include-row kf-include-4">
              {INCLUDES.slice(3).map(([icon, title, text]) => (
                <article key={title}>
                  {icon === "search" ? <i className="kf-search" /> : <img src={icon} alt="" width={24} height={24} />}
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="kf-band" id="faq" data-s="k06">
          <div className="wrap kf-faq">
            <h2>Вопросы о курсе</h2>
            <div>
              {COURSE_FAQ.map(([question, answer], index) => {
                const on = faq === index;
                return (
                  <div key={question} className={on ? "is-open" : ""}>
                    <button type="button" aria-expanded={on} onClick={() => setFaq(on ? -1 : index)}>
                      <span>{question}</span>
                      <img src="/icons/chevron-down.svg" alt="" width={20} height={20} />
                    </button>
                    <p hidden={!on}>{answer}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="kf-final" data-s="k07">
          <img src="/figma/course/cta-bg.png" alt="" />
          <div className="kf-includes-shade" />
          <div className="wrap kf-final-in">
            <i className="kf-bar" />
            <h2>Зарегистрируйтесь на курс</h2>
            <p className="kf-lead-d">Доступ к шести урокам, конспектам и гайду по отчёту — сразу после регистрации. Около 30 секунд и только e-mail.</p>
            <p className="kf-lead-m">Доступ к шести урокам, конспектам и гайду — сразу после регистрации.</p>
            <div className="kf-facts">
              <span>6 уроков</span>
              <span>Конспекты PDF</span>
              <span>Гайд по отчёту</span>
              <span>Сертификат</span>
            </div>
            <button className="btn btn-light" type="button" onClick={flow.start}>Получить доступ</button>
            <p className="kf-disclaimer kf-lead-d">Сертификат подтверждает прохождение курса и не является документом о повышении квалификации и не даёт баллов НМО.</p>
            <p className="kf-disclaimer kf-lead-m">Сертификат подтверждает прохождение курса и не является документом о повышении квалификации.</p>
          </div>
        </section>
        <RegistrationDialog flow={flow} />
      </main>
      <Footer />
    </>
  );
}

export function LessonsPage() {
  const [current, setCurrent] = useState(1);
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState<number[]>([0]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lesson = LESSONS[current];

  const [tab, setTab] = useState<"about" | "files" | "ask">("about");

  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    if (videoRef.current) videoRef.current.currentTime = 0;
  }, [current]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    const onTime = () => {
      if (!node.duration) return;
      const share = node.currentTime / node.duration;
      setProgress(share);
      // L01 / M18: a lesson is marked watched automatically at ≥ 90% of the video.
      if (share >= 0.9) setDone((prev) => (prev.includes(current) ? prev : [...prev, current]));
    };
    node.addEventListener("timeupdate", onTime);
    return () => node.removeEventListener("timeupdate", onTime);
  }, [current]);

  function toggle() {
    const node = videoRef.current;
    if (!node) return;
    if (node.paused) void node.play();
    else node.pause();
  }

  const passed = Math.max(done.length, current + 1);
  // L01: controls hide after 2 s without movement while playing (opacity 150 мс) and come back on movement or focus.
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);
  const wake = useCallback(() => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 2000);
  }, []);
  useEffect(() => { if (playing) wake(); else { window.clearTimeout(idleTimer.current); setIdle(false); } }, [playing, wake]);
  // L01: at 6/6 the certificate card unlocks (300 мс) and a toast confirms it.
  const unlocked = done.length >= 6;
  const firstUnlock = useRef(true);
  useEffect(() => {
    if (!unlocked) return;
    if (firstUnlock.current) { firstUnlock.current = false; window.dispatchEvent(new CustomEvent("fox:toast", { detail: "Сертификат доступен" })); }
  }, [unlocked]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("fox:lesson", { detail: current + 1 }));
  }, [current]);

  return (
    <>
      <Header />
      <main>
        <section data-s="l01" className="ls-layout">
          <div className="ls-progress" aria-label={`Прогресс курса, урок ${current + 1} из 6`}>
            <span>Прогресс курса</span>
            <strong>{current + 1} из 6</strong>
            <i><b style={{ width: `${((current + 1) / 6) * 100}%` }} /></i>
          </div>
          <button type="button" className="btn btn-ghost ls-open" onClick={() => setSheet(true)}>Программа курса</button>
          {sheet && (
            <div className="modal-back" onClick={() => setSheet(false)}>
              <div className="modal ls-sheet" role="dialog" aria-label="Программа" onClick={(event) => event.stopPropagation()}>
                <h2>Программа</h2>
                <p className="meta-line">2 из 6</p>
                {LESSONS.map((item, index) => {
                  const state = index === current ? "current" : done.includes(index) ? "done" : "next";
                  return (
                    <button key={item.title} type="button" className={`ls-item is-${state}`} onClick={() => { setCurrent(index); setSheet(false); }}>
                      <span className="ls-badge">{state === "done" ? "✓" : index + 1}</span>
                      <span>
                        <strong>{item.short}</strong>
                        <small>{item.minutes} мин{state === "current" ? " · смотрите сейчас" : state === "done" ? " · просмотрено" : ""}</small>
                      </span>
                    </button>
                  );
                })}
                <div className="ls-cert">
                  <strong>Сертификат</strong>
                  <p>Станет доступен после всех шести уроков · {passed} из 6</p>
                </div>
              </div>
            </div>
          )}
          <aside className="ls-side">
            <p>Программа</p>
            <div className="ls-list">
              {LESSONS.map((item, index) => {
                const state = index === current ? "current" : done.includes(index) ? "done" : "next";
                return (
                  <button key={item.title} type="button" className={`ls-item is-${state}`} aria-current={index === current ? "true" : undefined} onClick={() => setCurrent(index)}>
                    <span className="ls-badge">
                      {state === "done" ? <img src="/figma/icons/check.svg" alt="" width={14} height={14} /> : index + 1}
                    </span>
                    <span>
                      <strong>{item.short}</strong>
                      <small>
                        {item.minutes} мин
                        {state === "done" ? " · просмотрено" : state === "current" ? " · смотрите сейчас" : ""}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={`ls-cert${unlocked ? " is-open" : ""}`}>
              <div>
                <strong>Сертификат</strong>
                <p>Станет доступен после всех шести уроков · {passed} из 6</p>
              </div>
              <button type="button" className="ls-cert-btn" disabled={!unlocked}>Скачать сертификат</button>
            </div>
          </aside>
          <div className="ls-main">
            <div className="ls-title">
              <p>Урок {current + 1} · {lesson.lecturer}<span className="ls-min"> · {lesson.minutes} мин</span></p>
              <h1>{lesson.title}</h1>
            </div>
            {/* L01: Space — play/pause, ←/→ — ±5 с (when the player has focus). */}
            <div className={`ls-player${playing && idle ? " is-idle" : ""}`} aria-label="Плеер урока" tabIndex={0} onMouseMove={wake} onFocus={wake} onKeyDown={(event) => {
              const node = videoRef.current;
              if (!node || (event.target as HTMLElement).tagName === "INPUT") return;
              if (event.key === " ") { event.preventDefault(); toggle(); }
              if (event.key === "ArrowRight" && node.duration) { event.preventDefault(); node.currentTime = Math.min(node.duration, node.currentTime + 5); }
              if (event.key === "ArrowLeft") { event.preventDefault(); node.currentTime = Math.max(0, node.currentTime - 5); }
              wake();
            }}>
              <div className="ls-stage">
                <video
                  ref={videoRef}
                  className="player-poster"
                  poster="/figma/course/lesson-poster.webp"
                  src="/course/lesson-loop.mp4"
                  playsInline
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
                {!playing && <img className="ls-poster" src="/figma/course/lesson-poster.webp" alt="" />}
                <button type="button" className="ls-play" onClick={toggle} aria-label={playing ? "Пауза" : "Смотреть"}>
                  <img src="/figma/icons/play.svg" alt="" width={24} height={24} />
                </button>
              </div>
              <div className="ls-controls">
                <button type="button" className="ls-ctrl" onClick={toggle} aria-label={playing ? "Пауза" : "Смотреть"}>
                  <img src="/figma/icons/play-light.svg" alt="" width={20} height={20} />
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
                <span>00:00 / {lesson.clock}</span>
                <span className="ls-chip">CC</span>
                <span className="ls-chip">1×</span>
              </div>
            </div>
            <div className="ls-actions">
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => setDone((prev) => (prev.includes(current) ? prev : [...prev, current]))}
              >
                Отметить как просмотренный
              </button>
              <div className="ls-pair">
                <a className="ls-quiet" href="/report">{"Конспект"}<span className="ls-d">{"\u00a0урока"}</span>{"\u00a0PDF"}</a>
                {current < 5 ? (
                  <button type="button" className="text-link" onClick={() => setCurrent(current + 1)}>
                    Следующий<span className="ls-d">&nbsp;урок</span>
                    <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="ls-tabs" role="tablist" aria-label="Материалы урока">
              <button type="button" className={tab === "about" ? "is-on" : ""} onClick={() => setTab("about")}>Об уроке</button>
              <button type="button" className={tab === "files" ? "is-on" : ""} onClick={() => setTab("files")}>Материалы</button>
              <button type="button" className={tab === "ask" ? "is-on" : ""} onClick={() => setTab("ask")}>Вопрос</button>
            </div>
            <div className="ls-about" key={tab}>
              <p className="ls-kicker">{tab === "files" ? "Материалы" : tab === "ask" ? "Вопрос лектору" : "О чём этот урок"}</p>
              <p>
                {tab === "ask" ? "Напишите вопрос к этому уроку — лектор ответит в кабинете курса." : (
                  <>
                    <span className="ls-about-desk">{lesson.about ?? lesson.content}</span>
                    <span className="ls-about-mob">{"aboutMob" in lesson && lesson.aboutMob ? lesson.aboutMob : lesson.about ?? lesson.content}</span>
                  </>
                )}
              </p>
              <div className="ls-tags">
                <span>Конспект PDF</span>
                <span>Задать вопрос лектору</span>
                <span>Материалы к уроку</span>
                <span>Гайд по отчёту</span>
              </div>
              <div className="ls-after">
                <span>После урока</span>
                <p>{lesson.after}</p>
              </div>
            </div>
          </div>
          <button type="button" className="ls-sticky" aria-label="Программа курса" onClick={() => setSheet(true)}>
            <span className="ls-sticky-row">
              <span className="ls-sticky-prog">Программа · урок {current + 1} из 6</span>
              <img className="ls-sticky-chev" src="/icons/chevron-down.svg" alt="" width={16} height={16} />
            </span>
            <span className="ls-sticky-next">Далее: {current < 5 ? LESSONS[current + 1].short : "сертификат"}</span>
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
}
