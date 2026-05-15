/**
 * Capturas automatizadas de las páginas principales.
 * Genera PNG en docs/screenshots/ con nombres descriptivos para
 * incluir en el documento del artículo y como evidencia técnica.
 *
 * Uso:
 *   npm run screenshots          (asume dev server corriendo)
 *   npm run screenshots:ci       (Playwright levanta el server)
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "docs/screenshots";

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

async function snap(page: Page, name: string, opts: { fullPage?: boolean } = {}) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
}

async function getProjectId(page: Page): Promise<string> {
  const res = await page.request.get("/api/projects");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.projects.length).toBeGreaterThan(0);
  return data.projects[0].id as string;
}

test.describe("Capturas de pantalla principales", () => {
  test("01_dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /EMPS Fresnillo/i }).first()).toBeVisible();
    await snap(page, "01_dashboard");
  });

  test("02_projects_list", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: /Proyectos/i })).toBeVisible();
    await snap(page, "02_projects_list");
  });

  test("03_new_project_form", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(page.getByRole("heading", { name: /Nuevo proyecto/i })).toBeVisible();
    await snap(page, "03_new_project_form");
  });

  test("04_project_detail", async ({ page }) => {
    const id = await getProjectId(page);
    await page.goto(`/projects/${id}`);
    await snap(page, "04_project_detail");
  });

  test("05_project_modules", async ({ page }) => {
    const id = await getProjectId(page);
    await page.goto(`/projects/${id}/modules`);
    await expect(page.getByRole("heading", { name: /Módulos/i })).toBeVisible();
    await snap(page, "05_project_modules");
  });

  test("06_project_team", async ({ page }) => {
    const id = await getProjectId(page);
    await page.goto(`/projects/${id}/team`);
    await snap(page, "06_project_team");
  });

  test("07_project_estimate_wizard", async ({ page }) => {
    const id = await getProjectId(page);
    await page.goto(`/projects/${id}/estimate`);
    await snap(page, "07_project_estimate_wizard");
  });

  test("08_reports_hub", async ({ page }) => {
    const id = await getProjectId(page);
    await page.goto(`/projects/${id}/reports`);
    await snap(page, "08_reports_hub");
  });

  test("09_report_municipal", async ({ page }) => {
    const id = await getProjectId(page);
    await page.goto(`/projects/${id}/reports/municipal`);
    await snap(page, "09_report_municipal");
  });

  test("10_report_provider", async ({ page }) => {
    const id = await getProjectId(page);
    await page.goto(`/projects/${id}/reports/provider`);
    await snap(page, "10_report_provider");
  });

  test("11_report_research", async ({ page }) => {
    const id = await getProjectId(page);
    await page.goto(`/projects/${id}/reports/research`);
    await snap(page, "11_report_research");
  });

  test("12_comparator_5_modes", async ({ page }) => {
    await page.goto("/comparator");
    await expect(page.getByRole("heading", { name: /Comparador/i })).toBeVisible();
    await snap(page, "12_comparator_5_modes");
  });

  test("13_parameters_2026", async ({ page }) => {
    await page.goto("/parameters");
    await snap(page, "13_parameters_2026");
  });

  test("14_datasets", async ({ page }) => {
    await page.goto("/datasets");
    await snap(page, "14_datasets");
  });

  test("15_live_sources", async ({ page }) => {
    await page.goto("/live-sources");
    await snap(page, "15_live_sources");
  });

  test("16_ml_models", async ({ page }) => {
    await page.goto("/ml-models");
    await snap(page, "16_ml_models");
  });

  test("17_glossary", async ({ page }) => {
    await page.goto("/glossary");
    await snap(page, "17_glossary");
  });

  test("18_audit_log", async ({ page }) => {
    await page.goto("/audit");
    await snap(page, "18_audit_log");
  });

  test("19_users_roles", async ({ page }) => {
    await page.goto("/users");
    await snap(page, "19_users_roles");
  });
});
