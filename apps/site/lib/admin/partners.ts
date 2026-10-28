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
  lead_id: string | null; created_at: Date; updated_at: Date;
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
