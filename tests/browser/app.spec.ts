import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { labs } from "../../src/lib/labs";

async function skipTutorial(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("byte-breaker-tutorial-complete", "true"),
  );
}

test("orientation requires safety acknowledgement and persists", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({
    path: "test-results/orientation.png",
    fullPage: true,
  });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const acknowledgement = page.getByLabel("安全な利用ルールを確認しました");
  const start = page.getByRole("button", { name: "演習を開始" });
  await expect(dialog).toBeFocused();
  await expect(start).toBeDisabled();
  await expect(
    page.getByText(
      "第三者のサイト、アカウント、ネットワークでは試さないでください。",
    ),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await acknowledgement.check();
  await start.click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(dialog).toHaveCount(0);
});

test("storage failure leaves tutorial functional", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage denied");
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("安全な利用ルールを確認しました").check();
  await page.getByRole("button", { name: "演習を開始" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "SQL Injection",
  );
});

test("target forms use natural copy while missions identify scoring targets", async ({
  page,
}) => {
  await skipTutorial(page);
  await page.goto("/");
  await expect(page.locator("#payload")).toHaveAttribute(
    "placeholder",
    "ユーザー名を入力",
  );
  await expect(page.locator("#password")).toHaveAttribute(
    "placeholder",
    "パスワードを入力",
  );
  await expect(page.getByText("admin.internal / auth")).toHaveCount(0);
  await expect(
    page.getByText("演習では空欄のまま認証回避を検証できます"),
  ).toHaveCount(0);

  await page.goto("/labs/path-traversal/");
  await expect(page.getByRole("heading", { name: /\/etc\/passwd/ })).toBeVisible();
  await expect(page.getByText("RESOLVES TO")).toHaveCount(0);

  await page.goto("/labs/stored-xss/");
  await expect(
    page.getByRole("heading", { name: /script.*alert/ }),
  ).toBeVisible();

  await page.goto("/labs/command-injection/");
  await expect(page.getByRole("heading", { name: /flag\.txt/ })).toBeVisible();
  await expect(page.getByText("診断先IPアドレスとペイロード")).toHaveCount(0);

  await page.goto("/labs/idor/");
  await expect(
    page.getByRole("heading", { name: /user_88.*#1042/ }),
  ).toBeVisible();
  await expect(page.locator("#payload")).toHaveAttribute(
    "placeholder",
    "レポートIDを入力",
  );
  await expect(page.getByText(/own report:/)).toHaveCount(0);
});

test("in-page state changes animate and respect reduced motion", async ({
  page,
}) => {
  await skipTutorial(page);
  await page.goto("/");

  const hint = page.locator("#lab-hint");
  expect(
    await hint.evaluate((element) => getComputedStyle(element).transitionProperty),
  ).toContain("grid-template-rows");
  await page.getByRole("button", { name: "ヒント1を見る" }).click();
  expect(
    await page
      .locator(".hint-list li")
      .last()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toContain("hint-enter");

  await page.waitForTimeout(420);
  const hintButton = page.locator(".hint-button");
  const hintButtonDocumentY = () =>
    hintButton.evaluate(
      (element) => element.getBoundingClientRect().y + window.scrollY,
    );
  for (const level of [2, 3]) {
    const before = await hintButtonDocumentY();
    await page.getByRole("button", { name: `ヒント${level}を見る` }).click();
    await page.waitForTimeout(80);
    const during = await hintButtonDocumentY();
    await page.waitForTimeout(340);
    const after = await hintButtonDocumentY();
    expect(during).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(during);
  }

  const hintButtonBox = (await hintButton.boundingBox())!;
  const answerButtonBox = (await page.locator(".answer-button").boundingBox())!;
  expect(
    answerButtonBox.y - (hintButtonBox.y + hintButtonBox.height),
  ).toBeGreaterThanOrEqual(18);

  for (const selector of [
    "#lab-answer",
    ".results",
    ".sidebar",
    ".sidebar-overlay",
    ".bottom-navigation",
  ]) {
    expect(
      await page
        .locator(selector)
        .evaluate((element) => getComputedStyle(element).transitionDuration),
    ).not.toBe("0s");
  }

  await page.getByRole("button", { name: "このサイトについて" }).click();
  await expect(page.locator(".modal-backdrop")).toHaveClass(/is-visible/);
  expect(
    await page
      .locator(".modal")
      .evaluate((element) => getComputedStyle(element).transitionProperty),
  ).toContain("transform");
  await page.getByRole("button", { name: "ラボに戻る" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await hint.evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0s");
});

test("all labs succeed, reset, track progress and route without external requests", async ({
  page,
}) => {
  await skipTutorial(page);
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173/"))
      externalRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/labs/sql-injection/");
  for (const [index, lab] of labs.entries()) {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      lab.title,
    );
    await expect(
      page.getByRole("button", { name: lab.action, exact: true }),
    ).toBeDisabled();
    for (let hint = 1; hint <= 3; hint++) {
      await page.getByRole("button", { name: `ヒント${hint}を見る` }).click();
      await expect(page.locator(".hint-list li")).toHaveCount(hint);
      await expect(page.locator("#lab-hint + .hint-button")).toBeVisible();
    }
    await page.getByRole("button", { name: "ヒントを閉じる" }).click();
    await expect(page.locator("#lab-hint")).toBeHidden();
    await page.getByRole("button", { name: "答えと解説を表示" }).click();
    await expect(page.locator("#payload")).toHaveValue(lab.sample);
    await expect(page.locator(".hint-list li")).toHaveCount(3);
    await page.locator("#payload").press("Enter");
    await expect(page.getByText("正解です！", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: lab.successTitle, exact: true }),
    ).toBeFocused();
    expect(
      await page
        .locator(".results-inner")
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toContain("result-reveal");
    await expect(
      page.getByRole("heading", { name: lab.successTitle, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "実環境で悪用されると何が起きる？" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "この攻撃を防ぐには" }),
    ).toBeVisible();
    await expect(page.locator(".safe-code")).toBeVisible();
    await page.getByRole("button", { name: lab.action, exact: true }).click();
    await expect(page.locator("progress")).toHaveAttribute(
      "value",
      String(index + 1),
    );
    await page.getByRole("button", { name: "RESET", exact: true }).click();
    await expect(page.locator("#payload")).toHaveValue("");
    await expect(page.locator(".results-inner")).toBeEmpty();
    await expect(page.locator("#lab-hint")).toBeHidden();
    await expect(page.locator("#lab-answer")).toBeHidden();
    if (index < labs.length - 1)
      await page.getByRole("button", { name: "次の問題" }).click();
  }
  await expect(page.getByRole("button", { name: "次の問題" })).toBeDisabled();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("deep URLs, metadata, browser history and unknown paths", async ({
  page,
}) => {
  await skipTutorial(page);
  for (const lab of labs) {
    const response = await page.goto(`/labs/${lab.id}/`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      lab.title,
    );
    await expect(page).toHaveTitle(new RegExp(lab.title));
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      new RegExp(lab.title),
    );
  }
  await page.getByRole("button", { name: "前の問題" }).click();
  await expect(page).toHaveURL(/labs\/idor\/$/);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Open Redirect",
  );
  await expect(
    page.getByRole("heading", { name: "ログインリンク作成" }),
  ).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("IDOR");
  await expect(
    page.getByRole("heading", { name: "Report Archive" }),
  ).toBeFocused();
  await page.goto("/unknown");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "SQL Injection",
  );
  await expect(page.getByRole("button", { name: "前の問題" })).toBeDisabled();
});

test("about traps focus and returns focus to either opener", async ({
  page,
}) => {
  await skipTutorial(page);
  await page.goto("/");
  const opener = page
    .getByRole("button", { name: "このサイトについて", exact: true })
    .first();
  await opener.click();
  const back = page.getByRole("button", { name: "ラボに戻る" });
  await expect(page.getByRole("dialog")).toBeFocused();
  expect(
    await page.locator(".modal").evaluate((element) => element.scrollTop),
  ).toBe(0);
  const titleBox = await page.locator("#about-title").boundingBox();
  expect(titleBox!.y).toBeGreaterThanOrEqual(0);
  await expect(
    page.getByRole("heading", { name: "安全な利用について" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "データとプライバシー" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "運営・お問い合わせ" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Cookie、アクセス解析、広告、外部APIはアプリ内で使用しません。",
    ),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(back).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(back).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.locator(".labs-tab").hover();
  const sidebarOpener = page.locator(".sidebar-about");
  await sidebarOpener.click();
  await back.click();
  await expect(sidebarOpener).toBeFocused();
});

test("payload is always inert text, Enter submits XSS, and Shift+Enter adds a line", async ({
  page,
}) => {
  await skipTutorial(page);
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.goto("/labs/stored-xss/");
  await page
    .locator("#payload")
    .fill('<script>alert("<img src=x onerror=alert(2)>")</script>');
  await page.locator("#payload").press("Enter");
  await expect(page.locator(".pseudo-alert p")).toHaveText(
    "<img src=x onerror=alert(2)>",
  );
  await expect(page.locator(".pseudo-alert img")).toHaveCount(0);
  expect(dialogs).toEqual([]);
  await page.locator("#payload").fill("ordinary message");
  await expect(page.locator(".results-inner")).toBeEmpty();
  await page.locator("#payload").press("Shift+Enter");
  await expect(page.locator("#payload")).toHaveValue("ordinary message\n");
  await expect(page.locator(".results-inner")).toBeEmpty();
  await page.getByRole("button", { name: "投稿する", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "200 STORED AS TEXT" }),
  ).toBeVisible();
});

test("answer disclosure can close without clearing the populated sample", async ({
  page,
}) => {
  await skipTutorial(page);
  await page.goto("/");
  const open = page.getByRole("button", { name: "答えと解説を表示" });
  await open.click();
  const close = page.getByRole("button", { name: "答えと解説を閉じる" });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  await close.click();
  await expect(page.locator("#lab-answer")).toBeHidden();
  await expect(open).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#payload")).toHaveValue(labs[0]!.sample);
});

test("changing labs centers the problem form in the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await skipTutorial(page);
  await page.goto("/labs/sql-injection/");
  await page.getByRole("button", { name: "次の問題" }).click();
  await expect(page).toHaveURL(/labs\/path-traversal\/$/);
  await expect
    .poll(async () => {
      const box = await page.locator(".target-area").boundingBox();
      if (!box) return Number.POSITIVE_INFINITY;
      return Math.abs(box.y + box.height / 2 - 450);
    })
    .toBeLessThan(3);
  const focusedBox = await page
    .getByRole("heading", { name: "Document Viewer" })
    .boundingBox();
  expect(focusedBox!.y).toBeGreaterThanOrEqual(62);
  expect(focusedBox!.y + focusedBox!.height).toBeLessThanOrEqual(900);
});

for (const width of [360, 390, 768, 1280])
  test(`layout, sidebar and input focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await skipTutorial(page);
    await page.goto("/");
    await page.screenshot({
      path: `test-results/layout-${width}.png`,
      fullPage: true,
    });
    await expect(
      page.getByText(
        "入力は外部送信されません。許可された環境でのみ使用してください。",
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "このサイトについて", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "データとプライバシー" }),
    ).toBeVisible();
    const closeAbout = page.getByRole("button", { name: "ラボに戻る" });
    await closeAbout.scrollIntoViewIfNeeded();
    await closeAbout.click();
    for (const lab of labs) {
      await page.goto(`/labs/${lab.id}/`);
      await page.getByRole("button", { name: "答えと解説を表示" }).click();
      const missionBounds = await page.locator(".mission-panel").boundingBox();
      const terminalBounds = await page.locator(".terminal").boundingBox();
      expect(missionBounds!.y + missionBounds!.height).toBeLessThanOrEqual(
        terminalBounds!.y + terminalBounds!.height,
      );
      await page.getByRole("button", { name: lab.action, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width <= 780) {
        await page.locator("#payload").focus();
        await expect(page.locator(".bottom-navigation")).toBeHidden();
        await page.locator("#payload").blur();
        await expect(page.locator(".bottom-navigation")).toBeVisible();
      }
    }
    await page.locator(".labs-tab").focus();
    await expect(page.locator(".labs-tab")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator(".labs-tab")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.locator(".labs-tab")).toBeFocused();
  });

test("keyboard can enter LABS, choose a lab, and return to the workspace", async ({
  page,
}) => {
  await skipTutorial(page);
  await page.goto("/");
  await page.locator(".labs-tab").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".sidebar .icon-button")).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(".lab-choice").nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/labs\/path-traversal\/$/);
  await expect(
    page.getByRole("heading", { name: "Document Viewer" }),
  ).toBeFocused();
  await expect(page.locator(".labs-tab")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("touch drawer opens, overlay and Escape close it", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await skipTutorial(page);
  await page.goto("http://127.0.0.1:4173/");
  const tab = page.locator(".labs-tab");
  await tab.tap();
  await expect(tab).toHaveAttribute("aria-expanded", "true");
  await page.locator(".sidebar-overlay").tap({ position: { x: 380, y: 500 } });
  await expect(tab).toHaveAttribute("aria-expanded", "false");
  await tab.tap();
  await page.keyboard.press("Escape");
  await expect(tab).toHaveAttribute("aria-expanded", "false");
  await context.close();
});
