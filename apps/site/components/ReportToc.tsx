"use client";

import { useEffect, useState } from "react";

export function ReportToc({ items }: { items: Array<[string, string]> }) {
  const [active, setActive] = useState(items[0]?.[0] ?? "");

  useEffect(() => {
    const nodes = items
      .map(([id]) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.15, 0.4, 0.75] },
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav className="toc" aria-label="Содержание">
      {items.map(([id, title]) => (
        <a key={id} href={`#${id}`} className={active === id ? "is-active" : ""} aria-current={active === id ? "location" : undefined}>
          {title}
        </a>
      ))}
    </nav>
  );
}
