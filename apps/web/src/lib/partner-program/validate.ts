/* Checks for the partner's personal data. Each returns the normalized value or throws a message for the form. */

const digits = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");
export const text = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

export function fullName(v: unknown): string {
  const name = text(v, 160);
  if (name.split(" ").filter(Boolean).length < 2) throw new Error("Укажите фамилию, имя и отчество, если есть");
  if (!/^[А-Яа-яЁё\- ]+$/.test(name)) throw new Error("ФИО — русскими буквами, как в паспорте");
  return name;
}

export function email(v: unknown): string {
  const value = text(v, 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) throw new Error("Укажите почту: на неё придёт акт выполненных работ");
  return value;
}

/** Серия и номер паспорта РФ: 10 цифр, хранится как «1234 567890». */
export function passport(v: unknown): string {
  const d = digits(v);
  if (d.length !== 10) throw new Error("Серия и номер паспорта — 10 цифр");
  return `${d.slice(0, 4)} ${d.slice(4)}`;
}

/** ИНН физического лица (12 цифр) с проверкой контрольных разрядов. */
export function innPerson(v: unknown): string {
  const d = digits(v);
  if (d.length !== 12) throw new Error("ИНН — 12 цифр");
  const n = d.split("").map(Number);
  const check = (weights: number[]) => (weights.reduce((s, w, i) => s + w * n[i], 0) % 11) % 10;
  if (check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) !== n[10] || check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) !== n[11]) {
    throw new Error("ИНН не проходит проверку — проверьте цифры");
  }
  return d;
}

export function bik(v: unknown): string {
  const d = digits(v);
  if (d.length !== 9 || !d.startsWith("04")) throw new Error("БИК — 9 цифр, начинается с 04");
  return d;
}

/** Расчётный счёт с проверкой ключа по БИК (алгоритм ЦБ для счетов в кредитных организациях). */
export function account(v: unknown, bikValue: string): string {
  const d = digits(v);
  if (d.length !== 20) throw new Error("Номер счёта — 20 цифр");
  const s = bikValue.slice(-3) + d;
  const weights = [7, 1, 3];
  const sum = s.split("").reduce((acc, c, i) => acc + ((Number(c) * weights[i % 3]) % 10), 0);
  if (sum % 10 !== 0) throw new Error("Номер счёта не сходится с БИК — проверьте цифры");
  return d;
}

export function postal(v: unknown): string {
  const value = text(v, 300);
  if (value.length < 10) throw new Error("Укажите почтовый адрес с индексом: на него придёт ваш экземпляр акта");
  return value;
}

export const mask = (value: string, keep = 4) => (value.length > keep ? `•••• ${value.slice(-keep)}` : "••••");
