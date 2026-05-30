/**
 * Capturas de pantalla del estado actual del sistema EMPS Fresnillo,
 * para acompañar el documento Word entregable a ChatGPT Pro.
 *
 * Cubre las pantallas que el operador y el investigador realmente ven hoy.
 * Las imágenes se guardan en entregable-chatgpt/screenshots/.
 */
import { test, expect, Page } from "@playwright/test";
import path from "path";

const OUT_DIR = path.resolve(__dirname, "..", "entregable-chatgpt", "screenshots");

async function shot(page: Page, name: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

async function getDemoProjectId(page: Page): Promise<string> {
  const resp = await page.request.get("/api/projects");
  const json = await resp.json();
  expect(json.projects.length).toBeGreaterThan(0);
  return json.projects[0].id as string;
}

test.describe("Capturas del entregable", () => {
  test.describe.configure({ mode: "serial" });

  test("01_homepage_operador", async ({ page }) => {
    await page.goto("/");
    await shot(page, "01_homepage_operador");
  });

  test("02_lista_proyectos", async ({ page }) => {
    await page.goto("/projects");
    await shot(page, "02_lista_proyectos");
  });

  test("03_proyecto_detalle_hibrido_probable", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}`);
    await shot(page, "03_proyecto_detalle_hibrido_probable");
  });

  test("04_proyecto_detalle_tradicional_conservador", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}?mode=traditional&scenario=conservative`);
    await shot(page, "04_proyecto_detalle_tradicional_conservador");
  });

  test("05_proyecto_detalle_bytecoding_optimista", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}?mode=bytecoding_prompts&scenario=optimistic`);
    await shot(page, "05_proyecto_detalle_bytecoding_optimista");
  });

  test("06_modulos", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}/modules`);
    await shot(page, "06_modulos");
  });

  test("07_equipo", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}/team`);
    await shot(page, "07_equipo");
  });

  test("08_cambios", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}/changes`);
    await shot(page, "08_cambios");
  });

  test("09_estimar", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}/estimate`);
    await shot(page, "09_estimar");
  });

  test("10_reportes_hub", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}/reports`);
    await shot(page, "10_reportes_hub");
  });

  test("11_reporte_municipal", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}/reports/municipal`);
    await shot(page, "11_reporte_municipal");
  });

  test("12_reporte_proveedor", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}/reports/provider`);
    await shot(page, "12_reporte_proveedor");
  });

  test("13_admin_parametros", async ({ page }) => {
    await page.goto("/admin/parametros");
    await shot(page, "13_admin_parametros");
  });

  test("14_admin_calibracion", async ({ page }) => {
    await page.goto("/admin/calibracion");
    await shot(page, "14_admin_calibracion");
  });

  test("15_como_funciona", async ({ page }) => {
    await page.goto("/como-funciona");
    await shot(page, "15_como_funciona");
  });

  test("16_glossario", async ({ page }) => {
    await page.goto("/glossary");
    await shot(page, "16_glossario");
  });

  test("17_investigacion_dashboard", async ({ page }) => {
    await page.goto("/investigacion");
    await shot(page, "17_investigacion_dashboard");
  });

  test("18_investigacion_comparador_tecnico", async ({ page }) => {
    await page.goto("/investigacion/comparador-tecnico");
    await shot(page, "18_investigacion_comparador_tecnico");
  });

  test("19_investigacion_datasets", async ({ page }) => {
    await page.goto("/investigacion/datasets");
    await shot(page, "19_investigacion_datasets");
  });

  test("20_investigacion_modelos_ml", async ({ page }) => {
    await page.goto("/investigacion/modelos-ml");
    await shot(page, "20_investigacion_modelos_ml");
  });

  test("21_investigacion_fuentes_vivas", async ({ page }) => {
    await page.goto("/investigacion/fuentes-vivas");
    await shot(page, "21_investigacion_fuentes_vivas");
  });

  test("22_investigacion_bitacora", async ({ page }) => {
    await page.goto("/investigacion/bitacora");
    await shot(page, "22_investigacion_bitacora");
  });

  test("23_investigacion_casos_entrenamiento", async ({ page }) => {
    await page.goto("/investigacion/casos-entrenamiento");
    await shot(page, "23_investigacion_casos_entrenamiento");
  });

  test("24_investigacion_resultados_reales", async ({ page }) => {
    await page.goto("/investigacion/resultados-reales");
    await shot(page, "24_investigacion_resultados_reales");
  });

  test("25_investigacion_feedback_estimaciones", async ({ page }) => {
    await page.goto("/investigacion/feedback-estimaciones");
    await shot(page, "25_investigacion_feedback_estimaciones");
  });

  test("26_investigacion_reportes_academicos", async ({ page }) => {
    await page.goto("/investigacion/reportes-academicos");
    await shot(page, "26_investigacion_reportes_academicos");
  });

  test("27_reporte_academico", async ({ page }) => {
    const id = await getDemoProjectId(page);
    await page.goto(`/projects/${id}/reports/research`);
    await shot(page, "27_reporte_academico");
  });

  test("28_investigacion_usuarios_roles", async ({ page }) => {
    await page.goto("/investigacion/usuarios-y-roles");
    await shot(page, "28_investigacion_usuarios_roles");
  });
});
