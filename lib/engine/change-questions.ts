/**
 * Preguntas de aclaración que el sistema sugiere cuando un cambio
 * no tiene claridad suficiente o toca artefactos sensibles.
 *
 * Fuente: 29_addendum_ui_control_cambios.md §2 Paso 2 (preguntas en lenguaje del cliente).
 *
 * Devuelve ≤ 6 preguntas; el orden refleja prioridad (primero las críticas:
 * permisos, datos, autorización; después las operacionales).
 */

import type { ChangeImpactInput } from "./change-types";

export function buildClarificationQuestions(input: ChangeImpactInput): string[] {
  const q: string[] = [];
  const a = input.affectedArtifacts;

  if (input.clarityLevel <= 2) {
    q.push("¿Quién es el usuario que va a usar este cambio?");
    q.push("¿En qué pantalla o flujo lo necesita?");
  }

  if (a.rolesPermissions > 0 || input.securityImpact >= 1) {
    q.push("¿Cambia los permisos o los roles que pueden ver/usar esa función? ¿Quién la autoriza?");
  }

  if (a.databaseTables > 0 || input.dataImpact >= 1) {
    q.push("¿Qué dato nuevo se guarda y se debe conservar el historial anterior?");
  }

  if (a.reports > 0) {
    q.push("¿En qué reporte debe aparecer y qué dato exactamente: usuario, fecha, monto?");
  }

  if (a.externalIntegrations > 0 || input.integrationImpact >= 1) {
    q.push("¿Con qué sistema externo se integra y quién lo administra?");
  }

  if (input.testingRequired) {
    q.push("¿Cómo se sabrá que ya quedó aceptado: el área usuaria firma, hay un caso de prueba, una demo?");
  }

  // Preguntas de contexto si todavía sobran posiciones
  if (q.length < 4 && input.clarityLevel <= 3) {
    q.push("¿Es para cumplir con auditoría, ley o un requerimiento del cliente?");
  }

  return q.slice(0, 6);
}
