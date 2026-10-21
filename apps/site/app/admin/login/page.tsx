import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/admin/auth";
import { hasDatabase } from "@/lib/admin/db";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (hasDatabase() && (await currentStaff())) redirect("/admin");
  const { next = "" } = await searchParams;
  return (
    <div className="a-login">
      <div className="a-login-art" style={{ backgroundImage: "url(/figma/home/hero-desktop.webp)" }}>
        <img className="logo" src="/icons/logo-light.svg" alt="FOX Food Xplorer" />
        <h2>
          Заявки, контент и партнёры <em>FOX</em> в одном месте
        </h2>
      </div>
      <div className="a-login-form">
        <div>
          <h1>Вход в админку</h1>
          <p className="muted">Для администраторов и менеджеров сайта</p>
          {hasDatabase() ? (
            <LoginForm next={next} />
          ) : (
            <div className="a-note">База данных не подключена: на сервере не задан DATABASE_URL.</div>
          )}
        </div>
      </div>
    </div>
  );
}
