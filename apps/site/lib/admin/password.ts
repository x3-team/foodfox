import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Same salt:hash scrypt format as apps/web/src/lib/auth.ts.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function passwordProblem(password: string): string {
  if (password.length < 10) return "Пароль — не короче 10 символов";
  if (!/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) return "Нужны буквы и цифры";
  return "";
}
