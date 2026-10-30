"use server";

import { redirect } from "next/navigation";
import { signIn, signInCode, signOut } from "@/lib/admin/auth";

export type LoginState = { error?: string; email?: string };

const safeNext = (next: string) => (next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email.trim() || !password) return { error: "Введите почту и пароль", email };
  let result;
  try {
    result = await signIn(email, password);
  } catch (error) {
    console.error("[admin] login failed", error);
    return { error: "База данных недоступна. Попробуйте позже", email };
  }
  if (!result.ok) return { error: result.error, email };
  const next = safeNext(String(form.get("next") ?? ""));
  if (result.mfa) redirect(`/admin/login/code?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function codeAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const code = String(form.get("code") ?? "");
  if (!/^\s*\d{3}\s?\d{3}\s*$/.test(code)) return { error: "Введите 6 цифр из приложения" };
  let result;
  try {
    result = await signInCode(code);
  } catch (error) {
    console.error("[admin] 2fa failed", error);
    return { error: "База данных недоступна. Попробуйте позже" };
  }
  if (!result.ok) return { error: result.error };
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/admin/login");
}
