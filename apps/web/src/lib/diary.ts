/**
 * Symptom diary (app screen 14): the shapes, the input rules and the link to
 * the client's FOX zones. Storage is in diary-store.ts; nothing here touches
 * the database, so scripts/diary.test.ts can run it directly.
 */

export const WELLBEING = ["bad", "so_so", "good"] as const;
export type Wellbeing = (typeof WELLBEING)[number];

/** The five symptoms of the Figma screen, in its order. */
export const SYMPTOMS = ["bloating", "skin", "energy", "sleep", "gut"] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export type Zone = "green" | "yellow" | "red";

/** Days back an entry can still be added or changed. */
export const DIARY_EDIT_WINDOW_DAYS = 30;
/** Days of history the app asks for by default (a calendar month and a bit). */
export const DIARY_DEFAULT_DAYS = 62;
export const DIARY_MAX_DAYS = 120;

export const NOTE_MAX = 500;
export const FOODS_MAX = 20;
export const FOOD_NAME_MAX = 60;

export interface DiaryFood {
  name: string;
  /** Zone from the client's own report, or null when the food is not in it. */
  zone: Zone | null;
}

/** Everything in here is health data and is stored encrypted. */
export interface DiaryPayload {
  wellbeing: Wellbeing;
  symptoms: Symptom[];
  note: string | null;
  foods: DiaryFood[];
}

export interface DiaryEntryDto extends DiaryPayload {
  date: string;
  weekNumber: number | null;
  phase: string | null;
  updatedAt: string;
}

export interface DiaryInput {
  date: string;
  wellbeing: Wellbeing;
  symptoms: Symptom[];
  note: string | null;
  foods: string[];
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && isoDate(d) === value;
}

/**
 * The app sends the client's local date. Moscow is ahead of the server's UTC
 * day for three hours after midnight, so "today" may be one day past [today].
 */
export function checkEntryDate(date: unknown, today: string): Parsed<string> {
  if (!isValidDate(date)) return { ok: false, error: "Неверная дата" };
  if (date > addDays(today, 1)) {
    return { ok: false, error: "Запись на будущий день не сохраняется" };
  }
  if (date < addDays(today, -DIARY_EDIT_WINDOW_DAYS)) {
    return {
      ok: false,
      error: `Запись можно добавить или изменить в течение ${DIARY_EDIT_WINDOW_DAYS} дней`,
    };
  }
  return { ok: true, value: date };
}

function cleanText(value: string): string {
  // Control characters out, runs of spaces collapsed, newlines kept for notes.
  return value
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseDiaryInput(body: unknown, today: string): Parsed<DiaryInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "Пустой запрос" };
  const b = body as Record<string, unknown>;

  const date = checkEntryDate(b.date, today);
  if (!date.ok) return date;

  if (!WELLBEING.includes(b.wellbeing as Wellbeing)) {
    return { ok: false, error: "Выберите самочувствие" };
  }

  const rawSymptoms = b.symptoms ?? [];
  if (!Array.isArray(rawSymptoms)) return { ok: false, error: "Неверный список симптомов" };
  for (const s of rawSymptoms) {
    if (!SYMPTOMS.includes(s as Symptom)) {
      return { ok: false, error: "Неизвестный симптом" };
    }
  }
  // Stable order and no repeats, whatever the app sent.
  const symptoms = SYMPTOMS.filter((s) => rawSymptoms.includes(s));

  let note: string | null = null;
  if (b.note != null) {
    if (typeof b.note !== "string") return { ok: false, error: "Неверная заметка" };
    const cleaned = cleanText(b.note);
    if (cleaned.length > NOTE_MAX) {
      return { ok: false, error: `Заметка длиннее ${NOTE_MAX} символов` };
    }
    note = cleaned || null;
  }

  const rawFoods = b.foods ?? [];
  if (!Array.isArray(rawFoods)) return { ok: false, error: "Неверный список продуктов" };
  const foods: string[] = [];
  const seen = new Set<string>();
  for (const f of rawFoods) {
    if (typeof f !== "string") return { ok: false, error: "Неверный список продуктов" };
    const name = cleanText(f).replace(/\n/g, " ");
    if (!name) continue;
    if (name.length > FOOD_NAME_MAX) {
      return { ok: false, error: `Название продукта длиннее ${FOOD_NAME_MAX} символов` };
    }
    const key = normalizeFood(name);
    if (seen.has(key)) continue;
    seen.add(key);
    foods.push(name);
  }
  if (foods.length > FOODS_MAX) {
    return { ok: false, error: `Не больше ${FOODS_MAX} продуктов в записи` };
  }

  return {
    ok: true,
    value: { date: date.value, wellbeing: b.wellbeing as Wellbeing, symptoms, note, foods },
  };
}

export function normalizeFood(name: string): string {
  return name.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/**
 * Ties each food to the client's own zone from the FOX report. Only exact
 * names count (case and ё aside): a guess like «сыр» → «Сыр козий» would put
 * a wrong zone next to a symptom, which is worse than none.
 */
export function annotateFoods(
  names: string[],
  results: { foxName: string; zone: Zone }[],
): DiaryFood[] {
  const zones = new Map<string, Zone>();
  for (const r of results) zones.set(normalizeFood(r.foxName), r.zone);
  return names.map((name) => ({ name, zone: zones.get(normalizeFood(name)) ?? null }));
}

/** Keeps decrypted rows honest if an older payload misses a field. */
export function normalizePayload(raw: Partial<DiaryPayload>): DiaryPayload {
  return {
    wellbeing: WELLBEING.includes(raw.wellbeing as Wellbeing)
      ? (raw.wellbeing as Wellbeing)
      : "so_so",
    symptoms: SYMPTOMS.filter((s) => raw.symptoms?.includes(s)),
    note: typeof raw.note === "string" && raw.note ? raw.note : null,
    foods: Array.isArray(raw.foods) ? raw.foods : [],
  };
}

/** What the row's ciphertext is bound to (see health-crypto.ts). */
export function diaryAad(clientId: string, date: string): string {
  return `diary:${clientId}:${date}`;
}

export const DIARY_REMINDER_TEXT =
  "Как вы сегодня? Отметьте самочувствие в дневнике — это пара касаний. " +
  "По записям видно, как план влияет на вас.";
