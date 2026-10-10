"use client";

import { ReactNode, useEffect, useRef } from "react";

/**
 * Pinch-zoom for full-screen viewers (M29 documents, M44 report pages): two fingers zoom 1–4×,
 * one finger pans while zoomed, a double tap toggles 1× / 2.5×. At 1× single-finger gestures are left
 * to the parent (swipe down to close, swipe sideways to turn pages) — `onZoomChange` tells it when to back off.
 */
export function ZoomPane({ children, className = "", onZoomChange, resetKey }: { children: ReactNode; className?: string; onZoomChange?: (zoomed: boolean) => void; resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const zoomCb = useRef(onZoomChange);
  zoomCb.current = onZoomChange;
  const st = useRef({ s: 1, x: 0, y: 0 });

  useEffect(() => {
    st.current = { s: 1, x: 0, y: 0 };
    if (layer.current) {
      layer.current.style.transition = "none";
      layer.current.style.transform = "";
    }
    zoomCb.current?.(false);
  }, [resetKey]);

  useEffect(() => {
    const node = box.current;
    const inner = layer.current;
    if (!node || !inner) return;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; s: number; cx: number; cy: number; x: number; y: number } | null = null;
    let pan: { x: number; y: number; ox: number; oy: number } | null = null;
    let lastTap = 0;
    const apply = (animate = false) => {
      const { s, x, y } = st.current;
      inner.style.transition = animate ? "transform 220ms cubic-bezier(.2, .8, .2, 1)" : "none";
      inner.style.transform = s === 1 && !x && !y ? "" : `translate(${x}px, ${y}px) scale(${s})`;
    };
    const clamp = () => {
      const { s } = st.current;
      const w = node.clientWidth;
      const h = node.clientHeight;
      const mx = ((s - 1) * w) / 2;
      const my = ((s - 1) * h) / 2;
      st.current.x = Math.max(-mx, Math.min(mx, st.current.x));
      st.current.y = Math.max(-my, Math.min(my, st.current.y));
    };
    const local = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
    };
    const zoomTo = (s: number, at: { x: number; y: number }) => {
      const cur = st.current;
      const k = s / cur.s;
      // keep the point under the fingers in place
      st.current = { s, x: at.x - (at.x - cur.x) * k, y: at.y - (at.y - cur.y) * k };
      if (s <= 1.01) st.current = { s: 1, x: 0, y: 0 };
      clamp();
    };
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, local(e));
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: st.current.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, x: st.current.x, y: st.current.y };
        pan = null;
        node.setPointerCapture(e.pointerId);
      } else if (pts.size === 1 && st.current.s > 1) {
        const p = local(e);
        pan = { x: p.x, y: p.y, ox: st.current.x, oy: st.current.y };
        node.setPointerCapture(e.pointerId);
      }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, local(e));
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const s = Math.max(1, Math.min(4, (pinch.s * d) / pinch.d));
        st.current = { s: pinch.s, x: pinch.x, y: pinch.y };
        zoomTo(s, { x: pinch.cx, y: pinch.cy });
        apply();
        zoomCb.current?.(st.current.s > 1);
      } else if (pan) {
        const p = local(e);
        st.current.x = pan.ox + p.x - pan.x;
        st.current.y = pan.oy + p.y - pan.y;
        clamp();
        apply();
      }
    };
    const up = (e: PointerEvent) => {
      const wasPinch = Boolean(pinch);
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) pan = null;
      if (wasPinch || !p || e.type === "pointercancel") return;
      const now = performance.now();
      if (now - lastTap < 300) {
        zoomTo(st.current.s > 1 ? 1 : 2.5, p);
        apply(true);
        zoomCb.current?.(st.current.s > 1);
        lastTap = 0;
      } else lastTap = now;
    };
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; // trackpad pinch on desktop
      e.preventDefault();
      const r = node.getBoundingClientRect();
      zoomTo(Math.max(1, Math.min(4, st.current.s * Math.exp(-e.deltaY / 100))), { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 });
      apply();
      zoomCb.current?.(st.current.s > 1);
    };
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    node.addEventListener("wheel", wheel, { passive: false });
    return () => {
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
      node.removeEventListener("wheel", wheel);
    };
  }, []);

  return (
    <div ref={box} className={`zoom-pane ${className}`}>
      <div ref={layer} className="zoom-layer">{children}</div>
    </div>
  );
}
