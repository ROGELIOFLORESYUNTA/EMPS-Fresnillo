/**
 * Borra estimaciones/cashflow viejos, actualiza parámetro DEV_MODE_VELOCITY
 * con la nueva calibración (más realista, basada en evidencia 2026), y
 * regenera estimaciones del proyecto demo con los nuevos factores.
 */
import { PrismaClient } from "@prisma/client";
import { runEstimate } from "../lib/estimate-service";
import seedData from "../17_seed_data_parametros_2026.json";
import type { DevelopmentMode } from "../lib/engine";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Reseteo de estimaciones y recalibración ===\n");

  // 1. Listar proyectos
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, _count: { select: { estimates: true, modules: true, team: true } } },
  });
  console.log(`Proyectos encontrados: ${projects.length}`);
  for (const p of projects) {
    console.log(`  - ${p.name} | ${p._count.estimates} estimaciones, ${p._count.modules} mod, ${p._count.team} perfiles`);
  }

  // 2. Borrar estimaciones y cashflow
  const delEst = await prisma.estimate.deleteMany({});
  const delCf = await prisma.cashFlowLine.deleteMany({});
  console.log(`\nBorradas: ${delEst.count} estimaciones, ${delCf.count} líneas de flujo`);

  // 3. Actualizar Parameter DEV_MODE_VELOCITY con nueva calibración
  const newVelocity = seedData.development_mode_velocity;
  await prisma.parameter.updateMany({
    where: { key: "DEV_MODE_VELOCITY", year: 2026 },
    data: { value: JSON.stringify(newVelocity) },
  });
  console.log("Parámetro DEV_MODE_VELOCITY actualizado con nueva calibración (basada en evidencia)");

  // 4. Re-estimar cada proyecto con datos completos para los 5 modos
  console.log("\nRegenerando estimaciones para cada proyecto...");
  for (const p of projects) {
    if (p._count.modules === 0 || p._count.team === 0) {
      console.log(`  ${p.name}: SKIP (faltan módulos o equipo)`);
      continue;
    }
    const modes: DevelopmentMode[] = ["traditional", "ai_assisted", "bytecoding_prompts", "low_code", "hybrid"];
    for (const mode of modes) {
      try {
        await runEstimate({
          projectId: p.id,
          mode,
          targetMargin: 0.20,
          weeklyTeamCapacityHours: 80,
          costMode: "detailed",
          capitalDeclaredByProvider: 100000,
          cashFlowAssumptions: {
            anticipoPct: 0.30,
            finalPaymentPct: 0.30,
            durationMonths: 3,
            monthlyToolsCost: 3000,
            monthlyAdminCost: 5000,
          },
        });
      } catch (e) {
        console.log(`    ${p.name}/${mode}: error - ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    console.log(`  ${p.name}: 5 modos × 3 escenarios = 15 estimaciones generadas`);
  }

  console.log("\n=== Resumen final ===");
  const final = await prisma.estimate.count();
  console.log(`Total estimaciones: ${final}`);
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
