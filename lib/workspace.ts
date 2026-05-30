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
 * Genera un código de recuperación corto (8 chars, alfabeto sin ambiguos).
 * Formato: XXXX-XXXX, sin O/0/I/1/L para evitar errores al escribirlo.
 */
function generateRecoveryCode(): string {
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
}

/**
 * Devuelve el workspace completo, haciendo upsert si la cookie es nueva.
 * Actualiza lastSeenAt en cada llamada para tracking en el panel admin.
 * Si el workspace no tiene recoveryCode, lo genera (backward compat).
 */
export async function getCurrentWorkspace() {
  const id = await getCurrentWorkspaceId();
  if (!id) return null;

  let workspace = await prisma.workspace.upsert({
    where: { id },
    create: { id, lastSeenAt: new Date(), recoveryCode: generateRecoveryCode() },
    update: { lastSeenAt: new Date() },
  });

  if (!workspace.recoveryCode) {
    // Workspace antiguo sin código: generar uno único (reintentar si colisiona).
    for (let i = 0; i < 5; i++) {
      try {
        workspace = await prisma.workspace.update({
          where: { id },
          data: { recoveryCode: generateRecoveryCode() },
        });
        break;
      } catch {
        // colisión muy improbable, reintenta
      }
    }
  }
  return workspace;
}

/**
 * Busca un workspace por su código de recuperación (case-insensitive).
 * Usado en POST /api/workspace/recover.
 */
export async function findWorkspaceByRecoveryCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalized)) return null;
  return prisma.workspace.findUnique({ where: { recoveryCode: normalized } });
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
