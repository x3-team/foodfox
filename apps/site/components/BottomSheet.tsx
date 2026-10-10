"use client";

import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/components/useDialog";

/**
 * Mobile bottom sheet from the adaptive notes (M08, M20, M26, M29 «закрытие — свайп вниз»):
 * slides up, the scrim goes to 45% in proportion to the visible height, the sheet follows the finger
 * from the grabber (or from the content while it is scrolled to the top) and is released with a spring.
 * `stops` are fractions of the viewport height (M20: 0.5 and 0.92); without stops the sheet is
 * content-sized and a drag down by more than 30% (or a fast flick) closes it.
 */
export function BottomSheet({
  label,
  onClose,
  children,
  className = "",
  duration = 320,
  stops,
  portal = false,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  duration?: number;
  stops?: number[];
  /** Render into <body> — needed when the opener sits in a transformed / fixed parent (the header). */
  portal?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [h, setH] = useState(0); // sheet height, px
  const [vh, setVh] = useState(0);
  const [ty, setTy] = useState<number | null>(null); // translateY, px; null until measured
  const [anim, setAnim] = useState<"spring" | "close" | "none" | "open">("open");
  const drag = useRef<{ y: number; t: number; ty: number; v: number; last: number } | null>(null);
  const closing = useRef(false);

  const restFor = useCallback((stop: number, height: number, viewport: number) => Math.max(0, height - stop * viewport), []);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setAnim("close");
    setTy(ref.current?.offsetHeight ?? 1000);
    window.setTimeout(() => closeRef.current(), 240);
  }, []);
  useDialog(ref, close);

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const viewport = window.innerHeight;
    setH(height);
    setVh(viewport);
    setTy(stops ? restFor(stops[0], height, viewport) : 0);
  }, [stops, restFor]);

  useEffect(() => {
    if (anim !== "open") return;
    const id = window.setTimeout(() => setAnim("none"), duration);
    return () => window.clearTimeout(id);
  }, [anim, duration]);

  const start = (y: number) => {
    if (closing.current || ty === null) return;
    drag.current = { y, t: performance.now(), ty, v: 0, last: y };
    setAnim("none");
  };
  const move = (y: number) => {
    const state = drag.current;
    if (!state) return;
    const now = performance.now();
    state.v = (y - state.last) / Math.max(1, now - state.t);
    state.last = y;
    state.t = now;
    const next = state.ty + y - state.y;
    // Above the top stop the sheet resists (rubber band) instead of detaching from the bottom edge.
    setTy(next < 0 ? next / 4 : next);
  };
  const end = () => {
    const state = drag.current;
    drag.current = null;
    if (!state || ty === null) return;
    const height = ref.current?.offsetHeight ?? h;
    if (!stops) {
      if (ty > height * 0.3 || state.v > 0.6) close();
      else {
        setAnim("spring");
        setTy(0);
      }
      return;
    }
    const rests = stops.map((stop) => restFor(stop, height, vh));
    const lowest = Math.max(...rests);
    if (ty > lowest + height * 0.15 || (state.v > 0.6 && ty > lowest - 8)) {
      close();
      return;
    }
    // A flick picks the next stop in its direction; a slow release snaps to the nearest one.
    const sorted = [...rests].sort((a, b) => a - b);
    let target = sorted.reduce((best, rest) => (Math.abs(rest - ty) < Math.abs(best - ty) ? rest : best), sorted[0]);
    if (state.v < -0.4) target = sorted.filter((rest) => rest < ty).pop() ?? sorted[0];
    else if (state.v > 0.4) target = sorted.find((rest) => rest > ty) ?? lowest;
    setAnim("spring");
    setTy(target);
  };

  const visible = ty === null ? 0 : Math.max(0, h - ty);
  const full = stops ? Math.max(...stops) * vh : h;
  const scrim = anim === "open" ? undefined : 0.45 * Math.min(1, full ? visible / full : 1);
  const transition =
    anim === "spring" ? "transform 420ms cubic-bezier(.34, 1.26, .64, 1)" : anim === "close" ? "transform 240ms cubic-bezier(.4, 0, 1, 1)" : "none";

  const sheet = (
    <div
      className={`bs-back${anim === "close" ? " is-closing" : ""}`}
      style={{ "--bs-scrim": scrim, "--bs-ms": `${duration}ms` } as React.CSSProperties}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`bs ${anim === "open" ? "is-opening" : ""} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{
          height: stops ? `${Math.max(...stops) * 100}vh` : undefined,
          transform: anim === "open" || ty === null ? undefined : `translateY(${ty}px)`,
          transition,
          ...(anim === "open" && stops && ty !== null ? ({ "--bs-rest": `${ty}px` } as React.CSSProperties) : {}),
        }}
        onTouchStart={(event) => {
          const target = event.target as HTMLElement;
          const scroller = target.closest<HTMLElement>(".bs-scroll");
          if (target.closest(".bs-grab") || !scroller || scroller.scrollTop <= 0) {
            (event.currentTarget as HTMLElement).dataset.dragFrom = String(event.touches[0].clientY);
          }
        }}
        onTouchMove={(event) => {
          const node = event.currentTarget as HTMLElement;
          const from = node.dataset.dragFrom;
          if (from === undefined) return;
          const y = event.touches[0].clientY;
          const target = event.target as HTMLElement;
          const scroller = target.closest<HTMLElement>(".bs-scroll");
          if (!drag.current) {
            const dy = y - Number(from);
            // Content drags the sheet only downwards from the top, or upwards towards the next stop.
            const canUp = stops && ty !== null && ty > 0.5;
            if (Math.abs(dy) < 6) return;
            if (dy < 0 && !canUp && !target.closest(".bs-grab")) {
              delete node.dataset.dragFrom;
              return;
            }
            if (scroller && scroller.scrollTop > 0) {
              delete node.dataset.dragFrom;
              return;
            }
            start(Number(from));
          }
          move(y);
        }}
        onTouchEnd={(event) => {
          delete (event.currentTarget as HTMLElement).dataset.dragFrom;
          end();
        }}
      >
        <span
          className="bs-grab"
          aria-hidden
          onPointerDown={(event) => {
            if (event.pointerType === "touch") return;
            event.currentTarget.setPointerCapture(event.pointerId);
            start(event.clientY);
          }}
          onPointerMove={(event) => {
            if (event.pointerType !== "touch") move(event.clientY);
          }}
          onPointerUp={(event) => {
            if (event.pointerType !== "touch") end();
          }}
        />
        {children}
      </div>
    </div>
  );
  return portal ? createPortal(sheet, document.body) : sheet;
}
