"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BottomSheet } from "@/components/BottomSheet";
import { useDialog } from "@/components/useDialog";
import { useReveal } from "@/components/useReveal";

/** Scrolls the window to `top` in `ms` (ease-in-out) and calls `done` on arrival; a wheel / touch by the visitor
    stops it (done is still called). The native smooth scroll has no duration and takes 0.5–1 s on long jumps. */
function scrollPageTo(top: number, ms: number, done: () => void) {
  const from = window.scrollY;
  const t0 = performance.now();
  let stopped = false;
  const stop = () => { stopped = true; };
  window.addEventListener("wheel", stop, { passive: true, once: true });
  window.addEventListener("touchstart", stop, { passive: true, once: true });
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    if (!stopped) window.scrollTo({ top: from + (top - from) * e, behavior: "instant" as ScrollBehavior });
    if (k < 1 && !stopped) window.requestAnimationFrame(step);
    else {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      done();
    }
  };
  window.requestAnimationFrame(step);
}

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    photo: "/figma/specialists/svetlana.webp",
  },
  {
    name: "Алёна Вавилова",
    role: "Клинический нутрициолог, health-coach",
    facts: ["Более семи лет в нутрициологии", "Основатель сообщества нутрициологов Москвы"],
    chip: "Ведёт урок 3",
    href: "/blog/authors/alyona-vavilova",
    photo: "/figma/specialists/alyona.webp",
  },
  {
    name: "Ксения Эллинская",
    role: "К. м. н., врач-дерматовенеролог, косметолог, нутрициолог",
    facts: ["21 год клинической практики", "Автор профессионального блога, 85 000+ подписчиков"],
    chip: "Ведёт урок 4",
    href: "/blog/authors/kseniya-ellinskaya",
    photo: "/figma/specialists/ksenia.webp",
  },
  {
    name: "Дмитрий Эллинский",
    role: "Врач-дерматовенеролог, трихолог, нутрициолог",
    facts: ["15 лет клинической практики", "Главный дерматолог холдинга «СМ-Клиника»"],
    chip: "Ведёт урок 5",
    href: "/blog/authors/dmitry-ellinskiy",
    photo: "/figma/specialists/dmitry.webp",
  },
];

const INCLUDES = [
  ["/figma/icons/course/play.svg", "6 видеоуроков", "Короткие блоки по 12–18 минут: от основ иммунологической пищевой непереносимости до внедрения FOX в практику."],
  ["/figma/icons/course/download.svg", "Конспекты к каждому уроку", "PDF с ключевыми тезисами, схемами и алгоритмами. К материалам можно возвращаться во время консультаций."],
  ["/figma/icons/course/file.svg", "Практический гайд по работе с отчётом", "Опорный шестинедельный протокол элиминации, правила возвращения продуктов, дневник симптомов и рекомендации по подбору замен."],
  ["/figma/icons/course/search.svg", "Клинические кейсы", "Разборы пациентов с готовыми отчётами FOX: ЖКТ, кожа, нервная система, аутоиммунные заболевания."],
  ["/figma/icons/course/award.svg", "Сертификат о прохождении", "Подтверждает участие в курсе и знакомство с методикой работы с FOX."],
  ["/figma/icons/course/chat.svg", "Экспертная Q&A", "Возможность задать вопрос авторам курса и обсудить сложные случаи из своей практики."],
  ["/figma/icons/course/infinity.svg", "Бессрочный доступ", "Материалы остаются доступны после прохождения курса — к урокам и конспектам можно возвращаться."],
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

/* Demo mode (/course?demo=1, /course/lessons?demo=1): the registration fills itself in with the demo account below,
   the e-mail link is replaced by a button, and the lessons get an autopilot. Nothing is sent to /api/lead.
   The flag lives in sessionStorage, so it survives the move to /course/lessons; ?demo=0 or «Выйти из демо» drops it. */
const DEMO_USER = { email: "demo@foodfox.ru", name: "Анна Демидова", spec: "Гастроэнтеролог" };
const DEMO_KEY = "fox-demo";
const DEMO_PROGRESS = "fox-demo-progress";

function useDemo() {
  const [demo, setDemo] = useState(false);
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("demo");
    let on = flag !== null && flag !== "0";
    try {
      if (flag === "0") { window.sessionStorage.removeItem(DEMO_KEY); window.sessionStorage.removeItem(DEMO_PROGRESS); }
      else if (on) window.sessionStorage.setItem(DEMO_KEY, "1");
      else on = window.sessionStorage.getItem(DEMO_KEY) === "1";
    } catch { /* storage blocked: demo only while ?demo=1 is in the address */ }
    setDemo(on);
    setFresh(flag !== null && flag !== "0");
  }, []);
  const exit = useCallback(() => {
    try { window.sessionStorage.removeItem(DEMO_KEY); window.sessionStorage.removeItem(DEMO_PROGRESS); } catch { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    window.location.assign(url.toString());
  }, []);
  return { demo, fresh, exit };
}

function DemoBar({ children, hint }: { children: React.ReactNode; hint: string }) {
  const [min, setMin] = useState(false);
  // On a phone the panel starts folded into a small pill, so it does not cover the player and the lesson text.
  useEffect(() => { if (window.matchMedia("(max-width: 767px)").matches) setMin(true); }, []);
  return (
    <div className={`demo-bar${min ? " is-min" : ""}`} role="region" aria-label="Демо-режим курса">
      <div className="demo-bar-top">
        <span className="demo-tag">ДЕМО</span>
        <b>{min ? "Демо-режим" : "Демо-данные, не настоящие"}</b>
        <button type="button" onClick={() => setMin(!min)} aria-label={min ? "Развернуть панель демо" : "Свернуть панель демо"}>{min ? "▾" : "—"}</button>
      </div>
      {!min && (
        <>
          <p>{hint}</p>
          {children}
        </>
      )}
    </div>
  );
}

/* K08 (Figma 1136:561 «Модалка регистрации · 3 коротких шага»): e-mail + consent → name → specialty → «Проверьте почту».
   Steps crossfade 200 мс + y 8, the indicator segment fills 150 мс, «Назад» keeps the input, autofocus + Enter on every step,
   e-mail checked on blur, the button is inactive without consent, Esc asks before dropping typed data, resend timer 60 s.
   The request goes to /api/lead (kind: "course"). */
function useRegistration(demo = false) {
  const demoRef = useRef(demo);
  demoRef.current = demo;
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
    if (demoRef.current) { runDemo(); return; }
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
        demoRef.current ? Promise.resolve() : fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "course", email, name, specialty: spec }) }),
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

  // Demo: the three steps fill themselves in (the e-mail and the name are typed letter by letter), then «Проверьте почту».
  const [demoRun, setDemoRun] = useState(false);
  const demoTimers = useRef<number[]>([]);
  const stopDemo = () => { demoTimers.current.forEach((timer) => window.clearTimeout(timer)); demoTimers.current = []; };
  useEffect(() => stopDemo, []);
  function runDemo() {
    stopDemo();
    setDemoRun(true);
    setOpen(true); setSent(false); setStep(0); setError(""); setBusy(false);
    setEmail(""); setName(""); setSpec(SPECIALTIES[0]); setAgree(false);
    let t = 600;
    const at = (ms: number, fn: () => void) => { t += ms; demoTimers.current.push(window.setTimeout(fn, t)); };
    const type = (text: string, set: (value: string) => void) => { for (let i = 1; i <= text.length; i += 1) at(55, () => set(text.slice(0, i))); };
    type(DEMO_USER.email, setEmail);
    at(350, () => setAgree(true));
    at(700, () => setStep(1));
    at(500, () => {});
    type(DEMO_USER.name, setName);
    at(700, () => setStep(2));
    at(800, () => setSpec(DEMO_USER.spec));
    at(900, () => setBusy(true));
    at(700, () => { setBusy(false); setSent(true); setWait(60); });
  }

  function close() {
    const typed = !sent && (email.trim() || name.trim());
    if (!demoRun && typed && !window.confirm("Прервать регистрацию?")) return;
    stopDemo();
    setOpen(false);
  }
  function dismiss() { stopDemo(); setOpen(false); }

  return { open, setOpen, close, step, setStep, sent, setSent, busy, error, setError, email, setEmail, name, setName, spec, setSpec, agree, setAgree, wait, start, next, send, emailError, demoRun, runDemo, dismiss };
}

function RegistrationDialog({ flow, onDemoMail }: { flow: ReturnType<typeof useRegistration>; onDemoMail?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(flow.close);
  closeRef.current = flow.close;
  useDialog(ref, () => closeRef.current(), flow.open);
  /* K5 / K08: between steps the modal height animates 250 мс (it used to jump to the new height in one frame while
     the new step was still fading in). The previous height is read after every commit. */
  const stepKey = flow.sent ? "sent" : String(flow.step);
  const lastHeight = useRef(0);
  const lastKey = useRef(stepKey);
  // A copy of the step as it was drawn after the previous commit: when the step changes, this copy stays on top for
  // 200 мс and leaves (K08: fades out while the next one crossfades in; M15 phone: slides 24px to the left + fade)
  // instead of the old step vanishing in one frame.
  const lastSnap = useRef<Array<{ node: HTMLElement; top: number; left: number; width: number }>>([]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) { lastHeight.current = 0; lastSnap.current = []; return; }
    const before = lastHeight.current;
    const changed = lastKey.current !== stepKey;
    lastKey.current = stepKey;
    const leaving = changed && !reduceMotion() ? lastSnap.current : [];
    lastSnap.current = Array.from(node.querySelectorAll<HTMLElement>(":scope > .reg-body:not(.reg-ghost)")).map((body) => ({
      node: body.cloneNode(true) as HTMLElement, top: body.offsetTop, left: body.offsetLeft, width: body.offsetWidth,
    }));
    node.querySelectorAll(":scope > .reg-ghost").forEach((ghost) => ghost.remove());
    leaving.forEach(({ node: ghost, top, left, width }) => {
      ghost.classList.add("reg-ghost");
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      Object.assign(ghost.style, { top: `${top}px`, left: `${left}px`, width: `${width}px` });
      node.appendChild(ghost);
      ghost.addEventListener("animationend", () => ghost.remove(), { once: true });
      window.setTimeout(() => ghost.remove(), 400);
    });
    node.style.height = "";
    const after = node.offsetHeight;
    lastHeight.current = after;
    if (!changed || !before || Math.abs(after - before) < 2 || reduceMotion()) return;
    node.style.height = `${before}px`;
    node.style.overflow = "hidden";
    void node.offsetHeight;
    node.classList.add("is-resizing");
    node.style.height = `${after}px`;
    const timer = window.setTimeout(() => {
      node.classList.remove("is-resizing");
      node.style.height = "";
      node.style.overflow = "";
      lastHeight.current = node.offsetHeight;
    }, 270);
    return () => window.clearTimeout(timer);
  });
  // M15 (phone): the registration sheet follows a downward drag; past 96px it closes (asking first if something
  // was typed — «Прервать регистрацию?»), otherwise it springs back.
  const drag = useRef<{ y: number; dy: number; moved?: boolean } | null>(null);
  if (!flow.open) return null;
  const heads = [
    ["Начнём с e-mail", "На него придёт ссылка для входа — без пароля. Шаг 1 из 3."],
    ["Как к вам обращаться?", "Имя попадёт в сертификат о прохождении. Шаг 2 из 3."],
    ["Ваша специальность", "Подберём примеры и порядок уроков под вашу практику. Шаг 3 из 3."],
  ];
  const [title, lead] = flow.sent ? ["Проверьте почту", ""] : heads[flow.step];
  // Figma 1136:561: title + sub, then the 3-segment indicator (all three filled on «Проверьте почту»), then the step body.
  return (
    <div className="modal-back" role="presentation" onClick={() => { if (!flow.email.trim() && !flow.name.trim()) flow.close(); }}>
      <div
        className="modal reg-modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-title"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          if (!window.matchMedia("(max-width: 767px)").matches || (event.target as HTMLElement).closest("input, select, textarea")) return;
          drag.current = { y: event.touches[0].clientY, dy: 0 };
        }}
        onTouchMove={(event) => {
          const d = drag.current;
          const node = ref.current;
          if (!d || !node) return;
          d.dy = Math.max(0, event.touches[0].clientY - d.y);
          if (d.dy > 4) d.moved = true;
          if (!d.moved) return;
          node.style.transition = "none";
          node.style.transform = d.dy ? `translateY(${d.dy}px)` : "";
        }}
        onTouchEnd={() => {
          const d = drag.current;
          const node = ref.current;
          drag.current = null;
          // a tap (no drag) leaves the inline transition alone: setting it here replaced the 250 мс height transition
          // of the step change that the same tap on «Продолжить» starts (M15: the sheet jumped to the new height)
          if (!d || !node || !d.moved) return;
          node.style.transition = "transform 240ms cubic-bezier(.2,.8,.2,1)";
          node.style.transform = "";
          window.setTimeout(() => { node.style.transition = ""; }, 260);
          if (d.dy > 96) flow.close();
        }}
      >
        <button type="button" className="lead-x reg-x" aria-label="Закрыть" onClick={flow.close}>×</button>
        <div className="reg-body reg-head" key={flow.sent ? "sent-head" : `head-${flow.step}`}>
          <h2 id="reg-title">{title}</h2>
          {lead ? <p className="lead">{flow.step === 0 && flow.error ? "Проверьте адрес — на него придёт ссылка для входа." : lead}</p> : null}
        </div>
        <div className="reg-steps" aria-hidden>{[0, 1, 2].map((index) => <i key={index} className={flow.sent || index <= flow.step ? "is-on" : ""} />)}</div>
        <div className="reg-body" key={flow.sent ? "sent" : flow.step}>
          {flow.sent ? (
            <div className="reg-sent">
              <img className="reg-illu" src="/figma/course/reg-mail.webp" alt="" width={504} height={200} />
              <p className="reg-sent-lead">Мы отправили ссылку для входа на {flow.email}. Ссылка действует 24 часа и открывает кабинет без пароля.</p>
              <p className="reg-sent-hint">Не пришло письмо? Проверьте папку «Спам» или отправьте повторно через 60 секунд.</p>
              <div className="reg-sent-actions">
                <button type="button" className="btn reg-resend" disabled={flow.wait > 0 || flow.busy} onClick={() => void flow.send()}>
                  Отправить снова{flow.wait > 0 ? ` (${Math.floor(flow.wait / 60)}:${String(flow.wait % 60).padStart(2, "0")})` : ""}
                </button>
                <button type="button" className="btn reg-change" onClick={() => { flow.setSent(false); flow.setStep(0); }}>Изменить e-mail</button>
              </div>
              {onDemoMail ? (
                <button type="button" className="btn btn-dark reg-demo-mail" data-autofocus onClick={onDemoMail}>Демо: открыть ссылку из письма</button>
              ) : null}
            </div>
          ) : (
            <form noValidate onSubmit={(event) => { event.preventDefault(); flow.next(); }}>
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

/**
 * K08 final state (Figma 1136:561) — «Доступ открыт», shown when the visitor comes back by the link from the e-mail
 * (/course?access=1). The link itself is sent by the back end; the site has no token check yet, so this screen
 * only presents the state and leads to lesson 1.
 */
function AccessDialog({ onClose, href = "/course/lessons" }: { onClose: () => void; href?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useDialog(ref, () => closeRef.current());
  return (
    <div className="modal-back" role="presentation" onClick={() => closeRef.current()}>
      <div className="modal reg-modal access-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="access-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="lead-x reg-x" aria-label="Закрыть" onClick={() => closeRef.current()}>×</button>
        <div className="reg-body">
          <h2 id="access-title">Доступ открыт</h2>
          <div className="reg-steps" aria-hidden>{[0, 1, 2].map((index) => <i key={index} className="is-on" />)}</div>
          <p className="access-ok">
            <span className="access-check" aria-hidden><img src="/figma/icons/check.svg" alt="" width={16} height={16} /></span>
            <span className="lead">Все шесть уроков и материалы доступны в личном кабинете.</span>
          </p>
          <ul className="access-chips">
            {["6 уроков", "Конспекты PDF", "Гайд по отчёту", "Сертификат после 6/6"].map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Link className="btn btn-dark" href={href} data-autofocus>Перейти к уроку 1</Link>
          <p className="reg-hint">Ссылку на кабинет мы также продублировали в письме.</p>
        </div>
      </div>
    </div>
  );
}

/* M17 (phone, note 1347:26053): a tap on a lecturer card opens a sheet with the biography — photo, regalia, the
   lecturer's lessons; the photo grows out of the card into the sheet (shared element, 320 мс, the sheet's own
   slide-up time and curve). The profile link of the card stays in the sheet. */
type BioOpen = { index: number; from: HTMLElement };
function LecturerSheet({ open, onClose }: { open: BioOpen; onClose: () => void }) {
  const person = LECTURERS[open.index];
  const photoRef = useRef<HTMLImageElement>(null);
  const lessons = LESSONS.map((lesson, index) => ({ ...lesson, n: index + 1 })).filter((lesson) => lesson.lecturer === person.name);
  useLayoutEffect(() => {
    const img = photoRef.current;
    const source = open.from.querySelector<HTMLImageElement>("img");
    const sheet = img?.closest<HTMLElement>(".bs");
    if (!img || !source || !sheet || reduceMotion() || !img.animate) return;
    const from = source.getBoundingClientRect();
    const to = img.getBoundingClientRect();
    const box = sheet.getBoundingClientRect();
    // where the photo will be once the sheet has slid up (the sheet sits on the bottom edge)
    const top = window.innerHeight - sheet.offsetHeight + (to.top - box.top);
    const fly = document.createElement("img");
    fly.src = source.currentSrc || source.src;
    fly.alt = "";
    fly.className = "kf-bio-fly";
    document.body.appendChild(fly);
    img.style.visibility = "hidden";
    source.style.visibility = "hidden";
    const motion = fly.animate(
      [
        { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, borderRadius: "16px" },
        { left: `${to.left}px`, top: `${top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: `${to.width / 2}px` },
      ],
      { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" },
    );
    const done = () => { img.style.visibility = ""; source.style.visibility = ""; fly.remove(); };
    motion.onfinish = done;
    return () => { motion.cancel(); done(); };
  }, [open]);
  return (
    <BottomSheet label={`Лектор: ${person.name}`} className="kf-bio" onClose={onClose}>
      <div className="bs-scroll kf-bio-body">
        <img ref={photoRef} className="kf-bio-photo" src={person.photo.replace(".webp", "-512.webp")} alt="" width={76} height={76} />
        <h2>{person.name}</h2>
        <p className="kf-bio-role">{person.role}</p>
        <p className="kf-bio-lessons">Уроки: {lessons.map((lesson) => `${lesson.n} · ${lesson.short}`).join("; ")}</p>
        <ul>{person.facts.map((fact) => <li key={fact}>— {fact}</li>)}</ul>
        <Link className="text-link" href={person.href}>
          Профиль автора
          <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
        </Link>
      </div>
    </BottomSheet>
  );
}

export function CoursePage() {
  const { demo, fresh, exit } = useDemo();
  const flow = useRegistration(demo);
  const [access, setAccess] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("access") !== null) setAccess(true);
  }, []);
  // Demo entry by the link (?demo=1): the registration starts by itself a moment after the page opens.
  const { runDemo } = flow;
  useEffect(() => {
    if (!fresh || new URLSearchParams(window.location.search).get("access") !== null) return;
    const timer = window.setTimeout(runDemo, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh]);
  const demoMail = () => { flow.dismiss(); setAccess(true); };
  const closeAccess = useCallback(() => {
    setAccess(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("access");
    window.history.replaceState(null, "", url);
  }, []);
  const [opened, setOpened] = useState(0);
  const [allAud, setAllAud] = useState(false);
  const [faq, setFaq] = useState(0);
  const [flash, setFlash] = useState(-1);
  const [lit, setLit] = useState("");
  const acc = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  // M10 / M17: the dots under the phone lecturer carousel follow the snapped card (frame K04 390: 20×6 + 6×6).
  const [lector, setLector] = useState(0);
  const lectorFrame = useRef(0);
  const onLectors = (event: React.UIEvent<HTMLDivElement>) => {
    const row = event.currentTarget;
    if (lectorFrame.current) return;
    lectorFrame.current = window.requestAnimationFrame(() => {
      lectorFrame.current = 0;
      const card = row.firstElementChild as HTMLElement | null;
      const step = (card?.offsetWidth ?? 300) + (parseFloat(getComputedStyle(row).columnGap) || 12);
      const end = row.scrollLeft >= row.scrollWidth - row.clientWidth - 2;
      const next = end ? LECTURERS.length - 1 : Math.min(LECTURERS.length - 1, Math.round(row.scrollLeft / step));
      setLector((prev) => (prev === next ? prev : next));
    });
  };
  const [bio, setBio] = useState<BioOpen | null>(null);
  const closeBio = useCallback(() => setBio(null), []);
  // M17: on a phone the lecturer card opens the biography sheet (announced as a dialog), elsewhere it is a link.
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useReveal();

  // M17 / M10: the first time the lecturer carousel is 40% on screen (phone) it nudges 24px and back, once per session.
  useEffect(() => {
    if (reduceMotion()) return;
    const row = document.querySelector<HTMLElement>(".kf-lectors");
    if (!row) return;
    let timer = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      if (row.scrollWidth <= row.clientWidth + 4 || row.scrollLeft > 0) return;
      try {
        if (window.sessionStorage.getItem("fox-nudge:k04")) return;
        window.sessionStorage.setItem("fox-nudge:k04", "1");
      } catch { /* storage blocked: nudge anyway */ }
      row.classList.add("kf-nudge");
      timer = window.setTimeout(() => row.classList.remove("kf-nudge"), 700);
    }, { threshold: 0.4 });
    io.observe(row);
    return () => { io.disconnect(); window.clearTimeout(timer); };
  }, []);

  /* K2: a click on an audience card scrolls to its lesson (smooth, ~400 мс), then the accordion opens (300 мс) and
     the lesson gets a lime frame for 600 мс. Before: the page scrolled to the top of the programme (not to the lesson)
     and the lesson opened at the same moment, often off screen. The scroll target already accounts for the open
     lesson above it, which collapses when the new one opens. */
  function openLesson(index: number) {
    const card = acc.current?.children[index] as HTMLElement | undefined;
    if (!card) { setOpened(index); return; }
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header")) || 72;
    let shift = 0;
    if (opened >= 0 && opened < index) {
      const fold = acc.current?.children[opened]?.querySelector<HTMLElement>(".kf-fold");
      shift = fold?.offsetHeight ?? 0;
    }
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const top = Math.max(0, Math.min(max, Math.round(card.getBoundingClientRect().top + window.scrollY - shift - header - 24)));
    const instant = reduceMotion();
    const finish = () => {
      setOpened(index);
      setFlash(index);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(-1), 900);
    };
    if (instant || Math.abs(top - window.scrollY) < 4) { window.scrollTo({ top, behavior: "auto" }); finish(); return; }
    scrollPageTo(top, 400, finish);
  }

  return (
    <>
      <Header />
      <main>
        <section className="dark-hero" data-s="k01">
          <img className="bg" src="/figma/course/hero-bg.webp" alt="" />
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
                <button key={card.title} type="button" className="kf-aud" data-rv="80" onClick={() => openLesson(card.lesson)}>
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
            <div className="kf-acc" ref={acc}>
              {LESSONS.map((lesson, index) => {
                const on = opened === index;
                return (
                  <article key={lesson.title} className={`${on ? "is-open" : ""}${flash === index ? " is-flash" : ""}`} onMouseEnter={() => setLit(lesson.lecturer)} onMouseLeave={() => setLit("")}>
                    <button type="button" aria-expanded={on} onClick={() => setOpened(on ? -1 : index)}>
                      <span className="kf-num">{index + 1}</span>
                      <span>
                        <strong>{lesson.title}</strong>
                        <small>{lesson.lecturer} · {lesson.minutes} мин</small>
                      </span>
                      <img src="/icons/chevron-down.svg" alt="" width={24} height={24} />
                    </button>
                    {/* C2: height 300 мс ease-out, the lesson text stays in the DOM. */}
                    <div className="kf-fold" inert={!on}>
                      <div>
                        <div className="kf-lesson-body">
                          <div>
                            <span>Содержание урока</span>
                            <p>{lesson.content}</p>
                          </div>
                          <aside>
                            <span>После урока</span>
                            <p>{lesson.after}</p>
                          </aside>
                        </div>
                      </div>
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
            <div className="kf-lectors" data-allow-x onScroll={onLectors}>
              {LECTURERS.map((person, index) => (
                <Link
                  key={person.name}
                  href={person.href}
                  className={`kf-lector${bio?.index === index ? " is-tapped" : ""}`}
                  aria-haspopup={phone ? "dialog" : undefined}
                  onClick={(event) => {
                    if (!window.matchMedia("(max-width: 767px)").matches) return;
                    event.preventDefault();
                    setBio({ index, from: event.currentTarget });
                  }}
                >
                  <span className="kf-lector-photo"><img src={person.photo} srcSet={`${person.photo.replace(".webp", "-512.webp")} 512w, ${person.photo} 1024w`} sizes="(min-width: 1101px) 380px, max(380px, 100vw)" alt="" /></span>
                  <span className="kf-lector-body">
                    <span>
                      <strong>{person.name}</strong>
                      <span className="kf-role">{person.role}</span>
                      <span className="kf-facts-list">
                        {person.facts.map((fact) => <span key={fact}>— {fact}</span>)}
                      </span>
                    </span>
                    <span className={`kf-chip-lime${lit === person.name ? " is-lit" : ""}`}>{person.chip}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="kf-dots" aria-hidden>
              {LECTURERS.map((person, index) => <i key={person.name} className={lector === index ? "is-on" : ""} />)}
            </div>
          </div>
        </section>

        <section className="kf-includes" id="includes" data-s="k05">
          <img className="kf-includes-bg" src="/figma/course/hero-bg.webp" alt="" />
          <div className="kf-includes-shade" />
          <div className="wrap kf-includes-in">
            <h2>Что входит в курс</h2>
            <div className="kf-include-row kf-include-3">
              {INCLUDES.slice(0, 3).map(([icon, title, text]) => (
                <article key={title} data-rv="60">
                  <img src={icon} alt="" width={24} height={24} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="kf-include-row kf-include-4">
              {INCLUDES.slice(3).map(([icon, title, text]) => (
                <article key={title} data-rv="60">
                  <img src={icon} alt="" width={24} height={24} />
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
                    <div className="kf-fold" inert={!on}><div><p>{answer}</p></div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="kf-final" data-s="k07">
          <img src="/figma/course/cta-bg.webp" alt="" />
          <div className="kf-includes-shade" />
          <div className="wrap kf-final-in">
            <i className="kf-bar" data-rv="0" />
            <h2 data-rv="0" data-rv-base="160">Зарегистрируйтесь на курс</h2>
            <p className="kf-lead-d" data-rv="0" data-rv-base="220">Доступ к шести урокам, конспектам и гайду по отчёту — сразу после регистрации. Около 30 секунд и только e-mail.</p>
            <p className="kf-lead-m" data-rv="0" data-rv-base="220">Доступ к шести урокам, конспектам и гайду — сразу после регистрации.</p>
            <div className="kf-facts">
              {["6 уроков", "Конспекты PDF", "Гайд по отчёту", "Сертификат"].map((fact) => <span key={fact} data-rv="80" data-rv-base="360">{fact}</span>)}
            </div>
            <button className="btn btn-light" type="button" onClick={flow.start} data-rv="0" data-rv-base="680">Получить доступ</button>
            <p className="kf-disclaimer kf-lead-d" data-rv="0" data-rv-base="760">Сертификат подтверждает прохождение курса и не является документом о повышении квалификации и не даёт баллов НМО.</p>
            <p className="kf-disclaimer kf-lead-m" data-rv="0" data-rv-base="760">Сертификат подтверждает прохождение курса и не является документом о повышении квалификации.</p>
          </div>
        </section>
        <RegistrationDialog flow={flow} onDemoMail={demo ? demoMail : undefined} />
        {access && <AccessDialog onClose={closeAccess} href={demo ? "/course/lessons?demo=1" : undefined} />}
        {demo && (
          <DemoBar hint={`Регистрация заполняется сама: ${DEMO_USER.email}, ${DEMO_USER.name}, ${DEMO_USER.spec.toLowerCase()}. Письмо не отправляется.`}>
            <button type="button" className="demo-act" onClick={flow.runDemo}>▶ Заполнить регистрацию</button>
            <button type="button" className="demo-act is-ghost" onClick={demoMail}>Экран «Доступ открыт»</button>
            <Link className="demo-act is-ghost" href="/course/lessons?demo=1">Сразу в кабинет курса</Link>
            <button type="button" className="demo-act is-ghost" onClick={exit}>Выйти из демо</button>
          </DemoBar>
        )}
        {bio && <LecturerSheet open={bio} onClose={closeBio} />}
      </main>
      <Footer />
    </>
  );
}

const SHEET_STOPS = [0.5, 0.92];

export function LessonsPage() {
  const [current, setCurrent] = useState(1);
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState<number[]>([0]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lesson = LESSONS[current];

  // Demo: the course starts from lesson 1 with nothing watched, progress is kept for the tab, and the autopilot walks
  // through all six lessons, marking each one watched, until the certificate opens.
  const { demo, exit } = useDemo();
  const restored = useRef(false);
  useEffect(() => {
    if (!demo) return;
    let saved: { current?: number; done?: number[] } | null = null;
    try { saved = JSON.parse(window.sessionStorage.getItem(DEMO_PROGRESS) || "null"); } catch { saved = null; }
    setCurrent(typeof saved?.current === "number" ? Math.min(5, Math.max(0, saved.current)) : 0);
    setDone(Array.isArray(saved?.done) ? saved.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 6) : []);
    restored.current = true;
  }, [demo]);
  useEffect(() => {
    if (!demo || !restored.current) return;
    try { window.sessionStorage.setItem(DEMO_PROGRESS, JSON.stringify({ current, done })); } catch { /* ignore */ }
  }, [demo, current, done]);
  const [touring, setTouring] = useState(false);
  const tourTimers = useRef<number[]>([]);
  const stopTour = useCallback(() => { tourTimers.current.forEach((timer) => window.clearTimeout(timer)); tourTimers.current = []; setTouring(false); }, []);
  useEffect(() => () => tourTimers.current.forEach((timer) => window.clearTimeout(timer)), []);
  function tour() {
    stopTour();
    setTouring(true);
    setDone([]);
    let t = 0;
    const at = (ms: number, fn: () => void) => { t += ms; tourTimers.current.push(window.setTimeout(fn, t)); };
    LESSONS.forEach((_, index) => {
      at(index ? 1600 : 100, () => { setCurrent(index); window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" }); });
      at(1400, () => setDone((prev) => (prev.includes(index) ? prev : [...prev, index])));
    });
    at(400, () => setTouring(false));
  }

  const [tab, setTab] = useState<"about" | "files" | "ask">("about");
  /* M19: the white pill of the segment slides to the picked tab (240 мс), the content crossfades (160 мс) and the
     block height animates between the two contents instead of jumping. */
  const aboutRef = useRef<HTMLDivElement>(null);
  const aboutHeight = useRef(0);
  function pickTab(next: "about" | "files" | "ask") {
    if (next === tab) return;
    aboutHeight.current = aboutRef.current?.offsetHeight ?? 0;
    setTab(next);
  }
  useLayoutEffect(() => {
    const node = aboutRef.current;
    const before = aboutHeight.current;
    aboutHeight.current = 0;
    if (!node || !before || reduceMotion()) return;
    const after = node.offsetHeight;
    if (Math.abs(after - before) < 2) return;
    node.style.height = `${before}px`;
    node.style.overflow = "hidden";
    void node.offsetHeight;
    node.style.transition = "height 240ms cubic-bezier(.2,.8,.2,1)";
    node.style.height = `${after}px`;
    const timer = window.setTimeout(() => { node.style.height = ""; node.style.overflow = ""; node.style.transition = ""; }, 260);
    return () => window.clearTimeout(timer);
  }, [tab]);

  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    setFailed(false);
    if (videoRef.current) videoRef.current.currentTime = 0;
  }, [current]);

  const closeSheet = useCallback(() => setSheet(false), []);

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
    if (!node || failed) return;
    if (node.paused) void node.play().catch(() => {});
    else node.pause();
  }

  // The source can fail before hydration attaches onError — read the element state once mounted / on lesson change.
  useEffect(() => {
    const node = videoRef.current;
    if (node && (node.error || node.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)) setFailed(true);
  }, [current]);

  // C09 (Figma 1206:1322): «Видео не загрузилось» — «Повторить» reloads the source; progress is kept by the player.
  function retry() {
    const node = videoRef.current;
    setFailed(false);
    node?.load();
  }

  // C6: the clock follows the timeline (elapsed share of the lesson length).
  const [mm, ss] = lesson.clock.split(":").map(Number);
  const elapsed = Math.round(progress * (mm * 60 + ss));
  const elapsedLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  /* M18: turning the phone to landscape while a lesson plays puts the player in full screen; back to portrait leaves
     it. The Fullscreen API may refuse a request that does not come from a tap (an orientation change is not a user
     gesture on most mobile browsers), so the player also covers the screen by itself (.is-landscape, fixed, black).
     Some browsers pause the video when full screen ends (seen in headless Chromium); the player resumes it — playback
     was started by the user's tap, so play() is allowed afterwards. */
  const playerRef = useRef<HTMLDivElement>(null);
  const [landscape, setLandscape] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(orientation: landscape) and (hover: none) and (pointer: coarse)");
    let wasPlaying = false;
    const resume = () => {
      const video = videoRef.current;
      if (!video || !wasPlaying) return;
      wasPlaying = false;
      // the pause arrives after the fullscreenchange event itself, so look again on the next frames
      let tries = 0;
      const check = () => {
        if (!video.paused || tries > 20) return;
        tries += 1;
        if (tries > 1) void video.play().catch(() => {});
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    };
    const sync = () => {
      const node = playerRef.current;
      const video = videoRef.current;
      if (!node || !video) return;
      if (query.matches && !video.paused) {
        setLandscape(true);
        if (!document.fullscreenElement && node.requestFullscreen) void node.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      } else if (!query.matches) {
        setLandscape(false);
        wasPlaying = !video.paused;
        if (document.fullscreenElement === node) void document.exitFullscreen().catch(() => {});
        resume();
      }
    };
    const onFullscreen = () => {
      if (document.fullscreenElement) return;
      resume();
    };
    query.addEventListener("change", sync);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      query.removeEventListener("change", sync);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);

  // L01: «счётчик меняется после анимации» — the «N из 6» label follows the progress bar (width 300 мс ease-out).
  const [shownStep, setShownStep] = useState(current + 1);
  useEffect(() => {
    const timer = window.setTimeout(() => setShownStep(current + 1), reduceMotion() ? 0 : 300);
    return () => window.clearTimeout(timer);
  }, [current]);

  const passed = Math.max(done.length, current + 1);
  const lastTap = useRef<{ t: number; side: "back" | "fwd" | null } | null>(null);
  const [seek, setSeek] = useState<{ side: "back" | "fwd"; n: number } | null>(null);
  // L01: controls hide after 2 s without movement while playing (opacity 150 мс) and come back on movement or focus.
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);
  const wake = useCallback(() => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    // L01: 2 s on a desktop; M18: 2.5 s on a touch screen.
    idleTimer.current = window.setTimeout(() => setIdle(true), window.matchMedia("(hover: none)").matches ? 2500 : 2000);
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
            <strong>{shownStep} из 6</strong>
            <i><b style={{ width: `${((current + 1) / 6) * 100}%` }} /></i>
          </div>
          <button type="button" className="btn btn-ghost ls-open" onClick={() => setSheet(true)}>Программа курса</button>
          {sheet && (
            // M20 (Figma 1327:7804): program sheet with two stops — 50% and 92% of the screen height.
            <BottomSheet label="Программа" className="ls-bs" stops={SHEET_STOPS} onClose={closeSheet}>
              <div className="ls-bs-head">
                <h2>Программа</h2>
                <p className="meta-line">{current + 1} из 6</p>
              </div>
              <div className="bs-scroll">
                {LESSONS.map((item, index) => {
                  const state = index === current ? "current" : done.includes(index) ? "done" : "next";
                  return (
                    <button key={item.title} type="button" className={`ls-item is-${state}${state === "current" && done.includes(index) ? " is-done" : ""}`} aria-current={index === current ? "true" : undefined} onClick={() => { setCurrent(index); setSheet(false); }}>
                      <span className="ls-badge">{done.includes(index) ? <img src="/figma/icons/check.svg" alt="" width={14} height={14} /> : index + 1}</span>
                      <span>
                        <strong>{item.short}</strong>
                        <small>{item.minutes} мин{state === "current" ? " · смотрите сейчас" : state === "done" ? " · просмотрено" : ""}</small>
                      </span>
                    </button>
                  );
                })}
                <div className={`ls-cert${unlocked ? " is-open" : ""}`}>
                  <strong>Сертификат</strong>
                  <p>Станет доступен после всех шести уроков · {passed} из 6</p>
                </div>
              </div>
            </BottomSheet>
          )}
          <aside className="ls-side">
            <p>Программа</p>
            <div className="ls-list">
              {LESSONS.map((item, index) => {
                const state = index === current ? "current" : done.includes(index) ? "done" : "next";
                return (
                  <button key={item.title} type="button" className={`ls-item is-${state}${state === "current" && done.includes(index) ? " is-done" : ""}`} aria-current={index === current ? "true" : undefined} onClick={() => setCurrent(index)}>
                    <span className="ls-badge">
                      {done.includes(index) ? <img src="/figma/icons/check.svg" alt="" width={14} height={14} /> : index + 1}
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
            <div ref={playerRef} className={`ls-player${playing ? " is-playing" : ""}${playing && idle ? " is-idle" : ""}${landscape ? " is-landscape" : ""}`} aria-label="Плеер урока" tabIndex={0} onMouseMove={wake} onFocus={wake} onKeyDown={(event) => {
              const node = videoRef.current;
              if (!node || (event.target as HTMLElement).tagName === "INPUT") return;
              if (event.key === " ") { event.preventDefault(); toggle(); }
              if (event.key === "ArrowRight" && node.duration) { event.preventDefault(); node.currentTime = Math.min(node.duration, node.currentTime + 5); }
              if (event.key === "ArrowLeft") { event.preventDefault(); node.currentTime = Math.max(0, node.currentTime - 5); }
              wake();
            }}>
              {/* M20: switching lessons crossfades the player (240 мс). */}
              <div
                className="ls-stage"
                key={current}
                onTouchEnd={(event) => {
                  // M18: a double tap on the left / right third seeks ∓10 s (round ripple + «10»).
                  const node = videoRef.current;
                  const touch = event.changedTouches[0];
                  if (!node || !touch) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = (touch.clientX - rect.left) / rect.width;
                  const side = x < 1 / 3 ? "back" : x > 2 / 3 ? "fwd" : null;
                  const now = performance.now();
                  const last = lastTap.current;
                  lastTap.current = { t: now, side };
                  if (!side || !last || last.side !== side || now - last.t > 320) return;
                  event.preventDefault();
                  lastTap.current = null;
                  node.currentTime = side === "back" ? Math.max(0, node.currentTime - 10) : Math.min(node.duration || node.currentTime + 10, node.currentTime + 10);
                  setSeek({ side, n: (seek?.n ?? 0) + 1 });
                  wake();
                }}
              >
                {seek && (
                  <span key={seek.n} className={`ls-seek is-${seek.side}`} aria-hidden onAnimationEnd={() => setSeek(null)}>
                    <i />
                    <b>10</b>
                  </span>
                )}
                <video
                  ref={videoRef}
                  className="player-poster"
                  poster="/figma/course/lesson-poster.webp"
                  playsInline
                  onClick={toggle}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onError={() => { setFailed(true); setPlaying(false); }}
                  onLoadedData={() => setFailed(false)}
                >
                  {/* VP9 — для сборок Chromium без H.264; ошибка «Видео не загрузилось» — только если не подошёл ни один источник */}
                  <source src="/course/lesson-loop.webm" type="video/webm" />
                  <source src="/course/lesson-loop.mp4" type="video/mp4" onError={() => { setFailed(true); setPlaying(false); }} />
                </video>
                {!playing && <img className="ls-poster" src="/figma/course/lesson-poster.webp" alt="" />}
                {/* M18: at 90% of the video the lesson is marked watched and «Следующий урок →» slides up at the bottom of the player. */}
                {progress >= 0.9 && current < 5 && !failed ? (
                  <button type="button" className="ls-next-plate" onClick={(event) => { event.stopPropagation(); setCurrent(current + 1); }}>
                    Следующий урок <span aria-hidden>→</span>
                  </button>
                ) : null}
                {failed ? (
                  <div className="ls-fail" role="alert">
                    <h2>Видео не загрузилось</h2>
                    <p>Проверьте соединение и повторите. Прогресс урока сохранён — продолжите с той же секунды.</p>
                    <div>
                      <button type="button" className="btn btn-dark" onClick={retry}>Повторить</button>
                      <a className="btn ls-fail-pdf" href="/report">Скачать конспект PDF</a>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="ls-play" onClick={toggle} aria-label={playing ? "Пауза" : "Смотреть"}>
                    <img src="/figma/icons/play.svg" alt="" width={24} height={24} />
                  </button>
                )}
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
                <span>{elapsedLabel} / {lesson.clock}</span>
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
                    <span>Следующий<span className="ls-d">&nbsp;урок</span></span>
                    <img src="/icons/arrow-right.svg" alt="" width={16} height={16} />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="ls-tabs" role="tablist" aria-label="Материалы урока" style={{ "--tab": ["about", "files", "ask"].indexOf(tab) } as React.CSSProperties}>
              <i className="ls-tab-pill" aria-hidden />
              <button type="button" className={tab === "about" ? "is-on" : ""} onClick={() => pickTab("about")}>Об уроке</button>
              <button type="button" className={tab === "files" ? "is-on" : ""} onClick={() => pickTab("files")}>Материалы</button>
              <button type="button" className={tab === "ask" ? "is-on" : ""} onClick={() => pickTab("ask")}>Вопрос</button>
            </div>
            <div className="ls-about" key={tab} ref={aboutRef}>
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
          {demo && (
            <DemoBar hint={`Кабинет демо-слушателя: ${DEMO_USER.name}. Уроки можно щёлкать в программе курса или запустить автопросмотр.`}>
              {touring ? (
                <button type="button" className="demo-act" onClick={stopTour}>■ Остановить автопросмотр</button>
              ) : (
                <button type="button" className="demo-act" onClick={tour}>▶ Пройти все 6 уроков</button>
              )}
              <button type="button" className="demo-act is-ghost" disabled={touring || unlocked} onClick={() => setDone([0, 1, 2, 3, 4, 5])}>Отметить все — открыть сертификат</button>
              <button type="button" className="demo-act is-ghost" disabled={touring} onClick={() => { setDone([]); setCurrent(0); firstUnlock.current = true; }}>Сбросить прогресс</button>
              <Link className="demo-act is-ghost" href="/course?demo=1">Заново: регистрация</Link>
              <button type="button" className="demo-act is-ghost" onClick={exit}>Выйти из демо</button>
            </DemoBar>
          )}
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
