/**
 * Motor de recomendación de "la mejor opción" (modo × escenario) SEGÚN EL ROL
 * de quien usa el sistema. Función PURA: sin Prisma, sin React, sin I/O.
 *
 * Filosofía: reglas fijas y EXPLICABLES (no ML, no caja negra). Cada
 * recomendación viene con 3-4 razones en lenguaje llano citando las cifras
 * reales, para que la persona pueda defender la decisión (o contradecirla
 * con conocimiento de causa). La decisión final siempre es del usuario.
 *
 * Reglas por rol:
 *  - operador_municipal: presupuestar con conservador (prioridad alta/crítica)
 *    o probable; NUNCA optimista. Pesa más el riesgo que el precio. Verifica
 *    fecha objetivo y presupuesto registrado. Advierte contra la trampa de
 *    "elegir lo más barato" cuando la brecha entre modos es grande.
 *  - proveedor: cotizar con probable. Pesa viabilidad: riesgo, velocidad a
 *    prototipo, margen; advierte por bache de caja alto.
 *  - investigador/explorando/otro/null: recomendación neutral equilibrada +
 *    invitación a declarar rol (la agrega la UI).
 */

const MODE_LABELS: Record<string, string> = {
  traditional: "Tradicional",
  ai_assisted: "Asistido por herramientas generativas",
  bytecoding_prompts: "Bytecoding (prompts)",
  low_code: "Low-code",
  hybrid: "Híbrido",
};

const SCENARIO_LABELS: Record<string, string> = {
  optimistic: "optimista",
  probable: "probable",
  conservative: "conservador",
};

const RISK_LABELS: Record<string, string> = {
  bajo: "bajo",
  medio: "medio",
  alto: "alto",
  critico: "crítico",
};

// Riesgo como número absoluto (explicable), no relativo al grupo.
const RISK_WEIGHT: Record<string, number> = {
  bajo: 0.0,
  medio: 0.35,
  alto: 0.7,
  critico: 1.0,
};

// Desempate final: orden de preferencia documentado (híbrido es la línea
// base realista del sistema).
const MODE_TIEBREAK_ORDER = ["hybrid", "ai_assisted", "traditional", "bytecoding_prompts", "low_code"];

export type RecommendationRole =
  | "operador_municipal"
  | "proveedor"
  | "investigador"
  | "explorando"
  | "otro"
  | null;

export interface RecommendationOption {
  mode: string;
  scenario: string;
  total: number;
  weeksTotal: number | null;
  weeksToPrototype: number | null;
  riskScore: number;
  riskLevel: string;
  margin: number;
}

export interface RecommendationInput {
  role: RecommendationRole;
  project: {
    priority: string;
    targetDate: Date | null;
    estimatedBudget: number | null;
    systemType: string;
  };
  options: RecommendationOption[];
  workingCapitalRequired?: number;
  now?: Date;
}

export interface RecommendationResult {
  best: { mode: string; scenario: string };
  bestOption: RecommendationOption;
  reasons: string[];
  runnerUp?: { mode: string; scenario: string; why: string };
  warnings: string[];
  roleUsed: "operador_municipal" | "proveedor" | "neutral";
}

const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
const sem = (n: number) => `${n.toFixed(1)} semanas`;

function minmax(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return (value - min) / (max - min);
}

export function recommendBestOption(input: RecommendationInput): RecommendationResult | null {
  const { role, project, options } = input;
  const now = input.now ?? new Date();
  if (!options || options.length === 0) return null;

  const roleUsed: RecommendationResult["roleUsed"] =
    role === "operador_municipal" ? "operador_municipal" : role === "proveedor" ? "proveedor" : "neutral";

  const warnings: string[] = [];

  // ---------- Etapa 1: escenario por regla fija ----------
  const highPriority = project.priority === "alta" || project.priority === "critica";
  let targetScenario: string;
  if (roleUsed === "operador_municipal") {
    targetScenario = highPriority ? "conservative" : "probable";
  } else {
    targetScenario = "probable";
  }

  const scenariosAvailable = new Set(options.map((o) => o.scenario));
  if (!scenariosAvailable.has(targetScenario)) {
    const fallbacks = ["probable", "conservative", "optimistic"];
    const found = fallbacks.find((s) => scenariosAvailable.has(s));
    if (!found) return null;
    if (targetScenario === "conservative") {
      warnings.push(
        "No hay estimación en el escenario conservador; usamos el probable. Recalcula el proyecto para tener los tres escenarios.",
      );
    }
    if (found === "optimistic") {
      warnings.push(
        "Solo existe el escenario optimista. Presupuestar con el optimista es apostar a que nada falle: recalcula para tener el probable y el conservador.",
      );
    }
    targetScenario = found;
  }

  // ---------- Etapa 2: candidatos y filtro de riesgo crítico ----------
  const all = options.filter((o) => o.scenario === targetScenario);
  let candidates = all.filter((o) => o.riskLevel !== "critico");
  if (candidates.length === 0) {
    candidates = all;
    warnings.push(
      "Todas las opciones salen con riesgo crítico. Antes de decidir, baja el riesgo: aclara los requisitos de los módulos y revisa el esquema de pagos.",
    );
  }
  if (all.length === 1) {
    warnings.push("Solo hay estimaciones en un modo de desarrollo. Corre la estimación comparando los 5 modos para elegir de verdad.");
  }

  const totals = candidates.map((o) => o.total);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);
  const weeksKnown = candidates.filter((o) => o.weeksTotal !== null).map((o) => o.weeksTotal as number);
  const minWeeks = weeksKnown.length ? Math.min(...weeksKnown) : 0;
  const maxWeeks = weeksKnown.length ? Math.max(...weeksKnown) : 0;
  const protoKnown = candidates.filter((o) => o.weeksToPrototype !== null).map((o) => o.weeksToPrototype as number);
  const minProto = protoKnown.length ? Math.min(...protoKnown) : 0;
  const maxProto = protoKnown.length ? Math.max(...protoKnown) : 0;
  const margins = candidates.map((o) => o.margin);
  const minMargin = Math.min(...margins);
  const maxMargin = Math.max(...margins);

  // Brecha entre modos (para la regla anti "cotizar barato / ejecutar caro")
  const rangeMultiplier = minTotal > 0 ? maxTotal / minTotal : 1;
  const cheapest = candidates.find((o) => o.total === minTotal);
  const mostExpensive = candidates.find((o) => o.total === maxTotal);

  // Semanas disponibles hasta la fecha objetivo
  const weeksAvailable = project.targetDate
    ? (project.targetDate.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)
    : null;

  // Pesos por rol
  const W =
    roleUsed === "operador_municipal"
      ? { price: 0.3, risk: 0.45, weeks: 0.25, proto: 0, margin: 0 }
      : roleUsed === "proveedor"
        ? { price: 0.25, risk: 0.35, weeks: 0.15, proto: 0.15, margin: 0.1 }
        : { price: 0.34, risk: 0.33, weeks: 0.33, proto: 0, margin: 0 };

  interface Scored {
    option: RecommendationOption;
    score: number;
    missesDeadline: boolean;
    tightDeadline: boolean;
    overBudgetConservative: number | null; // cuánto se pasa el conservador del presupuesto
  }

  const scored: Scored[] = candidates.map((o) => {
    const priceN = minmax(o.total, minTotal, maxTotal);
    const weeksN = o.weeksTotal === null ? 0.5 : minmax(o.weeksTotal, minWeeks, maxWeeks);
    const protoN = o.weeksToPrototype === null ? 0.5 : minmax(o.weeksToPrototype, minProto, maxProto);
    const riskN = RISK_WEIGHT[o.riskLevel] ?? 0.5;
    const marginN = 1 - minmax(o.margin, minMargin, maxMargin);

    let score = W.price * priceN + W.risk * riskN + W.weeks * weeksN + W.proto * protoN + W.margin * marginN;

    // Penalización por fecha objetivo
    let missesDeadline = false;
    let tightDeadline = false;
    if (weeksAvailable !== null && o.weeksTotal !== null) {
      if (o.weeksTotal > weeksAvailable) {
        score += 0.35;
        missesDeadline = true;
      } else if (o.weeksTotal > 0.85 * weeksAvailable) {
        score += 0.15;
        tightDeadline = true;
      }
    }

    // Penalización anti "cotizar barato" (solo operador; los demás reciben warning)
    if (roleUsed === "operador_municipal" && rangeMultiplier > 1.5 && o.total === minTotal) {
      score += 0.1;
    }

    // Penalización por presupuesto (solo operador): el hermano conservador debe caber
    let overBudgetConservative: number | null = null;
    if (roleUsed === "operador_municipal" && project.estimatedBudget && project.estimatedBudget > 0) {
      const conservativeSibling = options.find((x) => x.mode === o.mode && x.scenario === "conservative");
      if (conservativeSibling && conservativeSibling.total > project.estimatedBudget) {
        score += 0.2;
        overBudgetConservative = conservativeSibling.total - project.estimatedBudget;
      }
    }

    return { option: o, score, missesDeadline, tightDeadline, overBudgetConservative };
  });

  // Ordenar por score; desempate explicable
  scored.sort((a, b) => {
    if (Math.abs(a.score - b.score) >= 0.02) return a.score - b.score;
    const riskDiff = (RISK_WEIGHT[a.option.riskLevel] ?? 0.5) - (RISK_WEIGHT[b.option.riskLevel] ?? 0.5);
    if (riskDiff !== 0) return riskDiff;
    const weeksDiff = (a.option.weeksTotal ?? Infinity) - (b.option.weeksTotal ?? Infinity);
    if (weeksDiff !== 0) return weeksDiff;
    const priceDiff = a.option.total - b.option.total;
    if (priceDiff !== 0) return priceDiff;
    return MODE_TIEBREAK_ORDER.indexOf(a.option.mode) - MODE_TIEBREAK_ORDER.indexOf(b.option.mode);
  });

  const bestScored = scored[0];
  const best = bestScored.option;
  const second = scored[1];

  // ---------- Razones (con cifras reales) ----------
  const reasons: string[] = [];

  // 1) Por qué ese escenario
  if (roleUsed === "operador_municipal") {
    if (targetScenario === "conservative") {
      reasons.push(
        "Para presupuestar usamos el escenario conservador, nunca el optimista: si algo sale mal, el dinero ya está apartado. Este proyecto es de prioridad alta, así que conviene el colchón.",
      );
    } else {
      reasons.push(
        "Para presupuestar usamos el escenario probable, nunca el optimista: es el punto medio realista para reservar presupuesto.",
      );
    }
  } else if (roleUsed === "proveedor") {
    reasons.push("Para cotizar usamos el escenario probable: cotizar con el optimista es apostar a que nada falle.");
  } else {
    reasons.push("Comparamos las opciones en el escenario probable, que es la base realista del sistema.");
  }

  // 2) Precio
  if (candidates.length >= 2 && mostExpensive && best.total < mostExpensive.total) {
    reasons.push(
      `Cuesta ${mxn(best.total)}: ${mxn(mostExpensive.total - best.total)} menos que la opción más cara (${MODE_LABELS[mostExpensive.mode] ?? mostExpensive.mode}, ${mxn(mostExpensive.total)}).`,
    );
  } else if (candidates.length >= 2 && cheapest && best.total > cheapest.total) {
    reasons.push(
      `No es la más barata: la más barata (${MODE_LABELS[cheapest.mode] ?? cheapest.mode}, ${mxn(cheapest.total)}) sale con riesgo ${RISK_LABELS[cheapest.riskLevel] ?? cheapest.riskLevel}, y aquí el riesgo pesa más que el ahorro.`,
    );
  }

  // 3) Riesgo
  if (best.riskLevel === "bajo" || best.riskLevel === "medio") {
    reasons.push(`Su riesgo es ${RISK_LABELS[best.riskLevel]}: los requisitos y el equipo de esta opción no prenden focos rojos.`);
  } else {
    reasons.push(
      `Su riesgo es ${RISK_LABELS[best.riskLevel] ?? best.riskLevel}: aun así es la mejor combinación disponible; conviene aclarar requisitos antes de arrancar.`,
    );
  }

  // 4) Tiempo / prototipo / presupuesto (la más relevante disponible)
  if (weeksAvailable !== null && best.weeksTotal !== null) {
    const months = (best.weeksTotal / 4.33).toFixed(1);
    if (bestScored.missesDeadline) {
      reasons.push(
        `Ojo con el tiempo: tarda ${sem(best.weeksTotal)} (~${months} meses) y tu fecha objetivo da ${sem(Math.max(0, weeksAvailable))}. Ninguna opción viable llega mejor; considera mover la fecha o recortar alcance.`,
      );
    } else if (bestScored.tightDeadline) {
      reasons.push(
        `Tarda ${sem(best.weeksTotal)} (~${months} meses) y tu fecha objetivo da ${sem(weeksAvailable)}: va apretado, cualquier cambio a medio camino lo atrasa.`,
      );
    } else {
      reasons.push(
        `Tarda ${sem(best.weeksTotal)} (~${months} meses) y tu fecha objetivo da ${sem(weeksAvailable)}: sí alcanza.`,
      );
    }
  } else if (roleUsed === "proveedor" && best.weeksToPrototype !== null) {
    reasons.push(`Tendrías una primera versión enseñable en ${sem(best.weeksToPrototype)}.`);
  } else if (
    roleUsed === "operador_municipal" &&
    project.estimatedBudget &&
    project.estimatedBudget > 0 &&
    bestScored.overBudgetConservative === null
  ) {
    const conservativeSibling = options.find((x) => x.mode === best.mode && x.scenario === "conservative");
    if (conservativeSibling) {
      reasons.push(
        `Aun en el escenario conservador (${mxn(conservativeSibling.total)}) cabe en tu presupuesto registrado (${mxn(project.estimatedBudget)}).`,
      );
    }
  }

  // ---------- Warnings ----------
  if (rangeMultiplier > 1.5) {
    warnings.push(
      `Ojo: el modo más caro vale ${rangeMultiplier.toFixed(1)} veces el más barato. Si eliges el barato y a medio camino cambias de método, el costo se dispara. Cotiza con el método que de verdad vas a usar.`,
    );
  }
  if (bestScored.overBudgetConservative !== null && project.estimatedBudget) {
    const conservativeSibling = options.find((x) => x.mode === best.mode && x.scenario === "conservative");
    if (conservativeSibling) {
      warnings.push(
        `En el escenario conservador esta opción costaría ${mxn(conservativeSibling.total)}, ${mxn(bestScored.overBudgetConservative)} arriba de tu presupuesto registrado (${mxn(project.estimatedBudget)}). Ten un plan B antes de comprometerte.`,
      );
    }
  }
  if (
    roleUsed === "proveedor" &&
    input.workingCapitalRequired &&
    input.workingCapitalRequired > 0 &&
    best.total > 0 &&
    input.workingCapitalRequired / best.total > 0.35
  ) {
    const pct = ((input.workingCapitalRequired / best.total) * 100).toFixed(0);
    warnings.push(
      `El bache de caja (${mxn(input.workingCapitalRequired)}) es el ${pct}% del precio. Si no tienes ese dinero en banco, negocia más anticipo antes de firmar.`,
    );
  }
  if (project.targetDate === null) {
    warnings.push("No registraste fecha objetivo. Agrégala al proyecto para que la recomendación tome en cuenta el tiempo.");
  }

  // ---------- Runner-up ----------
  let runnerUp: RecommendationResult["runnerUp"];
  if (second) {
    const o2 = second.option;
    let why: string;
    if (o2.total < best.total) {
      why = `Casi empata: cuesta ${mxn(best.total - o2.total)} menos, pero su riesgo sale ${RISK_LABELS[o2.riskLevel] ?? o2.riskLevel} en lugar de ${RISK_LABELS[best.riskLevel] ?? best.riskLevel}.`;
    } else if ((o2.weeksTotal ?? Infinity) < (best.weeksTotal ?? Infinity)) {
      why = `Es más rápida (${o2.weeksTotal !== null ? sem(o2.weeksTotal) : "—"}), pero cuesta ${mxn(o2.total - best.total)} más.`;
    } else {
      why = `Cuesta ${mxn(o2.total)} con riesgo ${RISK_LABELS[o2.riskLevel] ?? o2.riskLevel}.`;
    }
    runnerUp = { mode: o2.mode, scenario: o2.scenario, why };
  }

  return {
    best: { mode: best.mode, scenario: best.scenario },
    bestOption: best,
    reasons: reasons.slice(0, 4),
    runnerUp,
    warnings,
    roleUsed,
  };
}
