import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/specialists", "/report", "/course", "/course/lessons", "/labs", "/blog", "/blog/authors", "/faq", "/certificates", "/reviews", "/contacts", "/privacy"];

async function ready(page: import("@playwright/test").Page) {
  const cookie = page.getByRole("button", { name: "Принять все" });
  try {
    await cookie.waitFor({ state: "visible", timeout: 2500 });
    await cookie.click();
  } catch {
    /* already dismissed */
  }
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("pages render without horizontal scroll", async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of PAGES) {
    await page.goto(path);
    await ready(page);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => {
      const clip = getComputedStyle(document.documentElement).overflowX;
      const bodyClip = getComputedStyle(document.body).overflowX;
      const vw = document.documentElement.clientWidth;
      const bad: string[] = [];
      if (clip === "clip" || bodyClip === "clip") bad.push("html/body overflow-x clip");
      for (const el of document.querySelectorAll("body *")) {
        if ((el as HTMLElement).closest("[data-allow-x], .chips, .marquee, .cert-row, .review-row, .table-wrap, .leaflet-container, .product-list")) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) continue;
        if (rect.right > vw + 2 || rect.left < -2) {
          const name = `${el.tagName}.${(el as HTMLElement).className?.toString?.().slice(0, 48) ?? ""}`;
          bad.push(name);
          if (bad.length > 6) break;
        }
      }
      return bad;
    });
    expect(overflow, path).toEqual([]);
  }
});

test("unknown route is the designed 404", async ({ page }) => {
  await page.goto("/net-takoy-stranicy");
  await ready(page);
  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  await expect(page).toHaveTitle(/Страница не найдена/);
});

test("dark hero sits under the header", async ({ page }) => {
  for (const path of ["/", "/specialists", "/course"]) {
    await page.goto(path);
    await ready(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const overlap = await page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const hero = document.querySelector(".dark-hero");
      if (!header || !hero) return false;
      const h = header.getBoundingClientRect();
      const e = hero.getBoundingClientRect();
      return e.top <= 2 && e.bottom > h.bottom && header.classList.contains("on-dark");
    });
    expect(overlap, path).toBe(true);
  }
  await page.goto("/course/lessons");
  await ready(page);
  const lessonsDark = await page.locator(".site-header").evaluate((node) => node.classList.contains("on-dark"));
  expect(lessonsDark).toBe(false);
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
  await page.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();
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
  await expect(page.locator(".err").first()).toBeVisible();

  await page.goto("/labs");
  await ready(page);
  await page.getByLabel("Город").fill("нет");
  await expect(page.getByText("партнёров пока нет")).toBeVisible();
});

test("faq accordion and internal links are not broken", async ({ page, request }) => {
  await page.goto("/faq");
  await ready(page);
  if ((page.viewportSize()?.width ?? 1440) < 1100) {
    await page.locator(".f-nav a[href='#prep']").click();
  }
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
  expect(await login.text()).toMatch(/Вход в кабинет|кабинет партнёра|Партнёрская программа/);

  const otp = await request.post("https://foodfox.yuri.guru/api/auth/otp/request", {
    headers: {
      Authorization: "Basic " + Buffer.from("demo:FoodFox2026!").toString("base64"),
      "content-type": "application/json",
    },
    data: { phone: "+7 925 111-11-11" },
  });
  const body = await otp.json();
  expect([200, 429], JSON.stringify(body)).toContain(otp.status());
  if (typeof body.demoCode === "string") expect(body.demoCode).toBe("1111");
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
  const mapToggle = page.getByRole("button", { name: "Карта", exact: true });
  if (await mapToggle.isVisible()) await mapToggle.click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("button", { name: /Гемотест/ }).click();
  await expect(page.locator("[data-pin='gem']")).toHaveClass(/is-on/);
});

test("certificate carousel opens a document", async ({ page }) => {
  await page.goto("/certificates");
  await ready(page);
  await expect(page.locator("[data-certs] .cert-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Открыть PDF" }).first().click();
  await expect(page.getByRole("dialog", { name: "CE-IVDR" })).toBeVisible();
});

test("privacy policy contains every numbered section", async ({ page }) => {
  await page.goto("/privacy");
  await ready(page);
  await expect(page.getByRole("heading", { name: "10. Контакты оператора" })).toBeVisible();
  await expect(page.getByText("152-ФЗ").first()).toBeVisible();
});

test("escape closes the mobile menu and the course dialog", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "375" && testInfo.project.name !== "1440");
  if (testInfo.project.name === "375") {
    await page.goto("/");
    await ready(page);
    await page.getByRole("button", { name: "Меню" }).click();
    await expect(page.getByRole("dialog", { name: "Меню" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Меню" })).toHaveCount(0);
  }
  await page.goto("/course");
  await ready(page);
  await page.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Шаг 1/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Шаг 1/ })).toHaveCount(0);
});

test("desktop home contains every design section", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440");
  await page.goto("/");
  await ready(page);
  await expect(page.locator("main [data-s]")).toHaveCount(15);
  await expect(page.getByRole("heading", { name: "Как сдать тест" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Частые вопросы" })).toBeVisible();
  await expect(page.getByText("Сымитировать ошибку сети")).toHaveCount(0);
  const height = await page.locator("main").evaluate((node) => node.scrollHeight);
  expect(height).toBeGreaterThan(12000);
});

test("article stays within the phone viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "375");
  await page.goto("/blog/skrytaya-neperenosimost-laktozy-i-glyutena");
  await ready(page);
  const width = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(width.sw).toBeLessThanOrEqual(width.cw + 1);
});

test("labs city changes the branch list", async ({ page }) => {
  await page.goto("/labs");
  await ready(page);
  const list = page.locator("[data-lab-list]");
  await expect(list.getByText("ул. Таганская, 3")).toBeVisible();
  await page.getByLabel("Город").fill("Санкт-Петербург");
  await expect(list.getByText("Невский пр., 114")).toBeVisible();
  await expect(list.getByText("ул. Таганская, 3")).toHaveCount(0);
  await page.getByLabel("Город").fill("нет");
  await expect(page.getByText("партнёров пока нет")).toBeVisible();
});

test("section entrance changes opacity and transform", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await ready(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const target = page.locator('[data-s="s12"] > h2').first();
  const before = await target.evaluate((el) => {
    const style = getComputedStyle(el);
    return { opacity: Number(style.opacity), transform: style.transform };
  });
  expect(before.opacity).toBeLessThan(0.2);
  expect(before.transform).not.toBe("none");
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const after = await target.evaluate((el) => {
    const style = getComputedStyle(el);
    return { opacity: Number(style.opacity), transform: style.transform };
  });
  expect(after.opacity).toBeGreaterThan(0.9);
  expect(after.transform).not.toBe(before.transform);
});

test("scrolled pages leave no section at opacity 0", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440" && testInfo.project.name !== "375");
  test.setTimeout(180_000);
  const paths = [...PAGES, "/blog/skrytaya-neperenosimost-laktozy-i-glyutena", "/blog/authors/kseniya-ellinskaya", "/net-takoy-stranicy"];
  for (const path of paths) {
    await page.goto(path);
    await ready(page);
    await page.evaluate(async () => {
      const step = Math.max(240, window.innerHeight * 0.7);
      const max = document.documentElement.scrollHeight;
      for (let y = 0; y <= max; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      window.scrollTo(0, max);
    });
    // riseY is 600ms plus a stagger of 80ms per child, so a short wait still sees opacity 0.
    await page.waitForFunction(() => {
      const stuck: string[] = [];
      document.querySelectorAll<HTMLElement>("[data-s]").forEach((section) => {
        if (section.offsetHeight < 8 || getComputedStyle(section).display === "none") return;
        const kids = section.classList.contains("wrap")
          ? [...section.children]
          : [...(section.querySelector(":scope > .wrap")?.children ?? section.children)];
        kids.forEach((kid) => {
          const node = kid as HTMLElement;
          if (node.offsetHeight < 8 || getComputedStyle(node).display === "none") return;
          if (Number(getComputedStyle(node).opacity) < 0.9) stuck.push(section.getAttribute("data-s") || "");
        });
      });
      (window as unknown as { __opacityStuck?: string[] }).__opacityStuck = stuck.slice(0, 8);
      return stuck.length === 0;
    }, undefined, { timeout: 5000 }).catch(async () => {
      const stuck = await page.evaluate(() => (window as unknown as { __opacityStuck?: string[] }).__opacityStuck ?? ["timeout"]);
      expect(stuck, path).toEqual([]);
    });
  }
});

test("escape closes the certificate lightbox", async ({ page }) => {
  await page.goto("/certificates");
  await ready(page);
  await page.getByRole("button", { name: "Открыть PDF" }).first().click();
  await expect(page.getByRole("dialog", { name: "CE-IVDR" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "CE-IVDR" })).toHaveCount(0);
});

test("booking modal walks the city and lab steps", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "Записаться на тест" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Записаться на тест" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Москва/ }).click();
  await dialog.getByRole("button", { name: "Продолжить" }).click();
  await expect(dialog.getByRole("heading", { name: /Выберите лабораторию/ })).toBeVisible();
  await dialog.getByRole("button", { name: /Ситилаб/ }).click();
  await expect(dialog.getByRole("heading", { name: /Открываем сайт/ })).toBeVisible();
});

test("course program sheet opens on a phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "375");
  await page.goto("/course/lessons");
  await ready(page);
  const box = await page.locator(".ls-title h1").evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  expect(box.sw).toBeLessThanOrEqual(box.cw + 1);
  await page.getByRole("button", { name: "Программа курса" }).click();
  await expect(page.getByRole("dialog", { name: "Программа" })).toBeVisible();
});

test("product card follows the search", async ({ page }) => {
  await page.goto("/#products");
  await ready(page);
  await page.getByLabel("Поиск продукта").fill("халва");
  await expect(page.getByRole("heading", { name: "Халва" })).toBeVisible();
});

test("scrolled header shrinks to 72px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440");
  await page.goto("/faq");
  await ready(page);
  await page.evaluate(() => window.scrollTo(0, 140));
  await page.waitForTimeout(300);
  const box = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.round(box)).toBe(72);
});

test("faq section links point at real groups", async ({ page }) => {
  await page.goto("/faq");
  await ready(page);
  const missing = await page.locator(".f-nav a").evaluateAll((links) =>
    links
      .map((link) => link.getAttribute("href") || "")
      .filter((href) => href.startsWith("#"))
      .map((href) => href.slice(1))
      .filter((id) => !document.getElementById(id)),
  );
  expect(missing).toEqual([]);
});

test("booking waitlist posts the lead", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const posted = page.waitForRequest((request) => request.url().includes("/api/lead") && request.method() === "POST");
  await page.getByRole("button", { name: "Записаться на тест" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Записаться на тест" });
  await dialog.getByRole("button", { name: /Моздок/ }).click();
  await dialog.getByRole("button", { name: "Продолжить" }).click();
  await expect(dialog.getByRole("heading", { name: /Моздоке/ })).toBeVisible();
  await dialog.getByLabel("Почта, когда появится тест").fill("a@b.c");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Сообщить, когда появится" }).click();
  await posted;
  await expect(dialog.getByRole("heading", { name: "Готово, мы напишем" })).toBeVisible();
});

test("course sheet closes on escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "375");
  await page.goto("/course/lessons");
  await ready(page);
  await page.getByRole("button", { name: "Программа курса" }).click();
  await expect(page.getByRole("dialog", { name: "Программа" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Программа" })).toHaveCount(0);
});

test("privacy scroll spy follows the section in view", async ({ page }) => {
  await page.goto("/privacy");
  await ready(page);
  await page.locator("#s4").evaluate((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top - 80));
  });
  await page.waitForTimeout(200);
  await expect(page.locator(".pr02 nav a.is-on")).toHaveAttribute("href", "#s4");
});

test("text stays readable and sections stay visible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "1440");
  test.setTimeout(240_000);
  const paths = [...PAGES, "/blog/skrytaya-neperenosimost-laktozy-i-glyutena", "/blog/authors/kseniya-ellinskaya", "/net-takoy-stranicy"];
  const widths = [390, 768, 1100, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(path);
      await ready(page);
      await page.evaluate(async () => {
        const step = Math.max(240, window.innerHeight * 0.8);
        const max = document.documentElement.scrollHeight;
        for (let y = 0; y <= max; y += step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
        window.scrollTo(0, max);
      });
      await page.waitForFunction(() => {
        const stuck: string[] = [];
        document.querySelectorAll<HTMLElement>("[data-s]").forEach((section) => {
          if (section.offsetHeight < 8 || getComputedStyle(section).display === "none") return;
          const kids = section.classList.contains("wrap")
            ? [...section.children]
            : [...(section.querySelector(":scope > .wrap")?.children ?? section.children)];
          kids.forEach((kid) => {
            const node = kid as HTMLElement;
            if (node.offsetHeight < 8 || getComputedStyle(node).display === "none" || node.classList.contains("deck-card")) return;
            if (Number(getComputedStyle(node).opacity) < 0.15) stuck.push(section.getAttribute("data-s") || "");
          });
        });
        return stuck.length === 0;
      }, undefined, { timeout: 4000 }).catch(() => undefined);
      const problems = await page.evaluate(() => {
        const parse = (value: string) => {
          const match = value.match(/rgba?\(([^)]+)\)/);
          if (!match) return null;
          const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
          return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 };
        };
        const lum = (rgb: number[]) => {
          const c = rgb.map((channel) => {
            const v = channel / 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        };
        const contrast = (a: number[], b: number[]) => {
          const l1 = lum(a);
          const l2 = lum(b);
          const hi = Math.max(l1, l2);
          const lo = Math.min(l1, l2);
          return (hi + 0.05) / (lo + 0.05);
        };
        const bgOf = (el: HTMLElement) => {
          const layers: { rgb: number[]; a: number }[] = [];
          let node: HTMLElement | null = el;
          while (node) {
            const style = getComputedStyle(node);
            const color = parse(style.backgroundColor);
            if (style.backgroundImage && style.backgroundImage !== "none") return null;
            if (color && color.a > 0.02) layers.push(color);
            if (color && color.a >= 0.92) break;
            node = node.parentElement;
          }
          let acc = [248, 249, 246];
          for (let i = layers.length - 1; i >= 0; i -= 1) {
            const layer = layers[i];
            acc = acc.map((channel, index) => layer.rgb[index] * layer.a + channel * (1 - layer.a));
          }
          return acc;
        };
        const issues: string[] = [];
        document.querySelectorAll<HTMLElement>("[data-s]").forEach((section) => {
          const style = getComputedStyle(section);
          if (style.display === "none" || style.visibility === "hidden") return;
          if (section.offsetHeight < 1) issues.push(`flat ${section.getAttribute("data-s")}`);
          const kids = [...(section.querySelector(":scope > .wrap")?.children ?? section.children)] as HTMLElement[];
          kids.forEach((kid) => {
            if (kid.offsetHeight < 8 || getComputedStyle(kid).display === "none" || kid.classList.contains("deck-card")) return;
            const opacity = Number(getComputedStyle(kid).opacity);
            if (opacity < 0.15) issues.push(`opacity ${section.getAttribute("data-s")} ${opacity.toFixed(2)}`);
          });
        });
        const nodes = document.querySelectorAll<HTMLElement>("h1,h2,h3,p,a,button,li,span");
        nodes.forEach((el) => {
          if (issues.length > 8) return;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.9) return;
          if (el.closest("[data-allow-x], .marquee, .leaflet-container, .cookie, .m04, .site-header, .mobile-menu, .fox-toast")) return;
          if (el.closest("button[disabled], .btn[disabled]")) return;
          const text = (el.innerText || "").trim();
          if (text.length < 2 || el.children.length > 2) return;
          const box = el.getBoundingClientRect();
          if (box.width < 8 || box.height < 8) return;
          const fill = parse(style.color);
          const bg = bgOf(el);
          if (!fill || fill.a < 0.5 || !bg) return;
          const ink = fill.rgb.map((channel, index) => channel * fill.a + bg[index] * (1 - fill.a));
          const ratio = contrast(ink, bg);
          if (ratio < 3) issues.push(`${ratio.toFixed(2)} «${text.slice(0, 42)}»`);
        });
        return issues.slice(0, 8);
      });
      expect(problems, `${path} @ ${width}`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/labs");
  await ready(page);
  await page.getByRole("button", { name: "Карта", exact: true }).click();
  const mapHeight = await page.locator(".leaflet-container").evaluate((el) => el.getBoundingClientRect().height);
  expect(mapHeight).toBeGreaterThan(200);
});

test("authors stack in one column on a phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "375");
  await page.goto("/blog/authors");
  await ready(page);
  const columns = await page.locator(".author-grid").evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(1);
});
