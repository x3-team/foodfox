import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-fox-muted">Загрузка…</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
