import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const OUT = "docs/screenshots";
test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
test("25_admin_datasets", async ({ page }) => {
  await page.goto("/admin/datasets");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT, "25_admin_datasets.png"), fullPage: true });
});
test("26_admin_fuentes_vivas", async ({ page }) => {
  await page.goto("/admin/fuentes-vivas");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT, "26_admin_fuentes_vivas.png"), fullPage: true });
});
test("27_admin_modelos_ml", async ({ page }) => {
  await page.goto("/admin/modelos-ml");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT, "27_admin_modelos_ml.png"), fullPage: true });
});
