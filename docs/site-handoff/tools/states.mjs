// State/motion probe for foodfox site. node states.mjs <base> <outdir>
import { chromium } from "../../../apps/site/node_modules/playwright/index.mjs";
import fs from "fs";
const [base = "http://localhost:3217", out = "/workspace/foodfox-hero/states"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const R = {};
const log = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 400)); };
const wait = (pg, ms) => pg.waitForTimeout(ms);
const css = (pg, sel, props) => pg.evaluate(([s, p]) => { const e = document.querySelector(s); if (!e) return null; const c = getComputedStyle(e); return Object.fromEntries(p.map((k) => [k, c[k]])); }, [sel, props]);
async function check(name, fn) { try { await fn(); } catch (e) { log(name, "ERR " + String(e.message).split("\n")[0].slice(0, 200)); } }
async function hoverDiff(pg, sel, key, props = ["transform", "boxShadow", "backgroundColor", "translate", "scale"], inner = []) {
  const el = pg.locator(sel).first();
  await el.scrollIntoViewIfNeeded(); await pg.mouse.move(2, 2); await wait(pg, 400);
  const snap = () => pg.evaluate(([s, p, inn]) => { const e = document.querySelector(s); if (!e) return null; const f = (x) => { const c = getComputedStyle(x); return Object.fromEntries(p.map((k) => [k, c[k]])); }; const r = { self: f(e), tr: getComputedStyle(e).transition.slice(0, 140) }; inn.forEach((q) => { const x = e.querySelector(q); if (x) r[q] = f(x); }); return r; }, [sel, props, inner]);
  const a = await snap(); await el.hover(); await wait(pg, 700); const b = await snap();
  const d = {}; for (const k of Object.keys(a || {})) { if (k === "tr") continue; for (const p of Object.keys(a[k])) if (a[k][p] !== b[k][p]) d[k + "." + p] = [a[k][p], b[k][p]]; }
  log(key, { changed: d, transition: a?.tr });
}
const browser = await chromium.launch();
async function ctx(w) {
  const mob = w < 800;
  const c = await browser.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
  await c.addInitScript(() => { try { localStorage.setItem("fox-cookie", "ok"); } catch {} });
  return c;
}
const go = async (pg, p) => { await pg.goto(base + p, { waitUntil: "networkidle" }); await wait(pg, 400); };

for (const w of [1440, 390]) {
  const c = await ctx(w); const pg = await c.newPage(); pg.setDefaultTimeout(6000);
  const W = "_" + w;
  // G01 header states
  await check("G01" + W, async () => {
    await go(pg, "/faq");
    const h = () => pg.evaluate(() => { const e = document.querySelector(".site-header"); const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return [Math.round(r.top), Math.round(r.height), e.className, s.backdropFilter, s.transitionDuration]; });
    const a = await h(); await pg.evaluate(() => scrollTo(0, 120)); await wait(pg, 400); const b = await h();
    for (let y = 200; y < 1600; y += 100) { await pg.evaluate((y) => scrollTo(0, y), y); await wait(pg, 30); } await wait(pg, 400); const d = await h();
    for (let y = 1500; y > 1100; y -= 50) { await pg.evaluate((y) => scrollTo(0, y), y); await wait(pg, 30); } await wait(pg, 400); const u = await h();
    log("G01" + W, { top: a, y120: b, down: d, up: u });
  });
  if (w === 1440) {
    await check("G02_nav_hover", async () => { await go(pg, "/faq"); await hoverDiff(pg, ".site-header nav a:not([aria-current])", "G02_nav_hover", ["backgroundSize", "color", "textDecorationLine", "boxShadow"]); });
    await check("G13_btn", async () => {
      await go(pg, "/");
      const v = await pg.evaluate(() => { const b = document.querySelector("main .btn-dark") || document.querySelector(".btn"); const s = getComputedStyle(b); return { tr: s.transition.slice(0, 200) }; });
      // focus ring via keyboard
      await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab");
      const f = await pg.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return [e.tagName, e.className.slice(0, 40), s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset, s.boxShadow.slice(0, 60)]; });
      const act = await pg.evaluate(() => { for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r.selectorText && /\.btn[^,]*:active/.test(r.selectorText) && r.style.transform) return r.selectorText + " → " + r.style.transform; } catch {} } return null; });
      const dis = await pg.evaluate(() => { for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r.selectorText && /\.btn[^{]*(:disabled|\[disabled\])/.test(r.selectorText) && r.style.opacity) return r.selectorText.slice(0, 80) + " → " + r.style.opacity; } catch {} } return null; });
      log("G13_btn", { transition: v.tr, focus: f, active: act, disabled: dis });
    });
  }
  // Mobile menu
  if (w === 390) {
    await check("G05_G06_menu", async () => {
      await go(pg, "/reviews");
      await pg.locator(".burger").click();
      const t = []; for (const ms of [0, 80, 160, 320, 500]) { await wait(pg, ms - (t.length ? [0, 80, 160, 320, 500][t.length - 1] : 0)); t.push(await pg.evaluate(() => { const m = document.querySelector(".mobile-menu"); if (!m) return null; const s = getComputedStyle(m); const items = [...m.querySelectorAll("a,button")].slice(0, 4).map((x) => Number(getComputedStyle(x).opacity).toFixed(2)); return [s.clipPath.slice(0, 30), s.opacity, items.join("/")]; })); }
      const st = await pg.evaluate(() => ({ burger: document.querySelector(".burger")?.className, body: getComputedStyle(document.body).overflow, html: getComputedStyle(document.documentElement).overflow, active: [...document.querySelectorAll(".mobile-menu a")].filter((a) => a.getAttribute("aria-current")).map((a) => a.textContent + ":" + getComputedStyle(a, "::after").backgroundColor + getComputedStyle(a, "::before").backgroundColor), focus: document.activeElement?.textContent?.slice(0, 20), close: !!document.querySelector(".mobile-menu .m-close, .mobile-menu [aria-label='Закрыть'], .burger.is-x") }));
      await pg.screenshot({ path: out + "/menu-open-390.png" });
      await pg.keyboard.press("Escape"); await wait(pg, 60); const closing = await pg.evaluate(() => document.querySelector(".mobile-menu")?.className || "gone"); await wait(pg, 500);
      const after = await pg.evaluate(() => [!!document.querySelector(".mobile-menu"), getComputedStyle(document.body).overflow, document.querySelector(".burger")?.className]);
      log("G05_G06_menu", { frames: t, state: st, closing, after });
    });
    await check("M04_bar", async () => {
      await go(pg, "/faq");
      const h = await pg.evaluate(() => document.documentElement.scrollHeight);
      const v = async () => pg.evaluate(() => { const e = document.querySelector(".m04"); if (!e) return null; const s = getComputedStyle(e); return [e.className, s.opacity, s.transform.slice(0, 30), s.visibility]; });
      const a = await v(); await pg.evaluate((y) => scrollTo(0, y), Math.round(h * 0.35)); await wait(pg, 600); const b = await v();
      log("M04_bar", { before: a, after35: b });
    });
  }
  // Contact modal (mobile menu on 390, F03 button on /faq at 1440)
  await check("G10_contact" + W, async () => {
    await c.route("**/api/lead", (r) => r.fulfill({ status: 500, body: "{}" }));
    await go(pg, "/faq");
    if (w < 800) { await pg.locator(".burger").click(); await wait(pg, 600); await pg.locator(".mobile-menu button:has-text('Связаться')").click(); }
    else await pg.evaluate(() => window.dispatchEvent(new Event("fox:contact")));
    await wait(pg, 400);
    const m = ".lead-modal";
    const open = await pg.evaluate((m) => { const e = document.querySelector(m); if (!e) return null; const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { op: s.opacity, y: Math.round(r.top), h: Math.round(r.height), focus: document.activeElement?.getAttribute("name") || document.activeElement?.tagName, submitDisabled: e.querySelector("button[type=submit]")?.disabled }; }, m);
    await pg.screenshot({ path: out + `/contact-open-${w}.png` });
    await pg.locator(m + " input[name=name]").focus(); await pg.locator(m + " input[name=contact]").focus(); await wait(pg, 300);
    const blurErr = await pg.evaluate((m) => [...document.querySelectorAll(m + " .lf-err.is-on")].map((e) => e.textContent), m);
    await pg.locator(m + " .lf-consent").click();
    await pg.locator(m + " button[type=submit]").click(); await wait(pg, 80);
    const shake = await pg.evaluate((m) => { const f = document.querySelector(m + " form"); return [f?.className, f ? getComputedStyle(f).animationName : null]; }, m);
    await wait(pg, 300);
    const errs = await pg.evaluate((m) => [...document.querySelectorAll(m + " .lf-err.is-on")].map((e) => e.textContent), m);
    await pg.locator(m + " input[name=name]").fill("Анна"); await pg.locator(m + " input[name=contact]").fill("anna@clinic.ru"); await pg.locator(m + " textarea").fill("Как подготовиться к сдаче теста?");
    await pg.locator(m + " button[type=submit]").click(); await wait(pg, 40);
    const loading = await pg.evaluate((m) => document.querySelector(m + " button[type=submit]")?.className, m);
    await wait(pg, 900);
    const net = await pg.evaluate((m) => document.querySelector(m)?.innerText.match(/Не удалось[^\n]*|Повторить|Нет соединения[^\n]*/g), m);
    const kept = await pg.evaluate((m) => document.querySelector(m + " textarea")?.value, m);
    await pg.screenshot({ path: out + `/contact-network-${w}.png` });
    await c.unroute("**/api/lead"); await c.route("**/api/lead", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
    const retry = pg.locator(m + " button:has-text('Повторить')"); if (await retry.count()) await retry.first().click(); else await pg.locator(m + " button[type=submit]").click();
    await wait(pg, 900);
    const ok = await pg.evaluate((m) => document.querySelector(m)?.innerText.slice(0, 100), m);
    await pg.screenshot({ path: out + `/contact-success-${w}.png` });
    await pg.keyboard.press("Escape"); await wait(pg, 500);
    const closed = await pg.evaluate((m) => !document.querySelector(m), m);
    log("G10_contact" + W, { open, blurErr, shake, errs, loading, net, kept, ok, closedByEsc: closed });
    await c.unroute("**/api/lead");
  });
  // Booking modal
  await check("BOOK" + W, async () => {
    await go(pg, "/");
    await pg.evaluate(() => window.dispatchEvent(new Event("fox:book"))); await wait(pg, 500);
    const v = await pg.evaluate(() => { const e = document.querySelector(".modal, [role=dialog]"); if (!e) return null; const r = e.getBoundingClientRect(); return { cls: e.className.slice(0, 60), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), text: e.innerText.slice(0, 80) }; });
    await pg.screenshot({ path: out + `/book-${w}.png` });
    await pg.keyboard.press("Escape"); await wait(pg, 500);
    log("BOOK" + W, { v, closed: await pg.evaluate(() => !document.querySelector(".modal, [role=dialog]")) });
  });
  // Cookie banner timing
  await check("G07_cookie" + W, async () => {
    const c2 = await browser.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const p2 = await c2.newPage(); await p2.goto(base + "/privacy", { waitUntil: "domcontentloaded" });
    const t = []; for (const ms of [500, 900, 1300]) { await p2.waitForTimeout(ms - (t.length ? [500, 900, 1300][t.length - 1] : 0)); t.push(await p2.evaluate(() => { const e = document.querySelector(".cookie"); if (!e) return null; const s = getComputedStyle(e); return [s.opacity, s.transform.slice(0, 40)]; })); }
    const btns = await p2.evaluate(() => [...document.querySelectorAll(".cookie button")].map((b) => b.textContent));
    const set = p2.locator(".cookie button:has-text('Настро')"); let modal = null, toast = null;
    if (await set.count()) { await set.first().click(); await p2.waitForTimeout(400); modal = await p2.evaluate(() => document.querySelector(".modal, [role=dialog]")?.innerText.slice(0, 80)); const save = p2.locator("button:has-text('Сохранить')"); if (await save.count()) { await save.first().click(); await p2.waitForTimeout(400); toast = await p2.evaluate(() => document.querySelector(".fox-toast, .fox-toasts")?.innerText.slice(0, 60)); } }
    log("G07_cookie" + W, { frames: t, btns, modal, toast }); await c2.close();
  });
  // FAQ
  await check("F01_F02" + W, async () => {
    await go(pg, "/faq");
    const inp = pg.locator("[data-s='f01'] input, main input[type=search]").first();
    await inp.focus(); const ring = await pg.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); const p = getComputedStyle(e.closest("form,.search") || e); return [s.outlineStyle + " " + s.outlineWidth + " " + s.outlineColor, p.boxShadow.slice(0, 80), p.outlineStyle + " " + p.outlineColor]; });
    await inp.type("цена", { delay: 30 }); await wait(pg, 120); const early = await pg.evaluate(() => document.querySelectorAll("main mark").length); await wait(pg, 400);
    const marks = await pg.evaluate(() => document.querySelectorAll("main mark").length);
    await inp.fill(""); await wait(pg, 400);
    const q = pg.locator("main details summary, main .acc-q, main [aria-expanded]").first();
    const before = await pg.evaluate(() => { const e = document.querySelector("main [aria-expanded]"); return e ? [e.tagName, e.className.slice(0, 40), e.getAttribute("aria-expanded")] : null; });
    const el = pg.locator("main [aria-expanded='false']").first(); await el.scrollIntoViewIfNeeded();
    await el.click(); const frames = [];
    for (const ms of [60, 160, 340]) { await wait(pg, ms - (frames.length ? [60, 160, 340][frames.length - 1] : 0)); frames.push(await pg.evaluate(() => { const b = document.querySelector("main [aria-expanded='true']"); if (!b) return null; const body = b.parentElement?.nextElementSibling || b.nextElementSibling; const ch = b.querySelector("svg,img,i,.chev,.acc-plus"); return [body ? Math.round(body.getBoundingClientRect().height) : null, body ? getComputedStyle(body).transition.slice(0, 80) : null, ch ? getComputedStyle(ch).transform.slice(0, 40) : null]; })); }
    const second = pg.locator("main [aria-expanded='false']").first(); await second.click(); await wait(pg, 400);
    const openCount = await pg.evaluate(() => document.querySelectorAll("main [aria-expanded='true']").length);
    await go(pg, "/faq#pay"); await wait(pg, 900); const hash = await pg.evaluate(() => [scrollY, document.querySelectorAll("main [aria-expanded='true']").length, document.querySelector("#pay")?.className]);
    log("F01_F02" + W, { focusRing: ring, marksAt120: early, marks, before, openFrames: frames, openCountAfterSecond: openCount, hashPay: hash });
  });
  // Reviews
  await check("V02" + W, async () => {
    await go(pg, "/reviews");
    const n0 = await pg.evaluate(() => document.querySelectorAll(".v-grid > article").length);
    await pg.locator(".v-tools .chip:has-text('Видео')").click(); await wait(pg, 400);
    const n1 = await pg.evaluate(() => [document.querySelectorAll(".v-grid > article").length, location.search]);
    await pg.locator(".v-tools .chip:has-text('Специалисты')").click(); await pg.locator(".v-tools .chip:has-text('Кожа')").click(); await wait(pg, 300);
    const empty = await pg.evaluate(() => document.querySelector("[data-s='v02']")?.innerText.match(/Ничего|Сбросить|не найдено|Пока нет[^\n]*/g));
    await go(pg, "/reviews?type=video"); const tp = await pg.evaluate(() => document.querySelector(".v-tools .chip.is-active")?.textContent);
    log("V02" + W, { n0, video: n1, empty, typeParam: tp });
    if (w === 1440) await hoverDiff(pg, ".v-grid > article.rev:not(.rev-video):not(.rev-promo)", "V02_card_hover", ["transform", "boxShadow", "translate"], ["i"]);
  });
  await check("V03" + W, async () => {
    await go(pg, "/reviews");
    const f = pg.locator("#review-form"); await f.scrollIntoViewIfNeeded();
    const inputs = await pg.evaluate(() => [...document.querySelectorAll("#review-form input, #review-form textarea, #review-form select")].map((e) => (e.name || e.id || e.type)));
    const first = pg.locator("#review-form input").first(); await first.focus(); await pg.locator("#review-form textarea").first().focus(); await wait(pg, 300);
    const blur = await pg.evaluate(() => document.querySelector("#review-form")?.innerText.match(/Укажите[^\n]*|Напишите[^\n]*|Введите[^\n]*/g));
    await pg.locator("#review-form button[type=submit]").click(); await wait(pg, 80);
    const sh = await pg.evaluate(() => { const fm = document.querySelector("#review-form"); const bad = fm.querySelector(".is-error, [aria-invalid=true]"); return [fm.className, bad ? getComputedStyle(bad).animationName : null, bad ? getComputedStyle(bad).borderColor : null]; });
    await wait(pg, 300); const errs = await pg.evaluate(() => document.querySelector("#review-form")?.innerText.match(/Укажите[^\n]*|Напишите[^\n]*|Введите[^\n]*|Отметьте[^\n]*|Нужно[^\n]*/g));
    log("V03" + W, { inputs, blurErr: blur, shake: sh, errs });
  });
  // Contacts page form + cards
  await check("K03" + W, async () => {
    await go(pg, "/contacts");
    const seg = async () => pg.evaluate(() => { const i = document.querySelector("#k-form .seg-ind"); if (!i) return null; const s = getComputedStyle(i); return [s.transform.slice(0, 40), s.transition.slice(0, 80), Math.round(i.getBoundingClientRect().left)]; });
    const a = await seg(); await pg.locator("#k-form .seg button").nth(2).click(); await wait(pg, 120); const mid = await seg(); await wait(pg, 300); const b = await seg();
    const company = await pg.evaluate(() => { const s = document.querySelector("#k-form .lf-slide"); return s ? [s.className, Math.round(s.getBoundingClientRect().height), getComputedStyle(s).transition.slice(0, 60)] : null; });
    const hint = await pg.evaluate(() => document.querySelector("#k-form textarea")?.placeholder);
    await pg.locator("#k-form .seg button").nth(0).click(); await wait(pg, 300);
    const hint0 = await pg.evaluate(() => document.querySelector("#k-form textarea")?.placeholder);
    await pg.locator("#k-form input[name=name]").focus(); await pg.locator("#k-form input[name=contact]").focus(); await wait(pg, 300);
    const blurErr = await pg.evaluate(() => [...document.querySelectorAll("#k-form .lf-err.is-on")].map((e) => e.textContent));
    const focusRing = await pg.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return [s.outlineStyle, s.outlineColor, s.boxShadow.slice(0, 70), s.borderColor]; });
    const dis = await pg.evaluate(() => { const b = document.querySelector("#k-form button[type=submit]"); return [b.disabled, getComputedStyle(b).opacity, getComputedStyle(b).backgroundColor]; });
    log("K03" + W, { segBefore: a, segAt120: mid, segAfter: b, companyLab: company, hintLab: hint, hintPatient: hint0, blurErr, focusRing, submitDisabled: dis });
    if (w === 1440) { await hoverDiff(pg, ".k-cards article", "K02_card_hover", ["transform", "boxShadow", "translate"], [".k-ico"]); await hoverDiff(pg, ".k-routes article", "K04_route_hover", ["transform", "boxShadow", "backgroundColor"], ["a img"]); }
    const st = await pg.evaluate(() => document.querySelector(".k-hero-card small")?.className + " | " + document.querySelector(".k-hero-card small")?.textContent);
    log("K01_status" + W, st);
  });
  // Certificates
  await check("C02" + W, async () => {
    await go(pg, "/certificates");
    if (w === 1440) await hoverDiff(pg, ".cert-card", "C02_card_hover", ["transform", "boxShadow", "translate"], [".c-paper", ".cert-open"]);
    await pg.locator(".cert-card .cert-open, .cert-card button").first().click(); await wait(pg, 450);
    const lb = await pg.evaluate(() => { const e = document.querySelector("[role=dialog], .lightbox, .c-lightbox"); return e ? [e.className.slice(0, 50), getComputedStyle(e).backgroundColor, e.innerText.slice(0, 60)] : null; });
    await pg.screenshot({ path: out + `/cert-lightbox-${w}.png` });
    await pg.keyboard.press("Escape"); await wait(pg, 400);
    const closed = await pg.evaluate(() => !document.querySelector("[role=dialog], .lightbox, .c-lightbox"));
    const tl = await pg.evaluate(() => { const o = document.querySelector(".c05 ol"); const s = getComputedStyle(o); return [s.display, s.overflowX, o.scrollWidth, o.clientWidth]; });
    log("C02" + W, { lightbox: lb, escClosed: closed, timeline: tl });
  });
  // 404
  await check("E01" + W, async () => {
    await go(pg, "/no-such-page-404");
    const v = await pg.evaluate(() => ({ focus: document.activeElement?.getAttribute("aria-label"), chipAnim: getComputedStyle(document.querySelector(".e-chip")).animation.slice(0, 80), fourAnim: getComputedStyle(document.querySelector(".e-four")).animation.slice(0, 80), display404: getComputedStyle(document.querySelector(".e-four")).display }));
    await pg.locator("button:has-text('Сообщить о битой ссылке')").click(); await wait(pg, 400);
    v.toast = await pg.evaluate(() => document.querySelector(".fox-toasts, .fox-toast")?.innerText.slice(0, 60));
    log("E01" + W, v);
    if (w === 1440) await hoverDiff(pg, ".e-tiles a", "E02_tile_hover", ["transform", "boxShadow", "translate"], [".e-ico", ".e-arrow"]);
  });
  // Privacy
  await check("PR" + W, async () => {
    await go(pg, "/privacy");
    const pdf = pg.locator(".pr-actions .btn-dark"); await pdf.click(); await wait(pg, 120);
    const p1 = await pg.evaluate(() => document.querySelector(".pr-actions .btn-dark")?.className + " | " + document.querySelector(".pr-actions .btn-dark")?.innerText);
    await pg.evaluate(() => document.querySelector("#s5")?.scrollIntoView()); await wait(pg, 700);
    const spy = await pg.evaluate(() => [...document.querySelectorAll(".pr02 nav a")].filter((a) => a.className.includes("is-") || a.getAttribute("aria-current")).map((a) => a.textContent).join(",") + " | " + (document.querySelector(".pr-progress")?.textContent || "") + " | " + (document.querySelector(".pr-toc-m, .art-toc-m")?.innerText?.slice(0, 50) || ""));
    log("PR" + W, { pdfClick: p1, spyAtS5: spy });
  });
  // Blog + article + authors
  await check("BLOG" + W, async () => {
    await go(pg, "/blog");
    const chips = pg.locator("main .chips .chip, main .chip"); const n = await chips.count();
    const a = await pg.evaluate(() => document.querySelectorAll("main article, main .card").length);
    if (n > 2) { await chips.nth(2).click(); await wait(pg, 400); }
    const b = await pg.evaluate(() => [document.querySelectorAll("main article, main .card").length, location.search]);
    log("BLOG" + W, { chips: n, cards: a, afterChip: b });
    if (w === 1440) await hoverDiff(pg, "main a.article-card, main .article-card, main article a", "B_S04_hover", ["transform"], ["img"]);
  });
  await check("ART" + W, async () => {
    await go(pg, "/blog/skrytaya-neperenosimost-laktozy-i-glyutena");
    await pg.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.4)); await wait(pg, 600);
    const v = await pg.evaluate(() => { const pb = document.querySelector(".read-progress, .progress, [class*=progress]"); const t = document.querySelector(".toc a.is-active, .art-toc-m"); return { progress: pb ? [pb.className.slice(0, 40), getComputedStyle(pb).transform.slice(0, 40), getComputedStyle(pb).width] : null, toc: t ? t.textContent.slice(0, 50) : null }; });
    if (w < 800) { const tb = pg.locator(".art-toc-m > button"); if (await tb.count()) { await tb.click(); await wait(pg, 400); v.tocOpen = await pg.evaluate(() => document.querySelector(".art-toc-m")?.className + " " + document.querySelectorAll(".art-toc-m a").length); await tb.click(); await wait(pg, 300); } }
    const cp = pg.locator(".art-share button[aria-label='Скопировать ссылку']").filter({ visible: true }).first(); await cp.scrollIntoViewIfNeeded(); await cp.click(); await wait(pg, 300);
    v.copy = await pg.evaluate(() => [...document.querySelectorAll(".art-share button")].map((b) => b.textContent).join(",") + " | " + (document.querySelector("[role=status], .toast, .fox-toasts")?.innerText?.slice(0, 50) || ""));
    log("ART" + W, v);
  });
  await check("AU" + W, async () => {
    await go(pg, "/blog/authors");
    const a = await pg.evaluate(() => document.querySelectorAll("main .author-card, main article").length);
    const chip = pg.locator("main .chip").nth(1); await chip.click(); await wait(pg, 400);
    const b = await pg.evaluate(() => document.querySelectorAll("main .author-card, main article").length);
    log("AU" + W, { before: a, afterChip: b });
  });
  // Labs
  await check("LABS" + W, async () => {
    await go(pg, "/labs");
    const cnt = async () => pg.evaluate(() => document.querySelector(".l-count")?.textContent);
    const a = await cnt();
    const items = await pg.evaluate(() => document.querySelectorAll(".l-item, [data-s='l02'] li, .branch").length);
    if (w < 800) { await pg.getByRole("button", { name: "Карта", exact: true }).click(); await wait(pg, 600); }
    const map = await pg.evaluate(() => { const m = document.querySelector(".leaflet-container"); return m ? Math.round(m.getBoundingClientRect().height) : null; });
    log("LABS" + W, { count: a, items, mapHeight: map });
  });
  // Home S15 accordion + checker
  await check("S15_S06" + W, async () => {
    await go(pg, "/");
    const acc = await pg.evaluate(() => [...document.querySelectorAll("[data-s='s15'] [aria-expanded]")].map((e) => e.getAttribute("aria-expanded")).join(""));
    const q = pg.locator("[data-s='s15'] [aria-expanded='false']").first(); await q.scrollIntoViewIfNeeded(); await q.click(); await wait(pg, 400);
    const acc2 = await pg.evaluate(() => [...document.querySelectorAll("[data-s='s15'] [aria-expanded]")].map((e) => e.getAttribute("aria-expanded")).join(""));
    const btn = await pg.evaluate(() => { const b = [...document.querySelectorAll("[data-s='s06'] button")].find((x) => x.disabled); return b ? [b.textContent.slice(0, 30), getComputedStyle(b).opacity] : null; });
    log("S15_S06" + W, { s15Before: acc, s15AfterClick: acc2, s06Disabled: btn });
  });
  // Section entrance
  await check("ENTRY" + W, async () => {
    for (const p of ["/reviews", "/contacts", "/privacy", "/certificates"]) {
      await go(pg, p);
      const pre = await pg.evaluate(() => [...document.querySelectorAll("main [data-s]")].filter((s) => s.getBoundingClientRect().top > innerHeight).map((s) => s.getAttribute("data-s") + ":" + (s.className.includes("is-in") ? "in" : "wait")).join(","));
      for (let y = 0; y < 9000; y += 400) { await pg.evaluate((y) => scrollTo(0, y), y); await wait(pg, 60); }
      await wait(pg, 600);
      const post = await pg.evaluate(() => [...document.querySelectorAll("main [data-s]")].map((s) => s.getAttribute("data-s") + ":" + (s.className.includes("is-in") ? "in" : "-") + ":" + getComputedStyle(s).opacity).join(","));
      log("ENTRY" + W + p, { belowFold: pre, afterScroll: post });
    }
  });
  await c.close();
}
// reduced motion
await check("RM", async () => {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }); await c.addInitScript(() => { try { localStorage.setItem("fox-cookie", "ok"); } catch {} });
  const pg = await c.newPage(); await go(pg, "/no-such-page-404");
  const v = await pg.evaluate(() => ({ chip: getComputedStyle(document.querySelector(".e-chip")).animationName, entry: [...document.querySelectorAll("main [data-s]")].map((s) => getComputedStyle(s).opacity).join(",") }));
  log("RM", v); await c.close();
});
fs.writeFileSync(out + "/states.json", JSON.stringify(R, null, 1));
await browser.close();
