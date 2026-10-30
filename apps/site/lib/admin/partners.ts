export const PARTNER_STATUSES = {
  applied: "Анкета",
  approved: "Одобрен",
  certified: "Сертифицирован",
  blocked: "Заблокирован",
  rejected: "Отклонён",
} as const;
export type PartnerStatus = keyof typeof PARTNER_STATUSES;
export const isPartnerStatus = (v: string): v is PartnerStatus => v in PARTNER_STATUSES;

export const REPORT_STATUSES = { credited: "Начислено", review: "На проверке", missing: "Не найден" } as const;
export type ReportStatus = keyof typeof REPORT_STATUSES;

export type Partner = {
  id: string; phone: string; full_name: string; email: string; specialty: string; city: string; status: PartnerStatus;
  promo_code: string | null; certificate_no: string; payout_method: string; fee: number | null; notes: string;
  lead_id: string | null; tariff_id?: string | null; created_at: Date; updated_at: Date;
};

/** Same rule as apps/web/src/lib/otp.ts normalizePhone: 11 digits starting with 7. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return null;
}

export function formatPhone(phone: string): string {
  return phone.length === 11 ? `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}` : phone;
}

const LAT: Record<string, string> = { а: "A", б: "B", в: "V", г: "G", д: "D", е: "E", ё: "E", ж: "ZH", з: "Z", и: "I", й: "Y", к: "K", л: "L", м: "M", н: "N", о: "O", п: "P", р: "R", с: "S", т: "T", у: "U", ф: "F", х: "H", ц: "TS", ч: "CH", ш: "SH", щ: "SCH", ъ: "", ы: "Y", ь: "", э: "E", ю: "YU", я: "YA" };

/** KOVALEVA-24 style: the surname in Latin and two digits. */
export function promoFrom(fullName: string): string {
  const surname = fullName.trim().split(/\s+/)[0] ?? "FOX";
  const latin = [...surname.toLowerCase()].map((c) => LAT[c] ?? (/[a-z0-9]/.test(c) ? c.toUpperCase() : "")).join("").slice(0, 12) || "FOX";
  return `${latin}-${10 + Math.floor(Math.random() * 90)}`;
}

export const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;

/* Partner program by the customer's processes (migration 006). */

export const LEGAL_FORMS = { ip: "ИП", sz: "Самозанятый", fl: "Физлицо" } as const;
export type LegalForm = keyof typeof LEGAL_FORMS;

export const STATEMENT_STATUSES = { sent: "Ждёт партнёра", disputed: "На сверке", confirmed: "Подтверждён", paid: "Оплачен" } as const;
export type StatementStatus = keyof typeof STATEMENT_STATUSES;

export const DOC_KINDS: Record<string, string> = {
  passport_main: "Паспорт, фото", passport_reg: "Паспорт, прописка", snils: "СНИЛС", inn: "ИНН", analysis: "Фото анализа", act_scan: "Скан акта",
};

/** What each queued step means for staff until its adapter (Bitrix24, 1С, mail, Raptor, Telegram) does it. */
export const EVENT_KINDS: Record<string, string> = {
  "crm.partner_created": "Завести партнёра в Битрикс24",
  "mail.accountant_new_partner": "Заявление нового партнёра бухгалтеру",
  "mail.service_contract_copy": "Копия договора специалисту службы — согласовать в 1С:ДО",
  "raptor.verify_code": "Проверить id кода анализа в Raptor",
  "notify.statement_ready": "Сообщить партнёру об отчёте за месяц",
  "mail.act_to_partner_and_service": "Акт партнёру и специалисту службы",
  "service.statement_disputed": "Партнёр не подтвердил отчёт — согласовать",
  "mail.act_scan_to_accountant": "Скан акта бухгалтеру",
  "service.doctor_lead": "Врач хочет в партнёры — связаться",
};

export const monthOf = (period: string) =>
  new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(period)).replace(" г.", "");
