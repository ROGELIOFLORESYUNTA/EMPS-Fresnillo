/**
 * Borra TODOS los datos de ejemplo de investigación (workspace wsk_research_demo):
 * proyectos cerrados demo, sus resultados reales y los TrainingCase derivados.
 *
 * Corre esto ANTES de analizar casos reales, para que el ejemplo no se mezcle.
 *
 * Uso: npx tsx prisma/clear-research-demo.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_WS = "wsk_research_demo";

async function main() {
  const projects = await prisma.project.findMany({
    where: { workspaceId: DEMO_WS },
    select: { id: true },
  });
  const ids = projects.map((p) => p.id);
  console.log(`Encontrados ${ids.length} proyectos demo de investigación.`);

  if (ids.length > 0) {
    // ProjectActualResult y sus TrainingCase derivados no tienen FK en cascada.
    const results = await prisma.projectActualResult.findMany({
      where: { projectId: { in: ids } },
      select: { id: true },
    });
    const resultIds = results.map((r) => r.id);
    if (resultIds.length > 0) {
      const tc = await prisma.trainingCase.deleteMany({ where: { sourceRecordId: { in: resultIds } } });
      console.log(`  TrainingCase borrados: ${tc.count}`);
    }
    const par = await prisma.projectActualResult.deleteMany({ where: { projectId: { in: ids } } });
    console.log(`  ProjectActualResult borrados: ${par.count}`);

    // Borrar proyectos (modules/estimates/changes/cashflow caen por cascada).
    const proj = await prisma.project.deleteMany({ where: { workspaceId: DEMO_WS } });
    console.log(`  Proyectos borrados: ${proj.count}`);
  }

  // El workspace lo dejamos (es solo un contenedor vacío); si quieres borrarlo:
  await prisma.workspace.deleteMany({ where: { id: DEMO_WS } });
  console.log("Workspace demo eliminado. Base lista para datos reales.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
