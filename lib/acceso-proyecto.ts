/**
 * Quién puede abrir un proyecto.
 *
 * Son dos reglas, y las dos contestan 404 (no 403) para no confirmar que el
 * proyecto existe:
 *
 *   1. Lado. Un proyecto solo se abre del lado donde se creó (desarrollador o
 *      ayuntamiento, según el host). Los proyectos anteriores a la separación
 *      no traen lado y cuentan como de ayuntamiento.
 *   2. Dueño. Un proyecto solo lo abre el workspace que lo creó. Las plantillas
 *      de ejemplo las abre cualquiera de su lado, y un proyecto sin dueño
 *      (sin workspaceId) sigue abierto, como hasta ahora.
 *
 * El enlace público /r/[token] no pasa por aquí: es de solo lectura y se
 * comparte a propósito.
 */
import type { Prisma, Project } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ladoDelProyecto, type Lado } from "@/lib/lado";
import { getLado } from "@/lib/lado-server";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export type AccesoProyecto = { project: Project | null; status: 200 | 404 };

/**
 * Carga el proyecto solo si el visitante puede abrirlo (lado y dueño). Con
 * `project: null` hay que contestar 404; con el proyecto, `status` es 200.
 */
export async function cargarProyectoConAcceso(id: string): Promise<AccesoProyecto> {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return { project: null, status: 404 };
  if (ladoDelProyecto(project.lado) !== (await getLado())) return { project: null, status: 404 };
  if (!project.isTemplate && project.workspaceId) {
    const myWorkspace = await getCurrentWorkspaceId();
    if (project.workspaceId !== myWorkspace) return { project: null, status: 404 };
  }
  return { project, status: 200 };
}

/**
 * Para las rutas que reciben el id de una pieza (módulo, historia, estimación,
 * cambio) y no el del proyecto: contesta si el visitante puede abrir el
 * proyecto al que pertenece. Sin projectId no hay forma de saberlo: no.
 */
export async function puedeAbrirProyecto(projectId: string | null | undefined): Promise<boolean> {
  if (!projectId) return false;
  const { project } = await cargarProyectoConAcceso(projectId);
  return project !== null;
}

/**
 * Condición de Prisma para las listas: solo los proyectos de ese lado. Los
 * proyectos viejos (lado nulo) cuentan como de ayuntamiento, igual que en
 * ladoDelProyecto.
 */
export function filtroDeLado(lado: Lado): Prisma.ProjectWhereInput {
  return lado === "ayuntamiento" ? { OR: [{ lado: "ayuntamiento" }, { lado: null }] } : { lado: "desarrollador" };
}
