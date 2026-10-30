// usage: node audit.mjs base out.json widths
import { chromium } from "../../../apps/site/node_modules/playwright/index.mjs";
import fs from "fs";
const base = process.argv[2], out = process.argv[3];
const widths = (process.argv[4] || "1440,390").split(",").map(Number);
const PAGES = (process.env.ONLY ? process.env.ONLY.split(",") : ["/", "/specialists", "/report", "/course", "/course/lessons", "/labs", "/blog", "/blog/pervye-priznaki-pishchevoy-neperenosimosti", "/blog/authors", "/blog/authors/kseniya-ellinskaya", "/faq", "/certificates", "/reviews", "/contacts", "/privacy", "/nope-404"]);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const res = {};
for (const w of widths) {
  const mobile = w < 768;
  const ctx = await b.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => localStorage.setItem("fox-cookie", JSON.stringify({ necessary: true, analytics: false, ads: false })));
  for (const p of PAGES) {
    const page = await ctx.newPage();
    await page.goto(base + p, { waitUntil: "networkidle" }).catch(() => {});
    // scroll through to trigger reveal
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise(r => setTimeout(r, 60)); } window.scrollTo({ top: 0, behavior: "instant" }); });
    await page.waitForTimeout(400);
    const r = await page.evaluate((w) => {
      const FS = [12,14,16,20,24,32,40,56,64];
      const PAIR = {12:16,14:18,16:20,18:28,20:24,24:28,32:36,40:44,56:60,64:68};
      const RAD = [0,4,8,16,24];
      const out = { type: [], radius: [], btn: [], btnw: [], head: [] };
      const vis = el => { const s = getComputedStyle(el); if (s.display === "none" || s.visibility === "hidden") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const path = el => { const parts = []; let e = el; for (let i = 0; e && i < 3; i++, e = e.parentElement) parts.unshift(e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0,2).join(".") : "")); return parts.join(" > "); };
      for (const h of document.querySelectorAll("main h1, main h2")) { if (!vis(h)) continue; const cs = getComputedStyle(h); const r = h.getBoundingClientRect(); out.head.push({ tag: h.tagName, fs: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight), x: Math.round(r.left), txt: h.textContent.trim().slice(0, 28), sec: (h.closest("[data-s]")||{}).dataset?.s }); }
      const seen = new Map();
      const add = (arr, key, o) => { const k = arr + key; if (seen.has(k)) { seen.get(k).n++; return; } o.n = 1; seen.set(k, o); out[arr].push(o); };
      for (const el of document.querySelectorAll("body *")) {
        if (el.closest(".leaflet-container, svg")) continue;
        if (!vis(el)) continue;
        const s = getComputedStyle(el);
        const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (hasText) {
          const fs = parseFloat(s.fontSize); const lh = s.lineHeight === "normal" ? NaN : parseFloat(s.lineHeight);
          const ok = FS.includes(fs) && PAIR[fs] !== undefined && Math.abs(PAIR[fs] - lh) < 0.6 || (fs === 18 && lh === 28);
          if (!ok) add("type", path(el) + fs + "/" + lh, { el: path(el), fs, lh, txt: el.textContent.trim().slice(0, 30) });
        }
        const rad = parseFloat(s.borderTopLeftRadius);
        if (rad && !RAD.includes(rad) && !(s.borderTopLeftRadius.includes("%")) && rad < 400 && rad !== 999) {
          const r = el.getBoundingClientRect();
          if (!(rad >= Math.min(r.width, r.height) / 2 - 1)) add("radius", path(el) + rad, { el: path(el), rad, w: Math.round(r.width), h: Math.round(r.height) });
        }
        if (el.matches(".btn, button.btn, a.btn")) {
          const r = el.getBoundingClientRect();
          if (Math.round(r.height) !== 48 && !el.matches(".btn-text, .ck-text")) add("btn", path(el) + Math.round(r.height), { el: path(el), h: Math.round(r.height), txt: el.textContent.trim().slice(0, 30) });
          if (w < 768 && r.width > 250 && Math.round(r.width) !== 350) add("btnw", path(el) + Math.round(r.width), { el: path(el), w: Math.round(r.width), x: Math.round(r.left), txt: el.textContent.trim().slice(0, 30) });
        }
      }
      return out;
    }, w);
    res[`${w} ${p}`] = r;
    await page.close();
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(out, JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) console.log(k, "type", v.type.length, "rad", v.radius.length, "btn", v.btn.length, "btnw", v.btnw.length);
