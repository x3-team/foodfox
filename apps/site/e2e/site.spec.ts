import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/specialists", "/report", "/course", "/course/lessons", "/labs", "/blog", "/blog/authors", "/faq", "/certificates", "/reviews", "/contacts", "/privacy"];

async function ready(page: import("@playwright/test").Page) {
  const cookie = page.getByRole("button", { name: "Понятно" });
  if (await cookie.isVisible().catch(() => false)) await cookie.click();
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("pages render without horizontal scroll", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await ready(page);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test("unknown route is the designed 404", async ({ page }) => {
  await page.goto("/net-takoy-stranicy");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
});

test("header navigation reaches blog and labs", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  if (page.viewportSize()!.width < 1100) {
    await page.getByRole("button", { name: "Меню" }).click();
    await page.getByRole("dialog", { name: "Меню" }).getByRole("link", { name: "Блог" }).click();
  } else {
    await page.getByRole("navigation", { name: "Разделы" }).getByRole("link", { name: "Блог" }).click();
  }
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.getByRole("heading", { name: /Блог о пищевой/ })).toBeVisible();
});

test("blog search empty state and course registration errors", async ({ page }) => {
  await page.goto("/blog");
  await ready(page);
  await page.getByLabel("Поиск по статьям").fill("лактоза у детей");
  await page.getByLabel("Поиск по статьям").press("Enter");
  await expect(page.getByRole("heading", { name: "Ничего не нашлось" })).toBeVisible();

  await page.goto("/course");
  await ready(page);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await page.getByRole("button", { name: "Дальше" }).click();
  await expect(page.locator(".err")).toContainText("имя");
  await page.getByRole("dialog").locator("input").fill("Анна");
  await page.getByRole("button", { name: "Дальше" }).click();
  await page.getByRole("button", { name: "Дальше" }).click();
  await expect(page.locator(".err")).toContainText("email");
});

test("contacts validation and labs empty city", async ({ page }) => {
  await page.goto("/contacts");
  await ready(page);
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.locator(".err")).toBeVisible();

  await page.goto("/labs");
  await ready(page);
  await page.getByLabel("Город").fill("нет");
  await expect(page.getByText("партнёров пока нет")).toBeVisible();
});

test("faq accordion and internal links are not broken", async ({ page, request }) => {
  await page.goto("/faq");
  await ready(page);
  await page.getByRole("button", { name: /голодать/ }).click();
  await expect(page.getByText("Специальной подготовки")).toBeVisible();

  await page.goto("/");
  await ready(page);
  const hrefs = await page.$$eval("a[href^='/']", (nodes) => [...new Set(nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href")!.split("#")[0]))]);
  for (const href of hrefs) {
    if (!href || href.startsWith("/#")) continue;
    const response = await request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

test("partner cabinet link opens the existing login", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const link = page.getByRole("link", { name: "Кабинет партнёра" }).first();
  await expect(link).toHaveAttribute("href", "https://foodfox.yuri.guru/partner");
});

test("partner login and demo OTP endpoint", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "1440");
  const login = await request.get("https://foodfox.yuri.guru/partner", {
    headers: { Authorization: "Basic " + Buffer.from("demo:FoodFox2026!").toString("base64") },
  });
  expect(login.status()).toBe(200);
  expect(await login.text()).toContain("Вход в кабинет");

  const otp = await request.post("https://foodfox.yuri.guru/api/auth/otp/request", {
    headers: {
      Authorization: "Basic " + Buffer.from("demo:FoodFox2026!").toString("base64"),
      "content-type": "application/json",
    },
    data: { phone: "+7 925 111-11-11" },
  });
  const body = await otp.json();
  expect([200, 429], JSON.stringify(body)).toContain(otp.status());
  if (otp.status() === 200) expect(body.demoCode).toBe("1111");
});

test("home has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical")).toEqual([]);
});

test("home scale and sticky deck follow the motion spec", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await expect(page.locator("[data-scale] [data-word]")).toHaveCount(12);
  const sticky = await page.locator(".deck-card").first().evaluate((node) => getComputedStyle(node).position);
  expect(sticky).toBe("sticky");
  await expect(page.locator(".deck-card")).toHaveCount(3);
});

test("report flips pages and stacks U/mL cards", async ({ page }) => {
  await page.goto("/report");
  await ready(page);
  await expect(page.locator("[data-uml] .uml-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Следующая страница отчёта" }).click();
  await expect(page.getByText("Страница 2 из 3")).toBeVisible();
});

test("labs map stays in sync with the branch list", async ({ page }) => {
  await page.goto("/labs");
  await ready(page);
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("button", { name: /Гемотест/ }).click();
  await expect(page.locator("[data-pin='gem']")).toHaveClass(/is-on/);
});

test("certificate carousel opens a document", async ({ page }) => {
  await page.goto("/certificates");
  await ready(page);
  await expect(page.locator("[data-certs] .cert-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Открыть PDF" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("privacy policy contains every numbered section", async ({ page }) => {
  await page.goto("/privacy");
  await ready(page);
  await expect(page.getByRole("heading", { name: "10. Контакты оператора" })).toBeVisible();
  await expect(page.getByText("152-ФЗ").first()).toBeVisible();
});

test("desktop home screenshot", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440" && testInfo.project.name !== "375");
  await page.goto("/");
  await ready(page);
  await expect(page).toHaveScreenshot(`home-${testInfo.project.name}.png`, { maxDiffPixelRatio: 0.03, fullPage: false });
});
