// Verification tooling only: a static server with no SPA fallback.
// None of this Node.js file is included in the browser application.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";
import { labs } from "../src/lib/labs.ts";

const base = process.env.VITE_BASE_PATH || "/";
const root = resolve("dist");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".txt": "text/plain",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url || "/", "http://localhost").pathname,
    );
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }
    const relative = pathname.slice(base.length);
    const path = resolve(
      root,
      relative + (pathname.endsWith("/") ? "index.html" : ""),
    );
    if (!path.startsWith(root + sep)) {
      response.writeHead(404).end();
      return;
    }
    const file = await readFile(path);
    response
      .writeHead(200, {
        "Content-Type": mime[extname(path)] || "application/octet-stream",
      })
      .end(file);
  } catch {
    response.writeHead(404).end();
  }
});
let origin = process.env.CHECK_ORIGIN;
if (!origin) {
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
}
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL,
});
try {
  const page = await browser.newPage();
  await page.addInitScript(() =>
    localStorage.setItem("byte-breaker-tutorial-complete", "true"),
  );
  const external = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith(origin + "/")) external.push(request.url());
  });
  for (const lab of labs) {
    const response = await page.goto(`${origin}${base}labs/${lab.id}/`);
    assert.equal(response.status(), 200);
    await page
      .getByRole("heading", { level: 1 })
      .filter({ hasText: lab.title })
      .waitFor();
    await page.locator("#payload").fill(lab.sample);
    await page.getByRole("button", { name: lab.action, exact: true }).click();
    await page
      .getByRole("heading", { name: lab.successTitle, exact: true })
      .waitFor();
    console.log(`PASS ${base}labs/${lab.id}/`);
  }
  await page.getByRole("button", { name: "前の問題" }).click();
  assert.equal(new URL(page.url()).pathname, `${base}labs/idor/`);
  await page.goBack();
  await page
    .getByRole("heading", { level: 1 })
    .filter({ hasText: "Open Redirect" })
    .waitFor();
  await page.goForward();
  await page
    .getByRole("heading", { level: 1 })
    .filter({ hasText: "IDOR" })
    .waitFor();
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(
    `PASS: 6 direct URLs, sample answers, history, no external requests (${base})`,
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
