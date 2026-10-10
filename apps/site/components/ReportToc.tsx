"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function ReportToc({ items }: { items: Array<[string, string]> }) {
  const [active, setActive] = useState(items[0]?.[0] ?? "");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const index = Math.max(0, items.findIndex(([id]) => id === active));
  // S6 (Figma 1138:1306): the lime marker slides to the active item (250 мс).
  const navRef = useRef<HTMLElement>(null);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const link = navRef.current?.querySelector<HTMLAnchorElement>(`a[href="#${active}"]`);
      if (!link || !link.offsetHeight) { setMarker(null); return; }
      setMarker({ top: link.offsetTop + (link.offsetHeight - 20) / 2, height: 20 });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, open]);

  // S6: the active item is the last section whose top has passed 35% of the viewport. (An IntersectionObserver with
  // ratio thresholds never fired for sections taller than the observed band, so the item stayed on «Три зоны».)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current = items[0]?.[0] ?? "";
      for (const [id] of items) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  // The page URL is read after mount: reading window during render made the server and client hrefs differ (hydration error).
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => { setShareUrl(window.location.href); }, []);

  return (
    <nav ref={navRef} className={`toc${open ? " is-open" : ""}`} data-allow-x aria-label="Содержание">
      {marker ? <span className="rf-toc-marker" aria-hidden style={{ transform: `translateY(${marker.top}px)`, height: marker.height }} /> : null}
      <button type="button" className="rf-toc-m m-only" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>
          <small>На этой странице · {index + 1} из {items.length}</small>
          <strong>{items[index]?.[1]}</strong>
        </span>
        <img src="/icons/chevron-down.svg" alt="" width={16} height={16} />
      </button>
      <p className="rf-toc-label">На этой странице</p>
      {items.map(([id, title]) => (
        <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className={active === id ? "is-active" : ""} aria-current={active === id ? "location" : undefined}>
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

export function ShareButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn rf-share-doc"
      onClick={() => {
        const url = window.location.href;
        const nav = navigator as Navigator & { share?: (data: { url: string; title?: string }) => Promise<void> };
        if (nav.share) {
          void nav.share({ url, title: "Как читать отчёт FOX" }).catch(() => {});
        } else {
          void navigator.clipboard?.writeText(url).then(() => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1600);
          });
        }
      }}
    >
      {done ? "Ссылка скопирована" : "Поделиться с врачом"}
      <img src="/figma/icons/plus-dark.svg" alt="" width={24} height={24} />
    </button>
  );
}
