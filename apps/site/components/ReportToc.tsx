"use client";

import { useEffect, useState } from "react";

export function ReportToc({ items }: { items: Array<[string, string]> }) {
  const [active, setActive] = useState(items[0]?.[0] ?? "");
  const [copied, setCopied] = useState(false);

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

  const shareUrl = typeof window !== "undefined" ? window.location.href : "https://foodfox.example/report";

  return (
    <nav className="toc" aria-label="Содержание">
      <p className="rf-toc-label">На этой странице</p>
      {items.map(([id, title]) => (
        <a key={id} href={`#${id}`} className={active === id ? "is-active" : ""} aria-current={active === id ? "location" : undefined}>
          {title}
        </a>
      ))}
      <div className="rf-share">
        <p>Поделиться с пациентом</p>
        <div className="rf-share-row">
          <a className="rf-icon-btn" href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`} aria-label="Поделиться в Telegram" target="_blank" rel="noreferrer">
            <img src="/figma/icons/share-1.svg" alt="" width={16} height={16} />
          </a>
          <a className="rf-icon-btn" href={`https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}`} aria-label="Поделиться во ВКонтакте" target="_blank" rel="noreferrer">
            <img src="/figma/icons/share-2.svg" alt="" width={16} height={16} />
          </a>
          <button
            type="button"
            className="rf-icon-btn"
            aria-label="Скопировать ссылку"
            onClick={() => {
              const url = window.location.href;
              void navigator.clipboard?.writeText(url).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              });
            }}
          >
            <img src="/figma/icons/copy.svg" alt="" width={16} height={16} />
            {copied ? <span className="rf-copied">Скопировано</span> : null}
          </button>
        </div>
      </div>
    </nav>
  );
}
