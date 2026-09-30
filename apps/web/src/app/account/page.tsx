"use client";

import { withBasePath } from "@/lib/base-path";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";

interface Profile {
  email: string;
  displayName: string;
  hasReport: boolean;
  parsedCount: number;
  planStartedAt: string | null;
  currentWeek: number;
  hasPdf?: boolean;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBasePath("/api/auth/me"))
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login?next=/account");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setProfile({
            email: d.user.email,
            displayName: d.user.displayName,
            ...d.profile,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
    router.replace("/login");
  };

  return (
    <AppShell>
      <PageHeader title="Кабинет" subtitle="Ваш профиль и статус плана" showAccount={false} />
      <main className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-6">
        {loading && (
          <p className="text-center text-[14px] text-fox-muted">Загрузка…</p>
        )}

        {profile && (
          <>
            <div className="fox-card space-y-4 px-5 py-5">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wide text-fox-muted">
                  Имя
                </p>
                <p className="mt-1 text-[18px] font-semibold text-fox-text">
                  {profile.displayName}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wide text-fox-muted">
                  Email
                </p>
                <p className="mt-1 text-[15px] text-fox-text">{profile.email}</p>
              </div>
            </div>

            <div className="fox-card space-y-3 px-5 py-5">
              <h2 className="text-[15px] font-semibold text-fox-text">Статус FOX</h2>
              {profile.hasReport ? (
                <ul className="space-y-2 text-[14px] text-fox-muted">
                  <li>Отчёт разобран: {profile.parsedCount} антигенов</li>
                  <li>
                    План с {profile.planStartedAt ?? "—"}, сейчас неделя{" "}
                    <strong className="text-fox-text">{profile.currentWeek}</strong> из 8
                  </li>
                  {profile.hasPdf ? (
                    <li>
                      <a
                        href={withBasePath("/api/reports/pdf")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-fox-primary underline"
                      >
                        Скачать оригинал PDF FOX
                      </a>
                    </li>
                  ) : (
                    <li className="text-[13px]">PDF сохранится при следующей загрузке отчёта</li>
                  )}
                </ul>
              ) : (
                <p className="text-[14px] leading-relaxed text-fox-muted">
                  Отчёт ещё не загружен. Загрузите PDF FOX, чтобы создать персональный план.
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {!profile.hasReport && (
                  <Link href="/upload" className="fox-btn-primary inline-block px-4 py-2 text-[14px]">
                    Загрузить отчёт
                  </Link>
                )}
                {profile.hasReport && (
                  <>
                    <Link
                      href="/plan"
                      className="rounded-xl bg-fox-primary-soft px-4 py-2 text-[14px] font-semibold text-fox-primary"
                    >
                      Открыть план
                    </Link>
                    <Link
                      href="/chat"
                      className="rounded-xl bg-fox-primary-soft px-4 py-2 text-[14px] font-semibold text-fox-primary"
                    >
                      Чат с ботом
                    </Link>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-auto w-full rounded-xl border border-fox-border bg-fox-surface py-3.5 text-[15px] font-semibold text-fox-red transition hover:bg-red-50"
            >
              Выйти
            </button>
          </>
        )}
      </main>
    </AppShell>
  );
}
