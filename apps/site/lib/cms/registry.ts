/* What the admin can edit on the site pages. Each field has a key (stored in site_content), a label for the editor and
   the default — the text the site showed before the admin existed. A field without a saved value shows its default,
   so the site never depends on the database. Plain module: used by the site (client and server) and by the admin. */

import { COURSE_FAQ_DEFAULT, LESSONS_DEFAULT } from "@/lib/site-data/course";
import { FAQ_GROUPS_DEFAULT } from "@/lib/site-data/faq";
import { HOME_FAQ_DEFAULT } from "@/lib/site-data/home";
import { PARTNERS } from "@/lib/labs";
import { REVIEWS_DEFAULT } from "@/lib/site-data/reviews";

export type ImageValue = { src: string; srcSet?: string; alt?: string };

export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "url"; default: string; hint?: string; max?: number }
  | { key: string; label: string; type: "lines"; default: string; hint?: string }
  | { key: string; label: string; type: "number"; default: number; hint?: string }
  | { key: string; label: string; type: "boolean"; default: boolean; hint?: string }
  | { key: string; label: string; type: "image"; default: ImageValue; hint?: string }
  | { key: string; label: string; type: "qa"; default: Array<[string, string]>; hint?: string }
  | { key: string; label: string; type: "json"; default: unknown[]; hint?: string }
  | { key: string; label: string; type: "list"; default: Array<Record<string, unknown>>; of: ItemField[]; fixed?: boolean; itemTitle: string; hint?: string };

export type ItemField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "url" | "qa";
  readonly?: boolean;
};

export type Section = { title: string; fields: Field[] };
export type PageDef = { id: string; title: string; path: string; sections: Section[] };

export const PAGES: PageDef[] = [
  {
    id: "global",
    title: "Контакты и общее",
    path: "/contacts",
    sections: [
      {
        title: "Контакты (шапка, подвал, страница «Контакты», FAQ)",
        fields: [
          { key: "contacts.phone", label: "Телефон", type: "text", default: "+7 (495) 374-83-05", hint: "Как показывать. Ссылка для звонка соберётся из цифр." },
          { key: "contacts.hours", label: "Часы работы", type: "text", default: "Пн–Пт 10:00–19:00 (МСК)" },
          { key: "contacts.email", label: "E-mail", type: "text", default: "info@inmunotech.ru" },
          { key: "contacts.address", label: "Адрес офиса", type: "text", default: "Москва, ул. Таганская, 3" },
          { key: "contacts.addressNote", label: "Подпись к адресу", type: "text", default: "МФК Инмунотех · м. Марксистская" },
          { key: "contacts.mapUrl", label: "Ссылка на маршрут", type: "url", default: "https://yandex.ru/maps/-/CHwvqE4z" },
          { key: "contacts.telegram", label: "Telegram-канал", type: "url", default: "https://t.me/foxfoodxplorer" },
        ],
      },
    ],
  },
  {
    id: "home",
    title: "Главная",
    path: "/",
    sections: [
      {
        title: "Первый экран",
        fields: [
          { key: "home.hero.title", label: "Заголовок (компьютер)", type: "lines", default: "Узнайте, какие продукты\nне подходят именно вам", hint: "Каждая строка выезжает отдельно." },
          { key: "home.hero.titleMobile", label: "Заголовок (телефон)", type: "lines", default: "Узнайте, какие\nпродукты не подходят\nименно вам" },
          { key: "home.hero.lead", label: "Подзаголовок", type: "textarea", default: "Персональный тест питания против болей в животе, вздутия, акне и других симптомов" },
          { key: "home.hero.cta", label: "Кнопка", type: "text", default: "Записаться на тест", max: 32 },
          { key: "home.hero.image", label: "Фон первого экрана", type: "image", default: { src: "/figma/home/hero-desktop.jpg" }, hint: "Горизонтальное фото не уже 2880 px. На телефоне остаётся своё фото." },
        ],
      },
      {
        title: "Лаборатории",
        fields: [
          { key: "home.labs.title", label: "Заголовок блока", type: "text", default: "Сдайте тест в любой из 1500+ лабораторий" },
          { key: "home.labs.lead", label: "Подпись про цену", type: "text", default: "Цена устанавливается лабораторией. Уточняйте на официальном сайте." },
        ],
      },
      { title: "Частые вопросы", fields: [{ key: "home.faq", label: "Вопросы и ответы", type: "qa", default: HOME_FAQ_DEFAULT }] },
    ],
  },
  {
    id: "specialists",
    title: "Специалистам",
    path: "/specialists",
    sections: [
      {
        title: "Первый экран",
        fields: [
          { key: "specialists.hero.pill1", label: "Метка 1", type: "text", default: "Для врачей и нутрициологов" },
          { key: "specialists.hero.pill2", label: "Метка 2", type: "text", default: "Платформа MADx · Австрия" },
          { key: "specialists.hero.title", label: "Заголовок", type: "textarea", default: "Пищеспецифические IgG к 286 антигенам — в одном подробном отчёте" },
          { key: "specialists.hero.lead", label: "Подзаголовок (компьютер)", type: "textarea", default: "FOX Food Xplorer исследует иммунную реактивность к 286 продуктам и пищевым компонентам. Один образец крови позволяет одновременно оценить широкую панель и получить основу для персональной тактики питания." },
          { key: "specialists.hero.leadMobile", label: "Подзаголовок (телефон)", type: "textarea", default: "Один образец крови — иммунная реактивность к 286 продуктам и пищевым компонентам. Опора для работы с ЖКТ, кожей и функциональными жалобами." },
          { key: "specialists.hero.body", label: "Текст", type: "textarea", default: "FOX можно использовать в комплексной работе с пациентами с функциональными жалобами ЖКТ, кожными проявлениями, головными болями и другими состояниями, при которых специалист предполагает связь самочувствия с рационом." },
          { key: "specialists.hero.cta", label: "Кнопка", type: "text", default: "Скачать пример отчёта", max: 32 },
        ],
      },
    ],
  },
  {
    id: "course",
    title: "Курс",
    path: "/course",
    sections: [
      {
        title: "Первый экран",
        fields: [
          { key: "course.hero.chip", label: "Метка", type: "text", default: "Бесплатный курс для специалистов" },
          { key: "course.hero.title", label: "Заголовок", type: "textarea", default: "Научитесь применять FOX Food Xplorer в работе с пациентами" },
          { key: "course.hero.lead", label: "Подзаголовок (компьютер)", type: "textarea", default: "За шесть видеоуроков вы разберёте основы иммунологической пищевой непереносимости, принципы работы FOX, структуру отчёта и алгоритм применения результатов в практике." },
          { key: "course.hero.leadMobile", label: "Подзаголовок (телефон)", type: "textarea", default: "Шесть видеоуроков: от основ иммунологической пищевой непереносимости до работы с отчётом." },
          { key: "course.hero.cta", label: "Кнопка", type: "text", default: "Получить доступ", max: 32 },
          { key: "course.hero.facts", label: "Факты под экраном", type: "lines", default: "6 видеоуроков по 12–18 минут\nКонспекты PDF к каждому уроку\nСертификат о прохождении\nБессрочный доступ", hint: "По одному на строку." },
        ],
      },
      {
        title: "Программа",
        fields: [
          {
            key: "course.lessons", label: "Уроки", type: "list", fixed: true, itemTitle: "Урок", default: LESSONS_DEFAULT,
            hint: "Уроков ровно шесть: от их числа зависят прогресс и сертификат.",
            of: [
              { name: "title", label: "Название", type: "text" },
              { name: "short", label: "Короткое название (меню урока)", type: "text" },
              { name: "lecturer", label: "Лектор", type: "text" },
              { name: "minutes", label: "Длительность, минут", type: "number" },
              { name: "clock", label: "Длительность видео (мм:сс)", type: "text" },
              { name: "content", label: "О чём урок", type: "textarea" },
              { name: "after", label: "Что будете уметь", type: "textarea" },
            ],
          },
        ],
      },
      { title: "Вопросы о курсе", fields: [{ key: "course.faq", label: "Вопросы и ответы", type: "qa", default: COURSE_FAQ_DEFAULT }] },
    ],
  },
  {
    id: "faq",
    title: "Вопросы и ответы",
    path: "/faq",
    sections: [
      {
        title: "Разделы",
        fields: [
          {
            key: "faq.groups", label: "Разделы и вопросы", type: "list", fixed: true, itemTitle: "Раздел", default: FAQ_GROUPS_DEFAULT,
            of: [
              { name: "id", label: "Якорь", type: "text", readonly: true },
              { name: "title", label: "Название раздела", type: "text" },
              { name: "items", label: "Вопросы", type: "qa" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "labs",
    title: "Лаборатории",
    path: "/labs",
    sections: [
      {
        title: "Сети-партнёры",
        fields: [
          {
            key: "labs.networks", label: "Сети", type: "list", fixed: true, itemTitle: "Сеть", default: PARTNERS.map(({ name, count, here, href }) => ({ name, count, here, href })),
            hint: "Логотипы и состав сетей меняются в коде. Цены — в разделе «Цены».",
            of: [
              { name: "name", label: "Сеть", type: "text", readonly: true },
              { name: "count", label: "Отделения (подпись)", type: "text" },
              { name: "here", label: "Есть в Москве", type: "boolean" },
              { name: "href", label: "Ссылка на страницу теста в сети", type: "url" },
            ],
          },
        ],
      },
    ],
  },
];

/* Prices are edited on their own admin page but stored the same way. FOX does not publish prices by default: the
   site said so in several places, so the switch keeps that until an admin turns it on. */
export const PRICE_FIELDS: Field[] = [
  { key: "prices.show", label: "Показывать цены на сайте", type: "boolean", default: false },
  { key: "prices.from", label: "Цена теста «от» (общая)", type: "text", default: "", hint: "Например «от 9 900 ₽». Пусто — не показывать." },
  { key: "prices.course", label: "Курс для специалистов", type: "text", default: "Бесплатно" },
  { key: "prices.partnerFee", label: "Вознаграждение партнёра за отчёт, ₽", type: "number", default: 2400, hint: "Подставляется в начисления партнёрам." },
];

/* Collections with their own admin pages (reviews, blog); validated in app/admin/(panel)/content/actions.ts. */
export const COLLECTION_FIELDS: Field[] = [
  { key: "reviews.list", label: "Отзывы", type: "json", default: REVIEWS_DEFAULT },
];

export const ALL_FIELDS: Field[] = [...PAGES.flatMap((p) => p.sections.flatMap((s) => s.fields)), ...PRICE_FIELDS, ...COLLECTION_FIELDS];
export const FIELD_BY_KEY: Record<string, Field> = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f]));
export const DEFAULTS: Record<string, unknown> = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f.default]));

/** Per-network test prices are a map by network name (prices.labs), so renaming a network in code drops only its price. */
export const PRICE_LABS_KEY = "prices.labs";
DEFAULTS[PRICE_LABS_KEY] = {};
