import Link from "next/link";
import { FoxLogo, IconUser } from "./icons";

export function PageHeader({
  title,
  subtitle,
  showAccount = true,
}: {
  title: string;
  subtitle?: string;
  showAccount?: boolean;
}) {
  return (
    <header className="shrink-0 bg-fox-surface px-5 pb-5 pt-12 shadow-card">
      <div className="flex items-start gap-3">
        <FoxLogo className="shrink-0 text-2xl" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-fox-text">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[14px] leading-snug text-fox-muted">{subtitle}</p>
          )}
        </div>
        {showAccount && (
          <Link
            href="/account"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fox-primary-soft text-fox-primary transition hover:bg-fox-primary/15"
            aria-label="Личный кабинет"
          >
            <IconUser className="h-5 w-5" />
          </Link>
        )}
      </div>
    </header>
  );
}
