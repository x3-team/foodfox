import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaff, pendingStaff } from "@/lib/admin/auth";
import { CodeForm } from "./CodeForm";

export const metadata: Metadata = { title: "Код входа" };
export const dynamic = "force-dynamic";

export default async function CodePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentStaff()) redirect("/admin");
  const pending = await pendingStaff();
  if (!pending) redirect("/admin/login");
  const { next = "" } = await searchParams;
  return (
    <div className="a-login">
      <div className="a-login-art" style={{ backgroundImage: "url(/figma/home/hero-desktop.webp)" }}>
        <img className="logo" src="/icons/logo-light.svg" alt="FOX Food Xplorer" />
        <h2>
          Второй шаг защищает <em>данные</em> клиентов
        </h2>
      </div>
      <div className="a-login-form">
        <div>
          <h1>Код из приложения</h1>
          <p className="muted">Откройте приложение-аутентификатор и введите 6 цифр для {pending.email}</p>
          <CodeForm next={next} />
          <p className="muted" style={{ marginTop: 24, fontSize: 14 }}>
            Нет доступа к телефону? Попросите администратора сбросить двухфакторный вход. <Link className="a-link" href="/admin/login">Другая почта</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
