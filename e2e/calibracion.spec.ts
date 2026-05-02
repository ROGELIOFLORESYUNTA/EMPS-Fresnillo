import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT = "docs/screenshots";
test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test("28_calibracion_motor", async ({ page }) => {
  await page.goto("/admin/calibracion");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT, "28_calibracion_motor.png"), fullPage: true });
});

test("29_admin_parametros_con_calibracion", async ({ page }) => {
  await page.goto("/admin/parametros");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT, "29_admin_parametros_con_calibracion.png"), fullPage: true });
});
