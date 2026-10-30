const TZ = "Europe/Moscow";

export function dateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function dateShort(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(value));
}

/** "5 минут назад" for the last day, the date after that. */
export function ago(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${plural(h, "час", "часа", "часов")} назад`;
  return dateTime(value);
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function moscowDay(value: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(value));
}
