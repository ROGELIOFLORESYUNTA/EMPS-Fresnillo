import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "docs/screenshots";

test.beforeAll(() => fs.mkdirSync(OUT_DIR, { recursive: true }));

test("20_admin_parametros", async ({ page }) => {
  await page.goto("/admin/parametros");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT_DIR, "20_admin_parametros.png"), fullPage: true });
});

test("21_admin_parametros_editar", async ({ page }) => {
  const r = await page.request.get("/api/parameters?year=2026");
  const data = await r.json();
  const ivaParam = data.parameters.find((p: { key: string }) => p.key === "IVA_GENERAL");
  await page.goto(`/admin/parametros/${ivaParam.id}/editar`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT_DIR, "21_admin_parametros_editar.png"), fullPage: true });
});

test("22_admin_cargar_anio", async ({ page }) => {
  await page.goto("/admin/parametros/cargar-anio");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT_DIR, "22_admin_cargar_anio.png"), fullPage: true });
});

test("23_changes_management", async ({ page }) => {
  const r = await page.request.get("/api/projects");
  const data = await r.json();
  await page.goto(`/projects/${data.projects[0].id}/changes`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT_DIR, "23_changes_management.png"), fullPage: true });
});

test("24_stories_management", async ({ page }) => {
  const r = await page.request.get("/api/projects");
  const data = await r.json();
  const projectId = data.projects[0].id;
  const mr = await page.request.get(`/api/projects/${projectId}/modules`);
  const md = await mr.json();
  await page.goto(`/projects/${projectId}/modules/${md.modules[0].id}/stories`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT_DIR, "24_stories_management.png"), fullPage: true });
});
