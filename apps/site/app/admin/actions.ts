"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/admin/auth";

export type LoginState = { error?: string; email?: string };

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
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/admin/login");
}
