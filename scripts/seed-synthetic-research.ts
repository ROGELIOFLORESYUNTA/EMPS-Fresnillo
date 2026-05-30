/**
 * SEED SINTETICO (dev only) — Genera 50 TrainingCases con dispersion realista
 * para verificar que el panel /investigacion/validacion-hipotesis funciona.
 *
 * Marca cada caso con sourceKind = "simulated_dev_only" y notes con leyenda
 * de borrar antes de produccion. Borrar con cleanup-synthetic-research.ts.
 *
 * Modelo generador (basado en literatura COCOMO II + IFPUG):
 *   mape ~ N(40 - 5*clarity + 8*(1-changes_anticipated) + 6*(traditional vs ai), sd=8)
 *
 * Esto debe arrojar veredicto "cumplida" o "parcialmente cumplida" en /validacion.
 * Si arroja "no cumplida" hay algo malo con el generador o el motor.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SOURCE_MARK = "simulated_dev_only";

const MODES = ["traditional", "ai_assisted", "hybrid", "bytecoding_prompts", "low_code"] as const;

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log(`Generando 50 TrainingCase con marca '${SOURCE_MARK}'...`);
  for (let i = 0; i < 50; i++) {
    const mode = pick(MODES);
    const clarity = 20 + Math.floor(Math.random() * 80); // 20-100
    const changesAnticipated = Math.floor(Math.random() * 5);
    const actualChanges = changesAnticipated + Math.floor(Math.random() * 4);
    const changesRatio = actualChanges === 0 ? 1 : changesAnticipated / actualChanges;
    const modulesCount = 2 + Math.floor(Math.random() * 8);

    // Modelo de error sintetico
    const baseError = 40 - 0.3 * clarity + 8 * (1 - changesRatio);
    const modeOffset = mode === "ai_assisted" ? -3 : mode === "bytecoding_prompts" ? -6 : mode === "low_code" ? -4 : 0;
    const noise = randn() * 8;
    const mape = Math.max(0, baseError + modeOffset + noise);
    const estHours = 80 + modulesCount * 20 + Math.floor(Math.random() * 40);
    const actualHours = Math.round(estHours * (1 + mape / 100));
    const estCost = estHours * 500;
    const actualCost = actualHours * 500;

    await prisma.trainingCase.create({
      data: {
        sourceKind: SOURCE_MARK,
        projectType: pick(["transactional", "portal_ciudadano", "integrador", "dashboard"]),
        municipalArea: pick(["Catastro", "Tesoreria", "Obras Publicas", "Servicios"]),
        moduleCount: modulesCount,
        integrationCount: Math.floor(Math.random() * 3),
        screenCount: modulesCount * 3,
        reportCount: Math.floor(Math.random() * 5),
        sensitiveData: Math.random() < 0.3,
        requirementsClarity: clarity,
        stakeholderAvailability: 30 + Math.floor(Math.random() * 70),
        changeVolatility: Math.floor(Math.random() * 100),
        teamExperience: 40 + Math.floor(Math.random() * 60),
        devModeCode: mode,
        estimatedEffortHours: estHours,
        actualEffortHours: actualHours,
        estimatedCostMxn: estCost,
        actualCostMxn: actualCost,
        changeCount: actualChanges,
        maintenanceMonths: 3 + Math.floor(Math.random() * 12),
        fiscalLaborRiskScore: Math.random() * 100,
        paymentScheme: pick(["40_40_20", "30_30_40", "50_50"]),
        labelQuality: "weak",
        notes: `TEMPORAL — generado por seed-synthetic-research.ts. Borrar con cleanup-synthetic-research.ts antes de produccion.`,
      },
    });
  }
  console.log("Done. 50 TrainingCases creados.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
