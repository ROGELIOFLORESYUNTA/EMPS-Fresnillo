/**
 * CLEANUP de datos sinteticos (dev only).
 * Borra todos los TrainingCase con sourceKind = "simulated_dev_only".
 *
 * Ejecutar antes de desplegar a produccion para que los datos del panel
 * sean solo los reales capturados por usuarios.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SOURCE_MARK = "simulated_dev_only";

async function main() {
  const result = await prisma.trainingCase.deleteMany({ where: { sourceKind: SOURCE_MARK } });
  console.log(`Borrados ${result.count} TrainingCase con sourceKind='${SOURCE_MARK}'.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
