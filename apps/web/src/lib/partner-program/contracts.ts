/* Contract forms by the partner's tax form (БПИТ12.8: «Трансляция формы договора в соответствии с выбором ЮЛ»).
   The texts below are placeholders until the customer's legal service sends the real ones; a partner who accepted a
   draft keeps its version on the card, so the staff can see who has to re-accept. */

export type LegalForm = "ip" | "sz" | "fl";

export const LEGAL_FORMS: Record<LegalForm, { label: string; short: string; hint: string }> = {
  ip: { label: "Индивидуальный предприниматель", short: "ИП", hint: "Договор оказания услуг с ИП, оплата на расчётный счёт" },
  sz: { label: "Самозанятый", short: "СЗ", hint: "Договор с плательщиком налога на профессиональный доход, вы выдаёте чек в «Мой налог»" },
  fl: { label: "Физическое лицо", short: "ФЛ", hint: "Гражданско-правовой договор, налог (НДФЛ) удерживает и платит компания" },
};

export const isLegalForm = (v: unknown): v is LegalForm => v === "ip" || v === "sz" || v === "fl";

import type { Pool } from "pg";

export const CONTRACT_VERSION = "draft-2026-10";

/* Templates the staff upload in the admin (Страницы → «Договор и акт партнёра», site_content partners.*): a PDF per
   tax form, the act template and the version recorded when a partner accepts. Empty means the draft text below. */
export type ContractSettings = { version: string; pdf: Record<LegalForm, string>; actTemplate: string };

export async function contractSettings(p: Pool): Promise<ContractSettings> {
  const { rows } = await p
    .query<{ key: string; value: unknown }>(`SELECT key, value FROM site_content WHERE key LIKE 'partners.%'`)
    .catch(() => ({ rows: [] as { key: string; value: unknown }[] }));
  const get = (key: string) => {
    const value = rows.find((r) => r.key === key)?.value;
    return typeof value === "string" ? value.trim() : "";
  };
  return {
    version: get("partners.contractVersion") || CONTRACT_VERSION,
    pdf: { ip: get("partners.contractIp"), sz: get("partners.contractSz"), fl: get("partners.contractFl") },
    actTemplate: get("partners.actTemplate"),
  };
}

export function contractFor(
  form: LegalForm,
  settings?: ContractSettings,
): { version: string; title: string; pdf: string; sections: { heading: string; text: string }[] } {
  const party = {
    ip: "индивидуальный предприниматель, действующий на основании свидетельства о регистрации (ОГРНИП)",
    sz: "физическое лицо, применяющее специальный налоговый режим «Налог на профессиональный доход»",
    fl: "физическое лицо, гражданин Российской Федерации",
  }[form];
  const tax = {
    ip: "Исполнитель самостоятельно уплачивает налоги в соответствии с применяемой системой налогообложения.",
    sz: "Исполнитель после получения оплаты формирует чек в приложении «Мой налог» и передаёт его Заказчику. Утрата статуса плательщика НПД Исполнитель сообщает Заказчику в течение 3 рабочих дней.",
    fl: "Заказчик как налоговый агент удерживает НДФЛ из вознаграждения и уплачивает страховые взносы в установленном законом порядке.",
  }[form];
  const title = `Договор партнёра программы FOX Food Xplorer (${LEGAL_FORMS[form].short})`;
  const pdf = settings?.pdf[form] ?? "";
  if (pdf) {
    return {
      version: settings!.version, title, pdf,
      sections: [{ heading: `Редакция ${settings!.version}`, text: "Полный текст договора — в PDF по ссылке ниже. Прочитайте его перед тем, как принять." }],
    };
  }
  return {
    version: settings?.version ?? CONTRACT_VERSION,
    title,
    pdf: "",
    sections: [
      { heading: "Образец", text: "Это черновик для проверки процесса. Действующий текст договора пришлёт юридическая служба АлексЛаб, и вас попросят принять его ещё раз." },
      { heading: "1. Стороны", text: `ООО «АлексЛаб» (Заказчик) и ${party} (Исполнитель), принявший условия настоящего договора в кабинете партнёра или в Telegram-боте программы.` },
      { heading: "2. Предмет", text: "Исполнитель информирует своих клиентов о тесте FOX Food Xplorer. За каждый анализ клиента, который Исполнитель передал Заказчику (фото результата и id кода анализа) и который подтверждён по базе лаборатории, Заказчик выплачивает вознаграждение." },
      { heading: "3. Отчётный период и акт", text: "Отчётный период — календарный месяц. После его окончания Заказчик направляет Исполнителю отчёт о количестве анализов и сумме. Исполнитель подтверждает отчёт или сообщает о расхождении. По подтверждённому отчёту формируется акт выполненных работ, который Исполнитель подписывает и направляет Заказчику скан по электронной почте и оригинал Почтой России." },
      { heading: "4. Оплата", text: `Заказчик оплачивает вознаграждение на банковские реквизиты Исполнителя после получения подписанного акта. ${tax}` },
      { heading: "5. Ограничения", text: "Программа доступна только гражданам Российской Федерации и не предназначена для медицинских работников. Исполнитель не даёт клиентам медицинских рекомендаций от имени Заказчика." },
      { heading: "6. Персональные данные", text: "Исполнитель передаёт Заказчику ФИО, данные паспорта, ИНН, СНИЛС и банковские реквизиты для заключения и исполнения договора. Заказчик хранит их в зашифрованном виде и использует только для расчётов с Исполнителем." },
    ],
  };
}
