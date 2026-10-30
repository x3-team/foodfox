"use client";

import { useActionState } from "react";
import { codeAction, type LoginState } from "../../actions";

export function CodeForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(codeAction, {});
  return (
    <form action={action} className="a-form" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && <div className="a-error" role="alert">{state.error}</div>}
      <label className="a-field">
        <span>Код</span>
        <input className="a-input a-code-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={7} placeholder="000 000" required autoFocus />
      </label>
      <button className="a-btn is-block" type="submit" disabled={pending}>
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
