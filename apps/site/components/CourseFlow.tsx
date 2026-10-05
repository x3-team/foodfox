"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

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

function useRegistration() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function start() {
    setOpen(true);
    setSent(false);
    setStep(0);
    setError("");
  }

  function next() {
    if (step === 0 && name.trim().length < 2) return setError("Укажите имя");
    if (step === 1 && !email.includes("@")) return setError("Проверьте email");
    if (step === 2 && !agree) return setError("Нужно согласие на обработку данных");
    setError("");
    if (step < 2) setStep(step + 1);
    else setSent(true);
  }

  return { open, setOpen, step, sent, error, email, setEmail, name, setName, agree, setAgree, start, next };
}

function RegistrationDialog({ flow }: { flow: ReturnType<typeof useRegistration> }) {
  if (!flow.open) return null;
  return (
    <div className="modal-back" role="presentation" onClick={() => flow.setOpen(false)}>
      <div className="modal" role="dialog" aria-labelledby="reg-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="reg-title">{flow.sent ? "Проверьте почту" : `Шаг ${flow.step + 1} из 3`}</h2>
        {flow.sent ? (
          <p className="lead">Ссылка на кабинет курса придёт на {flow.email}. Доступ открывается сразу после перехода.</p>
        ) : (
          <>
            {flow.step === 0 && (
              <label className="field">Имя
                <input value={flow.name} onChange={(event) => flow.setName(event.target.value)} />
              </label>
            )}
            {flow.step === 1 && (
              <label className="field">Email
                <input type="email" value={flow.email} onChange={(event) => flow.setEmail(event.target.value)} />
              </label>
            )}
            {flow.step === 2 && (
              <label className="check-row">
                <input type="checkbox" checked={flow.agree} onChange={(event) => flow.setAgree(event.target.checked)} />
                <span>Согласен на обработку данных по 152-ФЗ</span>
              </label>
            )}
            {flow.error && <p className="err" role="alert">{flow.error}</p>}
            <button className="btn btn-dark" style={{ marginTop: 16 }} onClick={flow.next}>{flow.step === 2 ? "Получить доступ" : "Дальше"}</button>
          </>
        )}
      </div>
    </div>
  );
}

export function CoursePage() {
  const flow = useRegistration();
  const [opened, setOpened] = useState(0);
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
                <p>За шесть видеоуроков вы разберёте основы иммунологической пищевой непереносимости, принципы работы FOX, структуру отчёта и алгоритм применения результатов в практике.</p>
                <div className="kf-hero-cta">
                  <button className="btn btn-light" type="button" onClick={flow.start}>Зарегистрироваться</button>
                  <a className="text-link kf-light-link" href="#program">
                    Программа курса
                    <img src="/icons/arrow-right-light.svg" alt="" width={16} height={16} />
                  </a>
                </div>
                <p className="kf-caption">Около 30 секунд на регистрацию · доступ открывается сразу</p>
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

        <section className="kf-band" data-s="k02">
          <div className="wrap kf-stack">
            <div className="kf-head">
              <h2>Для кого курс по иммунологической пищевой непереносимости</h2>
              <p>Найдите свою специальность — покажем, что именно вы разберёте на уроках. Клик по карточке открывает соответствующий урок в программе.</p>
            </div>
            <div className="kf-audience" data-allow-x>
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
              <p>Каждый лектор ведёт свои уроки — номера указаны на карточке. Клик открывает профиль автора в блоге.</p>
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

        <section className="kf-includes" data-s="k05">
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

        <section className="kf-band" data-s="k06">
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
            <p>После короткой регистрации откроются шесть уроков, конспекты и гайд по отчёту. Доступ бессрочный.</p>
            <div className="kf-facts">
              <span>6 уроков</span>
              <span>Конспекты PDF</span>
              <span>Гайд по отчёту</span>
              <span>Сертификат</span>
            </div>
            <button className="btn btn-light" type="button" onClick={flow.start}>Получить доступ</button>
            <p className="kf-disclaimer">Сертификат подтверждает прохождение курса и не является баллом НМО.</p>
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
      setProgress(node.currentTime / node.duration);
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

  return (
    <>
      <Header />
      <main>
        <section data-s="l01" className="ls-layout">
          <div className="ls-progress" aria-label={`Прогресс курса, урок ${current + 1} из 6`}>
            <span>Прогресс курса</span>
            <i><b style={{ width: `${((current + 1) / 6) * 100}%` }} /></i>
            <strong>{current + 1} из 6</strong>
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
            <div className="ls-cert">
              <div>
                <strong>Сертификат</strong>
                <p>Станет доступен после всех шести уроков · {passed} из 6</p>
              </div>
              <button type="button" className="ls-cert-btn" disabled={done.length < 6}>Скачать сертификат</button>
            </div>
          </aside>
          <div className="ls-main">
            <div className="ls-title">
              <p>Урок {current + 1} · {lesson.lecturer}</p>
              <h1>{lesson.title}</h1>
            </div>
            <div className="ls-player" aria-label="Плеер урока">
              <div className="ls-stage">
                <video
                  ref={videoRef}
                  className="player-poster"
                  poster="/figma/course/player-poster.jpg"
                  src="/course/lesson-loop.mp4"
                  playsInline
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
                <button type="button" className="ls-play" onClick={toggle} aria-label={playing ? "Пауза" : "Смотреть"}>
                  <img src="/figma/icons/play.svg" alt="" width={24} height={24} />
                </button>
              </div>
              <div className="ls-controls">
                <button type="button" className="ls-ctrl" onClick={toggle}>{playing ? "Пауза" : "Смотреть"}</button>
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
                <a className="ls-quiet" href="/report">Конспект PDF</a>
                {current < 5 ? (
                  <button type="button" className="text-link" onClick={() => setCurrent(current + 1)}>
                    Следующий
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
            <div className="ls-about">
              <p className="ls-kicker">{tab === "files" ? "Материалы" : tab === "ask" ? "Вопрос лектору" : "О чём этот урок"}</p>
              <p>{tab === "ask" ? "Напишите вопрос к этому уроку — лектор ответит в кабинете курса." : lesson.about ?? lesson.content}</p>
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
            <span>Программа · урок {current + 1} из 6</span>
            <strong>Далее: {current < 5 ? LESSONS[current + 1].short : "сертификат"}</strong>
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
}
