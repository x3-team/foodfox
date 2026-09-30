#!/usr/bin/env npx tsx
/**
 * Capture local FoodFox screens into Figma via html-to-design.
 * Requires: dev server on :3000 (NEXT_PUBLIC_FIGMA_CAPTURE optional).
 */
import { chromium } from "playwright";

const CAPTURES = [
  { name: "01 Upload v3", path: "/upload", captureId: process.argv[2] },
  { name: "02 Results v3", path: "/results", captureId: process.argv[3] },
  { name: "03 Recipes v3", path: "/recipes", captureId: process.argv[4] },
  { name: "04 Chat v3", path: "/chat", captureId: process.argv[5] },
].filter((c) => c.captureId);

async function injectCaptureScript(page: import("playwright").Page) {
  const res = await page.context().request.get(
    "https://mcp.figma.com/mcp/html-to-design/capture.js",
  );
  const source = await res.text();
  await page.evaluate((script) => {
    const el = document.createElement("script");
    el.textContent = script;
    document.head.appendChild(el);
  }, source);
  await page.waitForTimeout(800);
}

async function capturePage(
  baseUrl: string,
  path: string,
  captureId: string,
  name: string,
) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  console.log(`Capturing ${name}: ${path}`);
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await injectCaptureScript(page);

  const result = await page.evaluate(
    async ({ captureId }) => {
      const w = window as unknown as {
        figma?: {
          captureForDesign: (opts: {
            captureId: string;
            endpoint: string;
            selector: string;
          }) => Promise<unknown>;
        };
      };
      if (!w.figma?.captureForDesign) {
        return { ok: false, reason: "figma.captureForDesign missing" };
      }
      return w.figma.captureForDesign({
        captureId,
        endpoint: `https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true`,
        selector: "body",
      });
    },
    { captureId },
  );

  console.log(`  →`, JSON.stringify(result).slice(0, 300));
  await page.waitForTimeout(2000);
  await browser.close();
}

async function main() {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const health = await fetch(`${baseUrl}/api/health`).then((r) => r.ok).catch(() => false);
  if (!health) {
    console.error("Dev server not running at", baseUrl);
    process.exit(1);
  }

  await fetch(`${baseUrl}/api/results`);
  await fetch(`${baseUrl}/api/recipes`);
  await fetch(`${baseUrl}/api/chat/messages`);

  for (const c of CAPTURES) {
    await capturePage(baseUrl, c.path, c.captureId!, c.name);
  }

  console.log("\nAll captures submitted.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
