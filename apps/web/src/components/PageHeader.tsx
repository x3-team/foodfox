import { FoxLogo } from "./icons";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="shrink-0 bg-fox-surface px-5 pb-5 pt-12 shadow-card">
      <div className="flex items-start gap-3">
        <FoxLogo className="h-10 w-10 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-fox-text">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[14px] leading-snug text-fox-muted">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
