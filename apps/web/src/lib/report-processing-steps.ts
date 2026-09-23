export interface ReportProcessingStep {
  id: string;
  label: string;
  detail: string;
}

export const REPORT_PROCESSING_STEPS: ReportProcessingStep[] = [
  {
    id: "upload",
    label: "Загрузка PDF",
    detail: "Передаём файл на сервер в защищённое хранилище",
  },
  {
    id: "extract",
    label: "Извлечение данных",
    detail: "Читаем таблицы и значения IgG из отчёта FOX",
  },
  {
    id: "parse",
    label: "Разбор антигенов",
    detail: "Распределяем продукты по зонам 🟢 🟡 🔴",
  },
  {
    id: "plan",
    label: "8-недельный план",
    detail: "Элиминация → стабилизация → расширение рациона",
  },
  {
    id: "chat",
    label: "Подготовка чата",
    detail: "Бот-нутрициолог получит ваши результаты",
  },
];

export const DEMO_PROCESSING_STEPS: ReportProcessingStep[] = [
  {
    id: "demo",
    label: "Загрузка демо-отчёта",
    detail: "285 антигенов из эталонного FOX Food Xplorer",
  },
  ...REPORT_PROCESSING_STEPS.slice(2),
];

/** Advance steps while waiting for the server; cap before the last step. */
export function nextProcessingStepIndex(current: number, total: number): number {
  return Math.min(current + 1, total - 2);
}
