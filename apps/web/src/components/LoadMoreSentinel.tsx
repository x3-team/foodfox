"use client";

import { useEffect, useRef } from "react";

interface LoadMoreSentinelProps {
  hasMore: boolean;
  onLoadMore: () => void;
  label?: string;
}

export function LoadMoreSentinel({
  hasMore,
  onLoadMore,
  label = "Прокрутите вниз — подгрузим ещё",
}: LoadMoreSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="py-3 text-center text-[13px] text-fox-muted">
      {label}
    </div>
  );
}
