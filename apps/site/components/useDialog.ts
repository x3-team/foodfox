"use client";

import { RefObject, useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog behaviour from Figma «07 · Глобальные состояния» (G06, G08, G10):
 * focus moves inside on open (first field), Tab is trapped, Esc closes,
 * the page behind does not scroll, focus returns to the opener on close.
 */
export function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lock(1);
    // K08 / G10: windows leave in reverse (opacity + scale 1→.98, scrim 50%→0, 200 мс; phone sheets slide down).
    // The window unmounts at once, so on unmount a static copy of it plays the exit (see leave()).
    const back = node?.closest<HTMLElement>(".modal-back") ?? null;
    let scrolled = 0;
    const onInnerScroll = (event: Event) => {
      if (event.target === node) scrolled = node?.scrollTop ?? 0;
    };
    node?.addEventListener("scroll", onInnerScroll, { passive: true });
    const first =
      node?.querySelector<HTMLElement>("[data-autofocus]") ??
      node?.querySelector<HTMLElement>("input:not([type=checkbox]):not([type=radio]), textarea") ??
      node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null || item === document.activeElement);
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === firstItem || !node.contains(document.activeElement))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (document.activeElement === lastItem || !node.contains(document.activeElement))) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      node?.removeEventListener("scroll", onInnerScroll);
      if (back && !back.isConnected) leave(back, scrolled);
      lock(-1);
      document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
    // onClose is intentionally read once per open; callers pass stable handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/**
 * Scroll lock flag for the page: html.is-locked while any window / sheet / the menu is open. The header reads it and
 * does not react to scrolling meanwhile (G10: opening «Связаться» at the top must not shrink or hide it).
 */
let locks = 0;
function lock(delta: number) {
  locks = Math.max(0, locks + delta);
  document.documentElement.classList.toggle("is-locked", locks > 0);
}

/** Exit of a window that has already been removed: an inert copy plays `.is-leaving` (200 мс) and removes itself. */
function leave(back: HTMLElement, scrollTop: number) {
  const ghost = back.cloneNode(true) as HTMLElement;
  ghost.classList.add("is-leaving");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  for (const item of [ghost, ...ghost.querySelectorAll<HTMLElement>("[id], [role], [aria-modal], [name], [data-autofocus]")]) {
    item.removeAttribute("id");
    item.removeAttribute("role");
    item.removeAttribute("aria-modal");
    item.removeAttribute("name");
    item.removeAttribute("data-autofocus");
  }
  document.body.appendChild(ghost);
  const box = ghost.querySelector<HTMLElement>(".modal");
  if (box && scrollTop) box.scrollTop = scrollTop;
  let done = false;
  const remove = () => {
    if (done) return;
    done = true;
    ghost.remove();
  };
  ghost.addEventListener("animationend", (event) => {
    if (event.target === ghost) remove();
  });
  window.setTimeout(remove, 400);
}

/** Wait at least `ms` so a spinner never flashes (G11: «минимальное время спиннера 600мс»). */
export function atLeast<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.all([promise, new Promise((resolve) => window.setTimeout(resolve, ms))]).then(([value]) => value);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
