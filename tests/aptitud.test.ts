/**
 * La recomendación tiene que depender del PROYECTO, no solo del rol.
 *
 * Antes, low-code era siempre la más barata y rápida por construcción y ningún
 * dato del proyecto podía cambiar el orden; la recomendación la decidía el rol.
 * Estas pruebas dejan constancia de que dos proyectos distintos dan
 * recomendaciones distintas, y de que la brecha se calcula una sola vez.
 */
import { describe, it, expect } from "vitest";
import { aptitudDeModos, type ModuleInput } from "@/lib/engine";
import { recomendacionDelProyecto, type EstimacionPlana } from "@/lib/recomendacion-proyecto";

const modulo = (o: Partial<ModuleInput>): ModuleInput => ({
  complexity: 3, clarity: 4, criticality: 3, screensCount: 4, reportsCount: 1, catalogsCount: 0,
  integrationsCount: 0, sensitiveData: false, ...o,
});

/** Un sistema chico y claro: un catálogo y sus altas, sin conexiones. */
const sencillo = [modulo({}), modulo({ clarity: 5 })];

/** Predial con pagos en línea: crítico, con datos personales y conectado al banco y al SAT. */
const critico = [
  modulo({ criticality: 5, sensitiveData: true, integrationsCount: 2, clarity: 3 }),
  modulo({ criticality: 5, sensitiveData: true, integrationsCount: 2, clarity: 3 }),
  modulo({ criticality: 4, sensitiveData: true, clarity: 3 }),
];

/** Estimaciones con el orden de precio que el motor produce por construcción. */
function estimaciones(): EstimacionPlana[] {
  const base: Array<[string, number, number]> = [
    ["low_code", 290000, 4.4], ["bytecoding_prompts", 500000, 7.7], ["hybrid", 770000, 11.7],
    ["ai_assisted", 1010000, 15.5], ["traditional", 2790000, 30.8],
  ];
  const out: EstimacionPlana[] = [];
  for (const [mode, total, sem] of base) {
    for (const [scenario, f] of [["optimistic", 0.85], ["probable", 1], ["conservative", 1.3]] as const) {
      out.push({ mode, scenario, total: total * f, weeksTotal: sem * f, weeksToPrototype: 1 + sem / 4, riskScore: 2, riskLevel: "medio", margin: 0.2 });
    }
  }
  return out;
}

const proyecto = { priority: "media", targetDate: null, estimatedBudget: null, systemType: "tramites" };

describe("aptitud por modo", () => {
  it("un sistema sencillo admite todas las formas de hacerlo", () => {
    const a = aptitudDeModos(sencillo);
    for (const m of Object.values(a)) expect(m.veredicto).not.toBe("no_recomendable");
    expect(a.low_code.veredicto).toBe("apto");
  });

  it("un sistema crítico con datos personales y conexiones descarta low-code", () => {
    const a = aptitudDeModos(critico);
    expect(a.low_code.veredicto).toBe("no_recomendable");
    expect(a.low_code.razones.join(" ")).toMatch(/datos personales|sistemas de afuera/);
    expect(a.traditional.veredicto).toBe("apto");
  });

  it("con requisitos vagos, bytecoding no se recomienda", () => {
    const vago = [modulo({ clarity: 2 }), modulo({ clarity: 2 })];
    expect(aptitudDeModos(vago).bytecoding_prompts.veredicto).toBe("no_recomendable");
  });
});

describe("la recomendación cambia con el proyecto", () => {
  it("mismo rol, mismas cifras: el proyecto sencillo y el crítico reciben opciones distintas", () => {
    const rs = recomendacionDelProyecto({ role: "proveedor", project: proyecto, modules: sencillo, estimates: estimaciones() });
    const rc = recomendacionDelProyecto({ role: "proveedor", project: proyecto, modules: critico, estimates: estimaciones() });
    expect(rs.recomendacion!.best.mode).toBe("low_code");
    expect(rc.recomendacion!.best.mode).not.toBe("low_code");
    // y le dice por qué descartó la más barata
    expect(rc.recomendacion!.excluidos.map((x) => x.mode)).toContain("low_code");
    expect(rc.recomendacion!.reasons.join(" ")).toMatch(/saldría más barata/);
  });

  it("para el Ayuntamiento tampoco es siempre la misma", () => {
    const rs = recomendacionDelProyecto({ role: "operador_municipal", project: proyecto, modules: sencillo, estimates: estimaciones() });
    const rc = recomendacionDelProyecto({ role: "operador_municipal", project: proyecto, modules: critico, estimates: estimaciones() });
    expect(rs.recomendacion!.best.mode).not.toBe(rc.recomendacion!.best.mode);
  });

  it("la brecha se calcula una sola vez, sobre el escenario de la recomendación", () => {
    const r = recomendacionDelProyecto({ role: "operador_municipal", project: { ...proyecto, priority: "alta" }, modules: sencillo, estimates: estimaciones() });
    const b = r.recomendacion!.brecha!;
    expect(b.escenario).toBe(r.recomendacion!.best.scenario);
    expect(b.diferencia).toBeCloseTo(b.maximo - b.minimo, 2);
    expect(r.recomendacion!.warnings.join(" ")).toMatch(/la forma de hacerlo es la decisión que más pesa/);
  });
});
