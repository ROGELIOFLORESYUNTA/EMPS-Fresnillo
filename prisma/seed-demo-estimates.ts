/**
 * Seed adicional: ejecuta estimaciones para el proyecto demo en los 5 modos
 * + 3 escenarios cada uno (= 15 estimaciones por modo) y deja capital de trabajo
 * sembrado para que los reportes tengan datos visibles.
 *
 * Uso: npx tsx prisma/seed-demo-estimates.ts
 */
import { PrismaClient } from "@prisma/client";
import { runEstimate } from "../lib/estimate-service";
import type { DevelopmentMode } from "../lib/engine";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst({
    where: { name: "Demo Sistema CRUD interno" },
    include: { _count: { select: { estimates: true } } },
  });
  if (!project) {
    console.log("No se encontro el proyecto demo. Corre primero: npm run db:seed");
    return;
  }

  if (project._count.estimates >= 15) {
    console.log(`El proyecto demo ya tiene ${project._count.estimates} estimaciones. Saltando.`);
    return;
  }

  const modes: DevelopmentMode[] = ["traditional", "ai_assisted", "bytecoding_prompts", "low_code", "hybrid"];
  for (const mode of modes) {
    console.log(`Ejecutando ${mode}...`);
    await runEstimate({
      projectId: project.id,
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
  }

  // Sembramos también un cambio de alcance para que la página tenga datos
  const existingChange = await prisma.changeRequest.findFirst({ where: { projectId: project.id } });
  if (!existingChange) {
    await prisma.changeRequest.create({
      data: {
        projectId: project.id,
        requesterName: "Direccion de Innovacion",
        description: "Agregar exportacion de tramites a CSV no contemplada en alcance original",
        type: "nuevo_alcance",
        timeImpactHours: 24,
        costImpact: 18000,
        decision: "pendiente",
      },
    });
  }

  console.log("Estimaciones demo completas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
