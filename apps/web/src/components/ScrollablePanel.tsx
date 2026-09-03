import type { ReactNode } from "react";

/** Approximate row height (card + gap) for viewport sizing. */
export const LIST_ROW_HEIGHT_PX = 68;
export const LIST_VISIBLE_ROWS = 10;

export function scrollListMaxHeightPx(visibleRows = LIST_VISIBLE_ROWS): number {
  return visibleRows * LIST_ROW_HEIGHT_PX + (visibleRows - 1) * 8;
}

interface ScrollablePanelProps {
  itemCount: number;
  maxHeightPx?: number;
  children: ReactNode;
  className?: string;
}

/** Fixed-height panel — ~10 rows visible, scroll inside for the rest. */
export function ScrollablePanel({
  itemCount,
  maxHeightPx = scrollListMaxHeightPx(),
  children,
  className = "",
}: ScrollablePanelProps) {
  const scrollable = itemCount > LIST_VISIBLE_ROWS;

  return (
    <div className={`relative ${className}`}>
      {scrollable && (
        <p className="mb-2 px-0.5 text-[12px] text-fox-muted">
          {itemCount} {itemCount === 1 ? "продукт" : itemCount < 5 ? "продукта" : "продуктов"} ·
          прокрутите список ↓
        </p>
      )}
      <div
        className={`relative overflow-hidden rounded-2xl border border-fox-border/70 bg-fox-surface/50 ${
          scrollable ? "shadow-inner" : ""
        }`}
      >
        <div
          className={`overflow-y-auto overscroll-contain px-1 py-1 ${
            scrollable ? "[scrollbar-width:thin]" : ""
          }`}
          style={{ maxHeight: scrollable ? maxHeightPx : undefined }}
        >
          {children}
        </div>
        {scrollable && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-2xl bg-gradient-to-t from-fox-surface to-transparent"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
