"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="a-form" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && <div className="a-error" role="alert">{state.error}</div>}
      <label className="a-field">
        <span>Почта</span>
        <input className="a-input" name="email" type="email" autoComplete="username" defaultValue={state.email} required autoFocus />
      </label>
      <label className="a-field">
        <span>Пароль</span>
        <input className="a-input" name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="a-btn is-block" type="submit" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
