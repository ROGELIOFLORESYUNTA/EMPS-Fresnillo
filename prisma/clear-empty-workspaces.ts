/**
 * Borra los workspaces VACÍOS: filas creadas solo porque alguien abrió la
 * página, sin nombre y sin nada de actividad (0 proyectos, 0 parámetros
 * editados, 0 eventos). Esas no representan a ningún usuario real.
 *
 * NO toca:
 *   - workspaces con nombre (displayName)
 *   - workspaces con al menos 1 proyecto, override o evento
 *   - el demo de investigación (tiene 18 proyectos, así que cae en "con actividad")
 *
 * Uso: npx tsx prisma/clear-empty-workspaces.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.workspace.findMany({
    include: { _count: { select: { projects: true, overrides: true, activityLog: true } } },
  });

  const empties = all.filter(
    (w) =>
      !w.displayName &&
      w._count.projects === 0 &&
      w._count.overrides === 0 &&
      w._count.activityLog === 0,
  );

  console.log(`Workspaces totales: ${all.length}`);
  console.log(`Vacíos (sin nombre, 0 proyectos, 0 parámetros, 0 eventos): ${empties.length}`);
  console.log(`Con actividad o nombre (se conservan): ${all.length - empties.length}`);

  if (empties.length === 0) {
    console.log("Nada que borrar.");
    return;
  }

  const ids = empties.map((w) => w.id);
  const res = await prisma.workspace.deleteMany({ where: { id: { in: ids } } });
  console.log(`Borrados: ${res.count}`);
  console.log("Listo. El panel ya solo mostrará workspaces reales.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
