const { test, expect } = require("@playwright/test");

const pages = {
  "index.html": /Qitao Shi/,
  "projects.html": /Projects/,
  "ray-tracer.html": /Ray Tracer/,
  "salt-bread.html": /Salt Bread/,
  "side-quests.html": /Side Quests/,
  "tennis.html": /Tennis/,
};

for (const [path, title] of Object.entries(pages)) {
  test(`${path} loads without errors`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));

    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
}

test("internal links resolve", async ({ page, request }) => {
  await page.goto("index.html");
  const hrefs = await page.$$eval("a[href$='.html']", (as) => [...new Set(as.map((a) => a.href))]);
  for (const href of hrefs) {
    expect((await request.get(href)).status(), href).toBe(200);
  }
});
