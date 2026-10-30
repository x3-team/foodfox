/* Course data: defaults for the site and for the admin (lib/cms/registry.ts). */

/* minutes = 0 / clock = "" while the lesson video is not published yet; video is a direct file (.mp4 / .webm) or a
   player page to embed (Kinescope, Rutube, VK Video…); pdf is the lesson notes; notes overrides the lesson text on the
   lesson page (the client's texts live in course-notes/ and load on that page only): «## » starts a heading, «- » a
   list item, «1. » a numbered item, every other line is a paragraph. Lesson 5 is four lessons by specialty (parts);
   files are extra downloads. */
export type LessonPart = {
  title: string; short: string; lecturer: string; minutes: number; clock: string; video?: string; pdf?: string; notes?: string;
};
export type Lesson = {
  title: string; short: string; lecturer: string; minutes: number; clock: string; content: string; after: string;
  about?: string; aboutMob?: string; video?: string; pdf?: string; notes?: string;
  parts?: LessonPart[]; files?: Array<{ title: string; short: string; href: string }>;
};

export const LESSON5_PARTS: LessonPart[] = [
  { title: "Пищевая непереносимость в нутрициологии", short: "Нутрициология", lecturer: "Алёна Вавилова", minutes: 0, clock: "", pdf: "/course/konspekt-urok-5-1.pdf" },
  { title: "Пищевая непереносимость в косметологии", short: "Косметология", lecturer: "Ксения Эллинская", minutes: 0, clock: "", pdf: "/course/konspekt-urok-5-2.pdf" },
  { title: "Пищевая непереносимость в дерматологии", short: "Дерматология", lecturer: "Дмитрий Эллинский", minutes: 0, clock: "", pdf: "/course/konspekt-urok-5-3.pdf" },
  { title: "Пищевая непереносимость в гастроэнтерологии", short: "Гастроэнтерология", lecturer: "Светлана Каневская", minutes: 0, clock: "", pdf: "/course/konspekt-urok-5-4.pdf" },
];

/* Program from the client (00-struktura-kursa.xlsx, 2026-10-28). Lesson texts come with the client's packages:
   all six by 2026-10-30. */
export const LESSONS_DEFAULT: Lesson[] = [
  {
    title: "Вводный урок: погружение в тему",
    short: "Вводный урок",
    lecturer: "Алёна Вавилова",
    minutes: 0,
    clock: "",
    content: "Почему тестирование на пищевую непереносимость важно: история темы, научная база, аргументы за и против. Что даст курс специалисту, как он устроен и чему посвящены следующие уроки.",
    after: "Увидите ценность теста для себя и своих клиентов, поймёте структуру курса и что получите в конце.",
    pdf: "/course/konspekt-urok-1.pdf",
  },
  {
    title: "Основы пищевой непереносимости",
    short: "Основы пищевой непереносимости",
    lecturer: "Светлана Каневская",
    minutes: 0,
    clock: "",
    content: "Что такое пищевая непереносимость и чем она отличается от аллергии. Механизм: почему так происходит. Клинические проявления и почему их трудно связать с едой без теста.",
    after: "Поймёте механизмы и клинику пищевой непереносимости и сможете объяснить пациенту разницу между аллергией и непереносимостью.",
    pdf: "/course/konspekt-urok-2.pdf",
  },
  {
    title: "Тест FOX Food Xplorer",
    short: "Тест FOX Food Xplorer",
    lecturer: "Светлана Каневская",
    minutes: 0,
    clock: "",
    content: "Принцип работы теста и чем он отличается от других тестов. Как интерпретировать результаты. Кейсы и методология работы с результатами.",
    after: "Будете знать, из чего состоит тест, сможете читать результаты и поймёте, как встроить тест в свою работу.",
    pdf: "/course/konspekt-urok-3.pdf",
  },
  {
    title: "Как пищевая непереносимость влияет на здоровье",
    short: "Влияние на здоровье",
    lecturer: "Светлана Каневская",
    minutes: 0,
    clock: "",
    content: "Влияние пищевой непереносимости на ЖКТ и кожу, на иммунитет и на психоэмоциональное состояние. Клинический случай нецелиакийной чувствительности к глютену.",
    after: "Увидите связь жалоб клиента с пищевой непереносимостью и поймёте, почему пациентам важно пройти тест.",
    pdf: "/course/konspekt-urok-4.pdf",
  },
  {
    title: "Уроки по специальностям",
    short: "Уроки по специальностям",
    lecturer: "Алёна Вавилова, Ксения Эллинская, Дмитрий Эллинский, Светлана Каневская",
    minutes: 0,
    clock: "",
    content: "Четыре урока на выбор: для нутрициолога и диетолога, косметолога, дерматолога и гастроэнтеролога. В каждом две части — рекомендации по назначению теста, шаблоны и советы по ведению пациента, затем кейсы.",
    after: "Получите понятный алгоритм работы с результатами теста именно в своей специальности.",
    parts: LESSON5_PARTS,
  },
  {
    title: "Как внедрить тест в работу",
    short: "Как внедрить тест в работу",
    lecturer: "Алёна Вавилова",
    minutes: 0,
    clock: "",
    content: "Как предложить тест клиенту: аргументы и готовые формулировки. Партнёрская модель FOX. Вдохновение и следующие шаги.",
    after: "Будете знать, что делать дальше, чтобы начать работать с тестом и стать партнёром FOX.",
    pdf: "/course/konspekt-urok-6.pdf",
    files: [{ title: "Методичка «Работа с возражениями», PDF", short: "Методичка PDF", href: "/course/rabota-s-vozrazheniyami.pdf" }],
  },
];

export const COURSE_FAQ_DEFAULT: Array<[string, string]> = [
  ["Курс действительно бесплатный?", "Да. Все шесть уроков, конспекты и гайд по отчёту доступны без оплаты и без привязки к закупке тестов. Достаточно регистрации по e-mail — доступ открывается сразу."],
  ["Даёте ли вы баллы НМО?", "Нет. Курс не начисляет баллы НМО и не является программой непрерывного медицинского образования. Сертификат подтверждает только прохождение."],
  ["Какие документы я получу после курса?", "Сертификат о прохождении — после итогового теста из 15 вопросов. Тест можно пройти повторно. Конспекты PDF доступны в кабинете курса сразу после регистрации."],
  ["Можно ли смотреть уроки с телефона?", "Да. Кабинет, видео и конспекты открываются с телефона — отдельное приложение не нужно."],
  ["Как задать вопрос лектору?", "Вопрос отправляется из кабинета урока и попадает к автору этого урока."],
  ["Нужно ли проходить уроки по порядку?", "Нет. Уроки можно смотреть в удобном порядке. Итоговый тест открывается, когда отмечены все шесть уроков."],
];
