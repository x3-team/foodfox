// usage: node tops.mjs <base> <outdir> — header contrast + first-screen shots for all 16 pages at 1440 and 390
import { chromium } from "@playwright/test";
const [base, dir] = process.argv.slice(2);
const PAGES = ["/", "/specialists", "/report", "/course", "/course/lessons", "/labs", "/blog", "/blog/skrytaya-neperenosimost-laktozy-i-glyutena", "/blog/authors", "/blog/authors/kseniya-ellinskaya", "/faq", "/certificates", "/reviews", "/contacts", "/privacy", "/no-such-page-404"];
const browser = await chromium.launch();
const problems = [];
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const path of PAGES) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    await c.addInitScript(() => localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false, ads: false })));
    const p = await c.newPage();
    const res = await p.goto(base + path, { waitUntil: "networkidle" }).catch(() => null);
    await p.waitForTimeout(1200);
    const name = (path === "/" ? "home" : path.slice(1).replace(/\//g, "_")) + `-${w}`;
    await p.screenshot({ path: `${dir}/${name}.png`, clip: { x: 0, y: 0, width: w, height: w > 500 ? 520 : 640 } });
    const targets = await p.evaluate(() => {
      const out = [];
      const header = document.querySelector(".site-header");
      if (!header) return [{ missing: true }];
      for (const el of header.querySelectorAll("a, button")) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.1) continue;
        const text = (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 24);
        const bg = cs.backgroundColor.match(/[\d.]+/g).map(Number);
        out.push({ text, x: r.left + r.width / 2, y: r.top + r.height / 2, color: cs.color, own: (bg[3] ?? 1) > 0.5 ? cs.backgroundColor : null, cls: header.className });
      }
      return out;
    });
    if (targets[0]?.missing) { problems.push(`${path} @${w}: no header`); await c.close(); continue; }
    await p.addStyleTag({ content: ".site-header, .site-header * { color: transparent !important; text-shadow: none !important; } .site-header img, .site-header svg, .site-header i { opacity: 0 !important; }" });
    await p.waitForTimeout(100);
    const shot = (await p.screenshot({ clip: { x: 0, y: 0, width: w, height: 140 } })).toString("base64");
    const result = await p.evaluate(async ({ shot, targets }) => {
      const img = new Image();
      img.src = "data:image/png;base64," + shot;
      await img.decode();
      const cv = document.createElement("canvas");
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const parse = (s) => s.match(/[\d.]+/g).map(Number);
      return targets.map((t) => {
        let bg;
        if (t.own) bg = parse(t.own);
        else {
          if (t.y >= img.height) return { ...t, ratio: 99 };
          const d = ctx.getImageData(Math.max(0, Math.round(t.x) - 1), Math.max(0, Math.round(t.y) - 1), 3, 3).data;
          bg = [0, 1, 2].map((k) => (d[k] + d[4 + k] + d[8 + k] + d[12 + k] + d[16 + k] + d[20 + k] + d[24 + k] + d[28 + k] + d[32 + k]) / 9);
        }
        const fg = parse(t.color);
        const a = lum(fg), b = lum(bg);
        return { ...t, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), bg: bg.map(Math.round).join(",") };
      });
    }, { shot, targets });
    for (const r of result) if (r.ratio < 3) problems.push(`${path} @${w}: «${r.text}» ${r.ratio.toFixed(2)} fg ${r.color} bg ${r.bg} [${r.cls}]`);
    if (!res || res.status() >= 500) problems.push(`${path} @${w}: status ${res?.status()}`);
    await c.close();
  }
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "OK: header readable on all pages");
