"use client";

import { useEffect } from "react";

/**
 * Item-level entrance for the B2B pages (/specialists, /report, /course).
 *
 * Elements marked `data-rv` start hidden (CSS) and get `rv-in` once, when they cross 85% of the viewport
 * (P3 «строки входят при пересечении 85% viewport»). Items that enter in the same frame and share a parent are
 * staggered by the step in `data-rv` (ms), plus an optional `data-rv-base` delay — so a row of cards cascades,
 * while a card scrolled into view later starts at once instead of waiting for its index.
 * Items already above the viewport (anchor jump, reload mid-page) are shown without motion.
 * Reduced motion: everything is shown at once; CSS turns the entrance into a 100 мс fade.
 */
export function useReveal(scope = "") {
  useEffect(() => {
    const pending = () => Array.from(document.querySelectorAll<HTMLElement>(`${scope} [data-rv]:not(.rv-in)`.trim()));
    const show = (el: HTMLElement, delay: number | null) => {
      if (delay === null) el.classList.add("rv-now");
      else el.style.setProperty("--rv-d", `${delay}ms`);
      el.classList.add("rv-in");
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pending().forEach((el) => show(el, 0));
      return;
    }
    let batch: HTMLElement[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      const groups = new Map<Element | null, number>();
      batch
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        .forEach((el) => {
          const key = el.parentElement;
          const index = groups.get(key) ?? 0;
          groups.set(key, index + 1);
          const step = Number(el.dataset.rv) || 0;
          const base = Number(el.dataset.rvBase) || 0;
          show(el, base + index * step);
        });
      batch = [];
      // Anything the visitor has already scrolled past (fast scroll, jump) is shown in place, without motion.
      pending().forEach((el) => {
        if (el.getBoundingClientRect().bottom < 0) { io.unobserve(el); show(el, null); }
      });
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          batch.push(entry.target as HTMLElement);
        });
        if (!frame) frame = window.requestAnimationFrame(flush);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    const observe = () => pending().forEach((el) => {
      if (el.dataset.rvSeen) return;
      el.dataset.rvSeen = "1";
      io.observe(el);
    });
    observe();
    if (!frame) frame = window.requestAnimationFrame(flush);
    // Items rendered later (e.g. «Показать все специальности») join the same observer.
    const mo = new MutationObserver(observe);
    mo.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      pending().forEach((el) => { delete el.dataset.rvSeen; });
    };
  }, [scope]);
}
