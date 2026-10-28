import type { Statement } from "@/lib/partner-program/shared";

export const partner = {
  name: "Мария",
  fullName: "Ковалёва Мария",
  email: "kovaleva@clinic.ru",
  phone: "+7 925 111-11-11",
  specialty: "Нутрициолог",
  certificate: "FOX-EDU-2026-0418",
  status: "сертифицирован",
  period: "Сентябрь 2026",
  code: "KOVALEVA-24",
  link: "foodfox.ru/t/KOVALEVA-24",
  payoutMethod: "Самозанятый · СБП •••• 4417",
};

export type ReportStatus = "credited" | "review" | "missing";

export type PartnerReport = {
  number: string;
  client: string;
  date: string;
  status: ReportStatus;
  fee: string;
  lab?: string;
};

export const reports: PartnerReport[] = [
  {
    number: "FOX-2026-004182",
    client: "А. Соколова",
    date: "12.09.2026",
    status: "credited",
    fee: "2 400 ₽",
    lab: "Инвитро",
  },
  {
    number: "FOX-2026-004177",
    client: "Д. Петров",
    date: "10.09.2026",
    status: "credited",
    fee: "2 400 ₽",
  },
  {
    number: "FOX-2026-004165",
    client: "Е. Новикова",
    date: "08.09.2026",
    status: "review",
    fee: "—",
  },
  {
    number: "FOX-2026-004150",
    client: "И. Смирнов",
    date: "05.09.2026",
    status: "missing",
    fee: "—",
  },
];

export const statusLabel: Record<ReportStatus, string> = {
  credited: "Начислено",
  review: "На проверке",
  missing: "Не найден",
};

export const payouts = [
  {
    date: "05.09.2026",
    period: "август 2026",
    count: "7",
    method: partner.payoutMethod,
    amount: "16 800 ₽",
    status: "Выплачено" as const,
  },
  {
    date: "05.08.2026",
    period: "июль 2026",
    count: "6",
    method: partner.payoutMethod,
    amount: "14 400 ₽",
    status: "Выплачено" as const,
  },
  {
    date: "05.07.2026",
    period: "июнь 2026",
    count: "9",
    method: partner.payoutMethod,
    amount: "21 600 ₽",
    status: "Выплачено" as const,
  },
  {
    date: "—",
    period: "сентябрь 2026",
    count: "8",
    method: "Запрос на вывод отправлен",
    amount: "19 200 ₽",
    status: "В обработке" as const,
  },
];

export const materials = [
  {
    title: "Презентация о тесте FOX",
    meta: "PDF · 12 слайдов · 4,1 МБ",
  },
  { title: "Кому подходит тест", meta: "PDF · 2 страницы · 680 КБ" },
  {
    title: "Как сдать тест — памятка клиенту",
    meta: "PDF · 1 страница · 420 КБ",
  },
  { title: "Посты для соцсетей", meta: "8 изображений · ZIP · 18 МБ" },
  {
    title: "Шаблоны сообщений клиенту",
    meta: "6 текстов · копирование в 1 клик",
  },
  { title: "Логотипы и брендбук", meta: "SVG, PNG · ZIP · 6,4 МБ" },
];

export const allowedPhrases = [
  "«Тест показывает IgG-реакцию на 285 продуктов»",
  "«Помогает подобрать рацион при симптомах»",
  "«Инструмент поддержки диетологического вмешательства»",
  "«Исключение временное, на 4–6 недель»",
];

export const forbiddenPhrases = [
  "«Тест на аллергию» — это IgE, другой анализ",
  "«Продукт вреден вам навсегда»",
  "«Диагноз по результатам теста»",
  "«Заменяет обследование у врача»",
];

export const kpis = [
  {
    label: "Начислено за сентябрь",
    value: "28 800 ₽",
    hint: "+ 4 отчёта к выплате",
    tone: "dark" as const,
  },
  {
    label: "Клиентов всего",
    value: "37",
    hint: "12 активных на протоколе",
    tone: "light" as const,
  },
  {
    label: "На проверке",
    value: "3",
    hint: "отчёта ждут подтверждения",
    tone: "light" as const,
  },
  {
    label: "Доступно к выплате",
    value: "19 200 ₽",
    hint: "следующая — 5 октября",
    tone: "light" as const,
  },
];

/** Cards on «Начисления и выплаты» for the demo partner. */
export const money = {
  available: "19 200 ₽",
  availableHint: "8 подтверждённых отчётов · ближайшая выплата 5 октября",
  review: "7 200 ₽",
  reviewHint: "3 отчёта ждут подтверждения лаборатории",
  paidLabel: "Выплачено за 2026",
  paid: "142 800 ₽",
  paidHint: "за 9 месяцев · 59 отчётов",
};

/** Monthly reports and acts of the demo partner (БПИТ10.1.1). */
export const statements: Statement[] = [
  {
    id: "3", period: "2026-09-01", periodLabel: "сентябрь 2026", reports: 8, amount: 19200, status: "sent", disputeNote: "",
    actNo: "FOX-202609-3", scanSent: false, scanReceived: false, originalSentAt: null, originalTrack: "", originalReceived: false, paidAt: null, actReturned: false,
  },
  {
    id: "2", period: "2026-08-01", periodLabel: "август 2026", reports: 7, amount: 16800, status: "paid", disputeNote: "",
    actNo: "FOX-202608-2", scanSent: true, scanReceived: true, originalSentAt: "29.08.2026", originalTrack: "80085012345678", originalReceived: true, paidAt: "05.09.2026", actReturned: true,
  },
];
