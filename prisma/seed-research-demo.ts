/**
 * Seed de EJEMPLO para investigación: crea ~18 proyectos CERRADOS con su
 * estimación y su resultado real, para que el panel de validación de hipótesis
 * tenga datos y se pueda VER el reporte de métricas antes de tener casos reales.
 *
 * - Todos viven en un workspace dedicado `wsk_research_demo` (no aparecen a los
 *   visitantes normales por el aislamiento de workspace; el análisis admin es
 *   global y SÍ los incluye).
 * - El resultado real está diseñado con SEÑAL: a menor claridad y más
 *   integraciones, mayor desviación (MAPE); la estimación fiscal integral
 *   (costMode detailed) desvía menos. Así la regresión y la prueba de
 *   Mann-Whitney encuentran algo defendible (no son números planos).
 *
 * Uso:   npx tsx prisma/seed-research-demo.ts
 * Limpia: npx tsx prisma/clear-research-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";
import { runEstimate } from "../lib/estimate-service";
import type { DevelopmentMode } from "../lib/engine";

const prisma = new PrismaClient();
const DEMO_WS = "wsk_research_demo";
const PREFIX = "[DEMO investigación]";

const MODES: DevelopmentMode[] = ["traditional", "ai_assisted", "hybrid", "bytecoding_prompts", "low_code"];

interface DemoSpec {
  name: string;
  systemType: string;
  area: string;
  modules: { type: string; complexity: number; clarity: number; criticality: number; integrations: number; screens: number }[];
  mode: DevelopmentMode;
  costMode: "detailed" | "estimated";
  actualChangeCount: number;
  anticipatedChanges: number;
}

/** 18 proyectos con características variadas pero deterministas. */
function buildSpecs(): DemoSpec[] {
  const systemTypes = ["crud_interno", "portal_ciudadano", "integrador", "tramite_linea", "tablero"];
  const areas = ["Catastro", "Tesorería", "Obras Públicas", "Innovación", "Registro Civil", "Agua Potable"];
  const specs: DemoSpec[] = [];
  for (let i = 0; i < 18; i++) {
    const clarity = 1 + (i % 5);                 // 1..5 ciclo
    const criticality = 2 + (i % 4);             // 2..5
    const integrations = i % 5;                  // 0..4
    const nModules = 2 + (i % 4);                // 2..5
    const modules = Array.from({ length: nModules }, (_, k) => ({
      type: ["catalogo", "transaccional", "reporte", "integracion", "flujo"][(i + k) % 5],
      complexity: 1 + ((i + k) % 5),
      clarity: Math.max(1, Math.min(5, clarity + ((k % 2 === 0) ? 0 : -1))),
      criticality: Math.max(1, Math.min(5, criticality + (k % 2))),
      integrations: k === 0 ? integrations : Math.max(0, integrations - 1),
      screens: 2 + ((i + k) % 6),
    }));
    specs.push({
      name: `${PREFIX} ${systemTypes[i % systemTypes.length]} ${areas[i % areas.length]} ${i + 1}`,
      systemType: systemTypes[i % systemTypes.length],
      area: areas[i % areas.length],
      modules,
      mode: MODES[i % MODES.length],
      costMode: i % 2 === 0 ? "detailed" : "estimated",
      actualChangeCount: i % 4,
      anticipatedChanges: i % 3,
    });
  }
  return specs;
}

/** Jitter determinista en [-0.10, 0.10] a partir del índice (ruido realista). */
function jitter(i: number): number {
  return (((i * 53) % 21) - 10) / 100;
}

async function main() {
  const existing = await prisma.project.count({ where: { workspaceId: DEMO_WS } });
  if (existing > 0) {
    console.log(`Ya hay ${existing} proyectos demo de investigación. Corre primero clear-research-demo.ts si quieres regenerarlos. Saltando.`);
    return;
  }

  await prisma.workspace.upsert({
    where: { id: DEMO_WS },
    create: { id: DEMO_WS, displayName: "Datos de ejemplo (investigación)", role: "investigador", lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });

  const specs = buildSpecs();
  let creados = 0;

  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const project = await prisma.project.create({
      data: {
        name: s.name,
        client: "Ayuntamiento de Fresnillo",
        clientType: "municipal",
        municipalArea: s.area,
        objective: "Caso de ejemplo para validar la metodología de estimación con datos cerrados.",
        systemType: s.systemType,
        status: "cerrado",
        priority: "media",
        workspaceId: DEMO_WS,
        isTemplate: false,
        modules: {
          create: s.modules.map((m, k) => ({
            name: `Módulo ${k + 1}`,
            type: m.type,
            complexity: m.complexity,
            clarity: m.clarity,
            criticality: m.criticality,
            screensCount: m.screens,
            reportsCount: 1,
            catalogsCount: 1,
            integrationsCount: m.integrations,
            sensitiveData: m.criticality >= 4,
          })),
        },
        team: {
          create: [
            { name: "Líder técnico", role: "lider_tecnico", level: "lead", monthlySalary: new Decimal(45000), monthsAssigned: new Decimal(3), contractType: "nomina" },
            { name: "Desarrollador", role: "dev_senior", level: "senior", monthlySalary: new Decimal(32000), monthsAssigned: new Decimal(3), contractType: "nomina" },
          ],
        },
      },
      include: { modules: true },
    });

    // Cambios anticipados (ChangeRequest) para variar changes_anticipated_ratio
    for (let c = 0; c < s.anticipatedChanges; c++) {
      await prisma.changeRequest.create({
        data: {
          projectId: project.id,
          requesterName: "Área usuaria",
          description: `Ajuste de alcance ${c + 1} previsto durante el desarrollo.`,
          type: "nuevo_alcance",
          timeImpactHours: new Decimal(8),
          costImpact: new Decimal(6000),
          decision: "aprobado",
        },
      });
    }

    // Correr estimación (genera los 3 escenarios; usamos el "probable")
    await runEstimate({
      projectId: project.id,
      mode: s.mode,
      targetMargin: 0.2,
      weeklyTeamCapacityHours: 80,
      costMode: s.costMode,
      capitalDeclaredByProvider: 80000,
      cashFlowAssumptions: { anticipoPct: 0.3, finalPaymentPct: 0.3, durationMonths: 3, monthlyToolsCost: 3000, monthlyAdminCost: 5000 },
    });

    const est = await prisma.estimate.findFirst({
      where: { projectId: project.id, scenario: "probable" },
      orderBy: { createdAt: "desc" },
    });
    if (!est) {
      console.log(`  ! ${s.name}: sin estimación probable, saltando resultado real.`);
      continue;
    }

    const estHours =
      Number(est.analysisHours) + Number(est.designHours) + Number(est.codingHours) +
      Number(est.reviewHours) + Number(est.testingHours) + Number(est.documentationHours) +
      Number(est.deploymentHours) + Number(est.trainingHours) + Number(est.supportHours) +
      Number(est.hardeningHours);
    const estCost = Number(est.total);

    const avgClarity = s.modules.reduce((a, m) => a + m.clarity, 0) / s.modules.length;
    const totalIntegrations = s.modules.reduce((a, m) => a + m.integrations, 0);
    const avgCriticality = s.modules.reduce((a, m) => a + m.criticality, 0) / s.modules.length;

    // SEÑAL: desviación de horas crece con baja claridad / integraciones / criticidad;
    // la estimación fiscal integral (detailed) la reduce. Siempre sobrecosto (realista).
    const overrunHours =
      0.02 +
      (5 - avgClarity) * 0.06 +
      totalIntegrations * 0.018 +
      (avgCriticality - 3) * 0.015 +
      (s.costMode === "detailed" ? -0.05 : 0.0) +
      jitter(i);
    const overrunCost = overrunHours * 0.85 + jitter(i + 5);

    const actualHours = Math.max(1, estHours * (1 + Math.max(0, overrunHours)));
    const actualCost = Math.max(1, estCost * (1 + Math.max(0, overrunCost)));

    const start = new Date(2026, 0, 1 + i);
    const end = new Date(2026, 3, 1 + i);

    const result = await prisma.projectActualResult.create({
      data: {
        projectId: project.id,
        estimateId: est.id,
        actualStartDate: start,
        actualEndDate: end,
        actualEffortHours: new Decimal(actualHours.toFixed(1)),
        actualTotalCostMxn: new Decimal(actualCost.toFixed(0)),
        actualChangeCount: s.actualChangeCount,
        actualMaintenanceCostMxn: new Decimal((actualCost * 0.05).toFixed(0)),
        wasCompleted: true,
        mainDeviationReason:
          avgClarity <= 2 ? "Requerimientos poco claros al inicio." :
          totalIntegrations >= 3 ? "Integraciones más complejas de lo previsto." :
          "Desviación menor dentro de lo esperado.",
        lessonsLearned: "Capturar mejor el alcance y las integraciones desde el inicio.",
      },
    });

    // TrainingCase derivado (igual que el endpoint real)
    await prisma.trainingCase.create({
      data: {
        sourceKind: "local_capture",
        sourceRecordId: result.id,
        projectType: s.systemType,
        municipalArea: s.area,
        moduleCount: project.modules.length,
        userStoryCount: 0,
        devModeCode: est.mode,
        estimatedEffortHours: new Decimal(estHours.toFixed(1)),
        actualEffortHours: new Decimal(actualHours.toFixed(1)),
        estimatedCostMxn: new Decimal(Number(est.subtotal).toFixed(0)),
        actualCostMxn: new Decimal(actualCost.toFixed(0)),
        changeCount: s.actualChangeCount,
        labelQuality: "strong",
        notes: `Caso de ejemplo de investigación (${DEMO_WS}).`,
      },
    });

    creados++;
    const mape = (Math.abs(estHours - actualHours) / actualHours) * 100;
    console.log(`  ${creados}. ${s.name} · modo ${s.mode} · fiscal ${s.costMode} · MAPE horas ${mape.toFixed(1)}%`);
  }

  console.log(`\nListo: ${creados} proyectos cerrados de ejemplo en workspace ${DEMO_WS}.`);
  console.log("Entra como admin a /investigacion/validacion-hipotesis y corre el análisis.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
