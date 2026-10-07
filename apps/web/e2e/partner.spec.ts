import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [375, 768, 1280, 1440] as const;

// /partner signs the demo partner in by itself (lib/partner-demo-autologin.ts);
// ?manual=1 keeps the form for tests that drive it by hand.
const LOGIN = "/partner?manual=1";

const PUBLIC_ROUTES = [LOGIN, "/partner/apply", "/partner/pending"] as const;

const CABINET_ROUTES = [
  "/partner/home",
  "/partner/reports",
  "/partner/payouts",
  "/partner/materials",
  "/partner/certification",
  "/partner/settings",
] as const;

async function noHorizontalScroll(page: Page) {
  const box = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
}

async function requestOtp(page: Page, phone: string) {
  let response = await page.request.post("/api/auth/otp/request", {
    data: { phone },
  });
  if (response.status() === 429) {
    await page.waitForTimeout(43_000);
    response = await page.request.post("/api/auth/otp/request", {
      data: { phone },
    });
  }
  return response;
}

test.describe.serial("partner cabinet", () => {
  test("empty login shows an error on the phone field", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(LOGIN);
    await page.getByRole("button", { name: "Получить код" }).click();
    const error = page.getByText("Введите номер телефона");
    await expect(error).toBeVisible();
    const field = await page.getByLabel("Телефон").boundingBox();
    const message = await error.boundingBox();
    expect(field).not.toBeNull();
    expect(message).not.toBeNull();
    expect(message!.y).toBeGreaterThan(field!.y);
  });

  test("wrong code is rejected and a normal number omits demoCode", async ({ page }) => {
    const phone = `79${String(Date.now()).slice(-9)}`;
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(LOGIN);

    await page.getByLabel("Телефон").fill(phone);
    const requested = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/otp/request") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Получить код" }).click();
    const requestResponse = await requested;
    expect(requestResponse.ok()).toBeTruthy();
    const payload = (await requestResponse.json()) as { demoCode?: string };
    expect(payload.demoCode).toBeUndefined();

    await page.getByLabel("Код из СМС").fill("0000");
    const verified = page.waitForResponse((response) =>
      response.url().includes("/api/auth/otp/verify"),
    );
    await page.getByRole("button", { name: "Войти" }).click();
    expect((await verified).status()).toBe(401);
    await expect(page.getByText("Код неверный или истёк")).toBeVisible();
    await expect(page).toHaveURL(/\/partner\/?(\?.*)?$/);

    await page.goto("/partner/home");
    await expect(page).toHaveURL(/\/partner\/?(\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Вход в кабинет" })).toBeVisible();
  });

  test("client demo cannot open the partner cabinet", async ({ page }) => {
    const requested = await requestOtp(page, "+7 925 111-11-11");
    expect(requested.ok()).toBeTruthy();
    const payload = (await requested.json()) as { demoCode?: string };
    expect(payload.demoCode).toBeUndefined();

    const verified = await page.request.post("/api/auth/otp/verify", {
      data: { phone: "+7 925 111-11-11", code: "1111", intent: "partner" },
    });
    expect(verified.status()).toBe(403);

    await page.goto("/partner/home");
    await expect(page).toHaveURL(/\/partner\/?(\?.*)?$/);
    await expect(page.getByText(/клиент/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Мария/ })).toHaveCount(0);
  });

  test("demo auto-login opens the cabinet from a plain /partner visit", async ({ page }) => {
    await page.goto("/partner");
    await expect(page).toHaveURL(/\/partner\/home\/?$/);
    await expect(page.getByRole("heading", { name: /Мария/ })).toBeVisible();
  });

  test("demo partner signs in and the cabinet fits 375, 768, 1280 and 1440", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(LOGIN);
    await page.getByLabel("Телефон").fill("+7 999 000-11-22");

    const askForCode = async () => {
      const pending = page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/otp/request") &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Получить код" }).click();
      return pending;
    };

    let requested = await askForCode();
    if (requested.status() === 429) {
      await page.waitForTimeout(43_000);
      requested = await askForCode();
    }
    expect(requested.ok()).toBeTruthy();
    const payload = (await requested.json()) as { demoCode?: string };
    expect(payload.demoCode).toBeUndefined();

    await page.getByLabel("Код из СМС").fill("2026");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/partner\/home\/?$/);
    await expect(page.getByRole("heading", { name: /Мария/ })).toBeVisible();
    await expect(page.locator("text=KOVALEVA-24 >> visible=true").first()).toBeVisible();
    await expect(page.getByText("19 200 ₽").first()).toBeVisible();

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 800 ? 900 : 1000 });
      for (const route of CABINET_ROUTES) {
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`${route}/?$`));
        await expect(page.locator("text=KOVALEVA-24 >> visible=true").first()).toBeVisible();
        if (route === "/partner/materials") {
          const link = page.getByText("foodfox.ru/t/KOVALEVA-24");
          const box = await link.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.width).toBeGreaterThan(180);
          expect(box!.height).toBeLessThan(96);
          await expect(page.getByRole("button", { name: "Копировать" })).toBeVisible();
        }
        await noHorizontalScroll(page);
      }
    }
  });

  test("public partner screens fit 375, 768, 1280 and 1440", async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 800 ? 900 : 1000 });
      for (const route of PUBLIC_ROUTES) {
        await page.goto(route);
        await noHorizontalScroll(page);
      }
      await page.goto(LOGIN);
      const button = page.getByRole("button", { name: "Получить код" });
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  });
});
