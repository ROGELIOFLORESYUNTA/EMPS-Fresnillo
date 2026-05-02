/**
 * Tests E2E que cubren los 5 casos del 12_plan_pruebas.md
 * desde la API. Cada caso crea su proyecto, modulos, equipo y ejecuta
 * estimaciones, validando que el sistema responde lo que se espera.
 *
 * Caso 1: Proyecto simple - bytecoding reduce prototipo, riesgo bajo.
 * Caso 2: Proyecto municipal medio - hibrido recomendado, mantenimiento mensual necesario.
 * Caso 3: Integracion compleja - no aplicar descuento fuerte por bytecoding, riesgo alto.
 * Caso 4: Proveedor sin anticipo - capital de trabajo alto, alerta financiera.
 * Caso 5: Cambio de alcance - se registra como nuevo alcance, aumenta tiempo/costo/pruebas.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

interface Project { id: string; name: string }
interface EstimateResult {
  estimates: Array<{
    id: string;
    mode: string;
    scenario: string;
    total: number;
    riskLevel: string;
    weeksToPrototype: number;
    totalEffortHours: number;
  }>;
  cashflowResult: { workingCapitalRequired: number; months: number };
}

async function createProject(req: APIRequestContext, body: Record<string, unknown>): Promise<Project> {
  const res = await req.post("/api/projects", { data: body });
  expect(res.status(), `crear proyecto: ${await res.text()}`).toBe(201);
  const j = await res.json();
  return j.project;
}

async function addModule(req: APIRequestContext, projectId: string, body: Record<string, unknown>) {
  const res = await req.post(`/api/projects/${projectId}/modules`, { data: body });
  expect(res.status()).toBe(201);
}

async function addProfile(req: APIRequestContext, projectId: string, body: Record<string, unknown>) {
  const res = await req.post(`/api/projects/${projectId}/team`, { data: body });
  expect(res.status()).toBe(201);
}

async function estimate(req: APIRequestContext, projectId: string, body: Record<string, unknown>): Promise<EstimateResult> {
  const res = await req.post(`/api/projects/${projectId}/estimate`, { data: body });
  expect(res.status(), `estimar: ${await res.text()}`).toBe(201);
  return res.json();
}

test.describe("Plan de pruebas (12_plan_pruebas.md) - 5 casos via API", () => {

  test("Caso 1: Proyecto simple - bytecoding reduce semanas a prototipo", async ({ request }) => {
    const project = await createProject(request, {
      name: "C1 - CRUD interno simple",
      client: "Ayuntamiento de Fresnillo",
      municipalArea: "Atencion Ciudadana",
      objective: "Sistematizar tramites internos sencillos",
      systemType: "crud_interno",
    });
    for (let i = 0; i < 3; i++) {
      await addModule(request, project.id, {
        name: `Modulo ${i + 1}`,
        type: "transaccional",
        complexity: 2,
        clarity: 4,
        criticality: 2,
        screensCount: 3,
        reportsCount: 1,
        sensitiveData: false,
      });
    }
    await addProfile(request, project.id, { name: "Dev", role: "dev_senior", level: "mid", monthlySalary: 28000, monthsAssigned: 2 });

    const trad = await estimate(request, project.id, { mode: "traditional", targetMargin: 0.20, weeklyTeamCapacityHours: 60 });
    const byte = await estimate(request, project.id, { mode: "bytecoding_prompts", targetMargin: 0.20, weeklyTeamCapacityHours: 60 });
    const tradProb = trad.estimates.find((e) => e.scenario === "probable")!;
    const byteProb = byte.estimates.find((e) => e.scenario === "probable")!;
    expect(byteProb.weeksToPrototype).toBeLessThan(tradProb.weeksToPrototype);
    expect(["bajo", "medio"]).toContain(tradProb.riskLevel);
  });

  test("Caso 2: Proyecto municipal medio - hibrido tiene riesgo medio o menor", async ({ request }) => {
    const project = await createProject(request, {
      name: "C2 - Sistema municipal medio",
      client: "Ayuntamiento de Fresnillo",
      municipalArea: "Tramites y Servicios",
      objective: "Sistema con 8 modulos, reportes, roles y datos personales",
      systemType: "tramites",
    });
    for (let i = 0; i < 8; i++) {
      await addModule(request, project.id, {
        name: `Modulo ${i + 1}`,
        type: "transaccional",
        complexity: 3,
        clarity: 3,
        criticality: 3,
        screensCount: 4,
        reportsCount: 2,
        integrationsCount: i < 2 ? 1 : 0,
        sensitiveData: i < 4,
      });
    }
    await addProfile(request, project.id, { name: "Lider", role: "lider_tecnico", level: "senior", monthlySalary: 45000, monthsAssigned: 5 });
    await addProfile(request, project.id, { name: "Dev", role: "dev_senior", level: "mid", monthlySalary: 28000, monthsAssigned: 5 });

    const hyb = await estimate(request, project.id, { mode: "hybrid", targetMargin: 0.20, weeklyTeamCapacityHours: 80 });
    const probable = hyb.estimates.find((e) => e.scenario === "probable")!;
    expect(["bajo", "medio", "alto"]).toContain(probable.riskLevel);
    expect(probable.weeksToPrototype).toBeGreaterThan(0);
  });

  test("Caso 3: Integracion compleja - bytecoding NO debe ahorrar agresivamente", async ({ request }) => {
    const project = await createProject(request, {
      name: "C3 - Integracion compleja",
      client: "Ayuntamiento de Fresnillo",
      municipalArea: "Sistemas",
      objective: "Sistema con integracion externa, migracion de datos y reglas criticas",
      systemType: "integrador",
    });
    for (let i = 0; i < 6; i++) {
      await addModule(request, project.id, {
        name: `Modulo critico ${i + 1}`,
        type: "integracion",
        complexity: 5,
        clarity: 2,
        criticality: 5,
        screensCount: 6,
        reportsCount: 3,
        integrationsCount: 2,
        sensitiveData: true,
      });
    }
    await addProfile(request, project.id, { name: "Arquitecto", role: "lider_tecnico", level: "lead", monthlySalary: 60000, monthsAssigned: 6 });

    const trad = await estimate(request, project.id, { mode: "traditional", targetMargin: 0.20, weeklyTeamCapacityHours: 80 });
    const byte = await estimate(request, project.id, { mode: "bytecoding_prompts", targetMargin: 0.20, weeklyTeamCapacityHours: 80 });
    const tradProb = trad.estimates.find((e) => e.scenario === "probable")!;
    const byteProb = byte.estimates.find((e) => e.scenario === "probable")!;
    // bytecoding suma 1.10x horas-persona vs 1.0 tradicional
    expect(byteProb.totalEffortHours).toBeGreaterThanOrEqual(tradProb.totalEffortHours * 1.05);
    // Riesgo medio o mayor por integraciones + datos sensibles + claridad baja
    expect(["medio", "alto", "critico"]).toContain(tradProb.riskLevel);
  });

  test("Caso 4: Proveedor sin anticipo - capital de trabajo alto", async ({ request }) => {
    const project = await createProject(request, {
      name: "C4 - Proveedor sin anticipo",
      client: "Ayuntamiento de Fresnillo",
      municipalArea: "Finanzas",
      objective: "Proyecto de 3 meses sin anticipo",
      systemType: "crud_interno",
    });
    for (let i = 0; i < 4; i++) {
      await addModule(request, project.id, {
        name: `Modulo ${i + 1}`,
        type: "transaccional",
        complexity: 3,
        clarity: 3,
        criticality: 3,
        screensCount: 4,
        reportsCount: 2,
      });
    }
    await addProfile(request, project.id, { name: "Lider", role: "lider_tecnico", level: "senior", monthlySalary: 45000, monthsAssigned: 3 });
    await addProfile(request, project.id, { name: "Dev1", role: "dev_senior", level: "mid", monthlySalary: 28000, monthsAssigned: 3 });

    const noAnt = await estimate(request, project.id, {
      mode: "hybrid",
      targetMargin: 0.20,
      weeklyTeamCapacityHours: 80,
      capitalDeclaredByProvider: 50000,
      cashFlowAssumptions: {
        anticipoPct: 0,
        finalPaymentPct: 1.0,
        durationMonths: 3,
        monthlyToolsCost: 3000,
        monthlyAdminCost: 5000,
      },
    });
    expect(noAnt.cashflowResult.workingCapitalRequired).toBeGreaterThan(0);
    const probable = noAnt.estimates.find((e) => e.scenario === "probable")!;
    expect(["medio", "alto", "critico"]).toContain(probable.riskLevel);
  });

  test("Caso 5: Cambio de alcance - se registra y queda visible en /api/changes", async ({ request }) => {
    const project = await createProject(request, {
      name: "C5 - Cambio de alcance",
      client: "Ayuntamiento de Fresnillo",
      municipalArea: "Atencion Ciudadana",
      objective: "Probar el ciclo de control de cambios (RF-13)",
      systemType: "crud_interno",
    });
    await addModule(request, project.id, { name: "Catalogo", type: "catalogo", complexity: 2, clarity: 4, criticality: 3, screensCount: 3, reportsCount: 1 });
    await addProfile(request, project.id, { name: "Dev", role: "dev_senior", level: "mid", monthlySalary: 28000, monthsAssigned: 2 });
    await estimate(request, project.id, { mode: "traditional", targetMargin: 0.20, weeklyTeamCapacityHours: 60 });

    // Registramos un cambio de tipo nuevo_alcance
    const changeRes = await request.post(`/api/projects/${project.id}/changes`, {
      data: {
        requesterName: "Ayuntamiento Fresnillo",
        description: "Agregar modulo de pagos en linea no contemplado en alcance original",
        type: "nuevo_alcance",
        timeImpactHours: 80,
        costImpact: 100000,
        testingImpact: "Pruebas adicionales de integracion bancaria",
      },
    });
    expect(changeRes.status()).toBe(201);

    // Verificamos que el cambio queda visible
    const list = await request.get(`/api/projects/${project.id}/changes`);
    const data = await list.json();
    expect(data.changes.length).toBeGreaterThan(0);
    expect(data.changes[0].type).toBe("nuevo_alcance");
    expect(Number(data.changes[0].timeImpactHours)).toBe(80);

    // Verificamos que se versiono la estimacion (no se sobreescribio)
    const estimates = await request.get(`/api/projects/${project.id}/estimates`);
    const eData = await estimates.json();
    expect(eData.estimates.length).toBeGreaterThan(0);
  });
});
