/* Types and formatting the client components share with the server side of the partner program (no database here). */

export type StatementStatus = "sent" | "disputed" | "confirmed" | "paid";

export type Statement = {
  id: string;
  period: string;
  periodLabel: string;
  reports: number;
  amount: number;
  status: StatementStatus;
  disputeNote: string;
  actNo: string;
  scanSent: boolean;
  scanReceived: boolean;
  originalSentAt: string | null;
  originalTrack: string;
  originalReceived: boolean;
  paidAt: string | null;
  actReturned: boolean;
};

export const actNumber = (id: string | number, period: Date | string) => {
  const d = new Date(period);
  return `FOX-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}-${id}`;
};

export const monthLabel = (period: Date | string) =>
  new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(period)).replace(" г.", "");

export const STATEMENT_STATUS: Record<StatementStatus, string> = {
  sent: "Ждёт подтверждения",
  disputed: "На сверке",
  confirmed: "Подтверждён",
  paid: "Оплачен",
};
