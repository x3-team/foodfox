export type RecipeZoneBadge = "allGreen" | "suitable" | "unsuitable";

const BADGE: Record<RecipeZoneBadge, { label: string; className: string }> = {
  allGreen: {
    label: "100% зелёная зона",
    className: "bg-fox-primary text-white",
  },
  suitable: {
    label: "Подходит с учётом ротации",
    className: "bg-fox-yellow/20 text-fox-yellow",
  },
  unsuitable: {
    label: "Есть красная зона",
    className: "bg-red-100 text-fox-red",
  },
};

interface RecipeCardMediaProps {
  badge: RecipeZoneBadge;
  photoUrl?: string | null;
  title: string;
}

export function recipeZoneBadge(recipe: {
  allGreen?: boolean;
  suitable?: boolean;
}): RecipeZoneBadge {
  if (recipe.allGreen) return "allGreen";
  if (recipe.suitable !== false) return "suitable";
  return "unsuitable";
}

export function recipeZoneBadgeMeta(recipe: {
  allGreen?: boolean;
  suitable?: boolean;
}): { label: string; className: string } {
  return BADGE[recipeZoneBadge(recipe)];
}

export function RecipeCardMedia({ badge, photoUrl, title }: RecipeCardMediaProps) {
  const { label, className } = BADGE[badge];

  return (
    <div className="relative h-32 overflow-hidden bg-gradient-to-br from-fox-primary-soft to-fox-primary-muted/40">
      <span
        className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[11px] font-semibold leading-tight shadow-sm ${className}`}
      >
        {label}
      </span>
      <div className="flex h-full w-full items-center justify-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <RecipePlaceholderArt title={title} />
        )}
      </div>
    </div>
  );
}

function RecipePlaceholderArt({ title }: { title: string }) {
  const emoji = pickRecipeEmoji(title);
  return (
    <span className="text-[52px] leading-none" aria-hidden>
      {emoji}
    </span>
  );
}

function pickRecipeEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/салат|зелен|шпинат|капуст/.test(t)) return "🥗";
  if (/суп|бульон/.test(t)) return "🍲";
  if (/рыб|лосос|треск/.test(t)) return "🐟";
  if (/куриц|индейк|мяс/.test(t)) return "🍗";
  if (/гречк|рис|каша|овсян/.test(t)) return "🥣";
  if (/кабач|цукк|овощ|запек/.test(t)) return "🥒";
  return "🍽️";
}
