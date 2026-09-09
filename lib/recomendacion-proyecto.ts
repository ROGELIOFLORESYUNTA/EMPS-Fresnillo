/**
 * UNA sola recomendación para todo el sistema.
 *
 * La pantalla del proyecto y los reportes llamaban al motor por separado, con
 * roles distintos y sin aptitud, y por eso mostraban tres precios diferentes
 * para la misma pregunta. Ahora las dos pasan por aquí, con las mismas
 * estimaciones, la misma aptitud por modo y la misma brecha.
 *
 * No toca la base: recibe objetos planos. Quien llama decide el rol.
 */
import { aptitudDeModos, type AptitudModo } from "./engine/aptitud";
import {
  recommendBestOption,
  type RecommendationInput,
  type RecommendationResult,
  type RecommendationRole,
} from "./engine/recommendation";
import type { ModuleInput } from "./engine/types";

export interface EstimacionPlana {
  mode: string;
  scenario: string;
  total: number | string;
  weeksTotal: number | string | null;
  weeksToPrototype: number | string | null;
  riskScore: number | string;
  riskLevel: string;
  margin: number | string;
}

export interface RecomendacionDelProyecto {
  recomendacion: RecommendationResult | null;
  aptitud: Record<string, AptitudModo>;
}

export function recomendacionDelProyecto(input: {
  role: RecommendationRole;
  project: RecommendationInput["project"];
  modules: ModuleInput[];
  estimates: EstimacionPlana[];
  workingCapitalRequired?: number;
  now?: Date;
}): RecomendacionDelProyecto {
  const aptitud = aptitudDeModos(input.modules);
  const recomendacion = recommendBestOption({
    role: input.role,
    project: input.project,
    options: input.estimates.map((e) => ({
      mode: e.mode,
      scenario: e.scenario,
      total: Number(e.total),
      weeksTotal: e.weeksTotal !== null ? Number(e.weeksTotal) : null,
      weeksToPrototype: e.weeksToPrototype !== null ? Number(e.weeksToPrototype) : null,
      riskScore: Number(e.riskScore),
      riskLevel: e.riskLevel,
      margin: Number(e.margin),
    })),
    aptitud,
    workingCapitalRequired: input.workingCapitalRequired,
    now: input.now,
  });
  return { recomendacion, aptitud };
}
