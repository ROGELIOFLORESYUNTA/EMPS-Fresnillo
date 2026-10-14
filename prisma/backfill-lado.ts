/**
 * Relleno del campo Project.lado para los proyectos creados antes de separar
 * las dos caras del sistema.
 *
 * Regla: si el workspace dueño es de un proveedor (role = "proveedor") o es
 * el workspace del chatbot de ventas ("chatbot-rosbecloud"), el proyecto es
 * del lado desarrollador. Todo lo demás, plantillas incluidas, es del lado
 * ayuntamiento, que es lo que era el sistema hasta octubre de 2026.
 *
 * Es idempotente: solo toca proyectos con lado nulo. Se corre una vez en cada
 * base (local y servidor) después de `prisma db push`:
 *   npx tsx prisma/backfill-lado.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CHATBOT_WORKSPACE_ID = "chatbot-rosbecloud";

async function main() {
  const pendientes = await prisma.project.findMany({
    where: { lado: null },
    select: { id: true, name: true, workspaceId: true, isTemplate: true, workspace: { select: { role: true } } },
  });
  let desarrollador = 0;
  let ayuntamiento = 0;
  for (const p of pendientes) {
    const esDesarrollador = !p.isTemplate && (p.workspace?.role === "proveedor" || p.workspaceId === CHATBOT_WORKSPACE_ID);
    const lado = esDesarrollador ? "desarrollador" : "ayuntamiento";
    await prisma.project.update({ where: { id: p.id }, data: { lado } });
    if (esDesarrollador) desarrollador += 1;
    else ayuntamiento += 1;
  }
  console.log(`Proyectos sin lado: ${pendientes.length}. Marcados como desarrollador: ${desarrollador}; como ayuntamiento: ${ayuntamiento}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
