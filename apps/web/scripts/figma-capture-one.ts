#!/usr/bin/env npx tsx
/** Capture one FoodFox route into Figma. Usage: npx tsx scripts/figma-capture-one.ts /results CAPTURE_ID */
import { chromium } from "playwright";

const path = process.argv[2] ?? "/upload";
const captureId = process.argv[3];
if (!captureId) {
  console.error("Usage: figma-capture-one.ts <path> <captureId>");
  process.exit(1);
}

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);

  const res = await page.context().request.get(
    "https://mcp.figma.com/mcp/html-to-design/capture.js",
  );
  await page.evaluate((script) => {
    const el = document.createElement("script");
    el.textContent = script;
    document.head.appendChild(el);
  }, await res.text());
  await page.waitForTimeout(1000);

  // Fire capture; don't block on promise resolution
  await page.evaluate(
    ({ captureId }) => {
      const w = window as unknown as {
        figma?: { captureForDesign: (o: object) => Promise<unknown> };
      };
      w.figma?.captureForDesign({
        captureId,
        endpoint: `https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true`,
        selector: "body",
      });
    },
    { captureId },
  );

  console.log("Submitted", path, captureId);
  await page.waitForTimeout(8000);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
