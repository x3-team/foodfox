import { useCallback, useEffect, useState } from "react";

export const LIST_INITIAL = 10;
export const LIST_STEP = 5;

export function useIncrementalList<T>(
  items: T[],
  initial = LIST_INITIAL,
  step = LIST_STEP,
) {
  const [visible, setVisible] = useState(initial);

  useEffect(() => {
    setVisible(initial);
  }, [items, initial]);

  const loadMore = useCallback(() => {
    setVisible((v) => Math.min(v + step, items.length));
  }, [items.length, step]);

  return {
    visibleItems: items.slice(0, visible),
    visibleCount: visible,
    total: items.length,
    hasMore: visible < items.length,
    loadMore,
  };
}
