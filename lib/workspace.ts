/**
 * Helper de identidad por workspace (FASE G.I, sin login).
 *
 * Lee la cookie `emps_workspace_id` set por middleware.ts y hace upsert en
 * la tabla Workspace para garantizar que existe la fila correspondiente.
 *
 * Uso típico en Server Components y endpoints:
 *   const wsId = await getCurrentWorkspaceId();
 *   const workspace = await getCurrentWorkspace();
 */
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "emps_workspace_id";

/**
 * Devuelve el ID del workspace actual de la cookie. Si no hay cookie
 * (improbable porque middleware.ts la setea siempre) devuelve null.
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value ?? null;
}

/**
 * Devuelve el workspace completo, haciendo upsert si la cookie es nueva.
 * Actualiza lastSeenAt en cada llamada para tracking en el panel admin.
 */
export async function getCurrentWorkspace() {
  const id = await getCurrentWorkspaceId();
  if (!id) return null;

  const workspace = await prisma.workspace.upsert({
    where: { id },
    create: { id, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });
  return workspace;
}

/**
 * Registra una actividad del workspace en el log para análisis del admin.
 * Llamar desde endpoints clave: project_created, estimate_run, parameter_overridden, etc.
 */
export async function logWorkspaceActivity(
  workspaceId: string,
  eventType: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.workspaceActivityLog.create({
      data: {
        workspaceId,
        eventType,
        payloadJson: payload ? JSON.stringify(payload) : null,
      },
    });
  } catch {
    // No bloquear el flujo principal si el log falla.
  }
}
