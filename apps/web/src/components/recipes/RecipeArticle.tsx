import type { RecipeStep } from "@/lib/recipes-catalog";

export interface RecipeArticleProps {
  title: string;
  lead?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: number | null;
  tags: string[];
  ingredients?: { name: string; amount: string; zone?: string }[];
  steps: RecipeStep[];
  tips?: string[];
  warnings?: string[];
  badgeLabel: string;
  badgeClassName: string;
  onClose?: () => void;
}

export function RecipeArticle({
  title,
  lead,
  description,
  photoUrl,
  prepTime,
  cookTime,
  servings,
  tags,
  ingredients,
  steps,
  tips,
  warnings,
  badgeLabel,
  badgeClassName,
  onClose,
}: RecipeArticleProps) {
  const intro = lead ?? description;

  return (
    <article className="overflow-hidden bg-fox-surface">
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-fox-primary-soft to-fox-primary-muted/40 sm:h-64">
        <span
          className={`absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${badgeClassName}`}
        >
          {badgeLabel}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-white backdrop-blur-sm"
            aria-label="Закрыть"
          >
            ×
          </button>
        )}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[64px]">🍽️</div>
        )}
      </div>

      <div className="space-y-6 px-5 py-6">
        <header className="space-y-3">
          <h1 className="text-[26px] font-bold leading-tight text-fox-text">{title}</h1>
          {intro && (
            <p className="text-[16px] leading-relaxed text-fox-text/90">{intro}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {prepTime && (
              <span className="rounded-full bg-fox-bg px-3 py-1 text-[13px] font-medium text-fox-muted">
                ⏱ {prepTime}
              </span>
            )}
            {cookTime && (
              <span className="rounded-full bg-fox-bg px-3 py-1 text-[13px] font-medium text-fox-muted">
                🔥 {cookTime}
              </span>
            )}
            {servings != null && (
              <span className="rounded-full bg-fox-bg px-3 py-1 text-[13px] font-medium text-fox-muted">
                🍽 {servings} порции
              </span>
            )}
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-fox-primary-soft px-3 py-1 text-[13px] font-medium text-fox-primary"
              >
                {tag}
              </span>
            ))}
          </div>
          {warnings && warnings.length > 0 && (
            <p className="rounded-xl bg-fox-yellow/15 px-4 py-3 text-[14px] leading-relaxed text-fox-yellow">
              {warnings.join(" · ")}
            </p>
          )}
        </header>

        {ingredients && ingredients.length > 0 && (
          <section>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-fox-muted">
              Ингредиенты
            </h2>
            <ul className="divide-y divide-fox-border rounded-2xl border border-fox-border bg-fox-bg/60">
              {ingredients.map((item) => (
                <li
                  key={item.name}
                  className="flex items-start justify-between gap-4 px-4 py-3 text-[15px]"
                >
                  <span className="text-fox-text">{item.name}</span>
                  <span className="shrink-0 font-medium text-fox-muted">{item.amount}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {steps.length > 0 && (
          <section>
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-fox-muted">
              Приготовление
            </h2>
            <ol className="space-y-8">
              {steps.map((step, index) => (
                <li key={index} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fox-primary text-[14px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="space-y-2 pt-0.5">
                      <h3 className="text-[17px] font-semibold text-fox-text">{step.title}</h3>
                      <p className="text-[15px] leading-relaxed text-fox-text/90">{step.body}</p>
                    </div>
                  </div>
                  {step.imageUrl && (
                    <div className="ml-11 overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={step.imageUrl}
                        alt=""
                        className="h-44 w-full object-cover sm:h-52"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {tips && tips.length > 0 && (
          <section className="rounded-2xl border border-fox-primary/20 bg-fox-primary-soft/40 px-4 py-4">
            <h2 className="mb-2 text-[15px] font-semibold text-fox-primary-dark">
              Советы нутрициолога
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-fox-text">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
