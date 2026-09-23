"use client";

import { LIST_INITIAL, LIST_STEP, useIncrementalList } from "@/lib/list-pagination";
import { LoadMoreSentinel } from "./LoadMoreSentinel";

interface PaginatedStringListProps {
  items: string[];
  initial?: number;
  step?: number;
  emptyLabel?: string;
  className?: string;
}

export function PaginatedStringList({
  items,
  initial = LIST_INITIAL,
  step = LIST_STEP,
  emptyLabel = "—",
  className = "",
}: PaginatedStringListProps) {
  const { visibleItems, hasMore, loadMore, total, visibleCount } = useIncrementalList(
    items,
    initial,
    step,
  );

  if (items.length === 0) {
    return <p className={`text-[14px] text-fox-text ${className}`}>{emptyLabel}</p>;
  }

  return (
    <div className={className}>
      <ul className="space-y-1.5">
        {visibleItems.map((item) => (
          <li key={item} className="text-[14px] leading-relaxed text-fox-text">
            {item}
          </li>
        ))}
      </ul>
      {total > initial && (
        <p className="mt-2 text-[12px] text-fox-muted">
          Показано {visibleCount} из {total}
        </p>
      )}
      <LoadMoreSentinel hasMore={hasMore} onLoadMore={loadMore} />
    </div>
  );
}
