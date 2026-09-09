/**
 * Herramientas de IA y pericia del equipo con la IA.
 *
 * Hasta septiembre de 2026 el motor solo acreditaba que la IA hace más rápido
 * el trabajo (effort_efficiency y velocity_factor por modo), pero no cobraba
 * las herramientas y daba la misma ganancia a un equipo que nunca ha usado IA
 * que a uno que trabaja con agentes todos los días. Aquí viven las dos piezas
 * que faltaban, como funciones puras:
 *
 *   1. Cuánto cuestan al mes las herramientas de cada forma de hacerlo
 *      (asientos por persona técnica, en pesos, sin IVA porque es acreditable).
 *   2. Qué parte de la ganancia nominal del modo se acredita según la pericia
 *      promedio del equipo con la IA (1 a 5).
 *
 * Los valores por omisión son los mismos del seed (AI_TOOL_COSTS,
 * AI_SKILL_FACTORS, TIPO_CAMBIO_USD_MXN) y sirven de respaldo si la base aún
 * no tiene esos parámetros. Las fuentes están en el seed y en /fuentes.
 */
import type { DevelopmentMode, ModeVelocity } from "./types";

/** Puestos que ocupan un asiento de herramienta. Contador, administrativo y soporte no. */
export const ROLES_CON_ASIENTO = ["lider_tecnico", "dev_senior", "dev_junior", "tester", "disenador", "analista"] as const;

/** Formas de hacerlo cuya ganancia depende de saber trabajar con la IA. */
export const MODOS_CON_PERICIA: DevelopmentMode[] = ["ai_assisted", "hybrid", "bytecoding_prompts"];

export interface CostoHerramientaModo {
  /** Precio de lista de la canasta típica, por persona técnica, USD al mes, sin IVA. */
  usd_por_persona_mes: number;
  /** Sobreconsumo típico sobre el plan (créditos, tokens, uso de agentes). 0.30 = 30 %. */
  sobreconsumo: number;
  descripcion?: string;
  /** Solo plataformas de armado: licencia por cada persona que USA el sistema, después de entregarlo. */
  usd_por_usuario_final_mes?: number;
  /** Cuántos usuarios finales se asumen si el proyecto no lo capturó. */
  usuarios_finales_supuestos?: number;
}

export interface TablaHerramientas {
  por_modo: Record<string, CostoHerramientaModo>;
  [extra: string]: unknown;
}

/** Nivel de pericia (1 a 5) → parte de la ganancia nominal que se acredita. */
export type FactoresPericia = Record<string, number>;

export const HERRAMIENTAS_POR_OMISION: TablaHerramientas = {
  por_modo: {
    traditional: { usd_por_persona_mes: 0, sobreconsumo: 0, descripcion: "Sin herramientas de IA." },
    ai_assisted: { usd_por_persona_mes: 30, sobreconsumo: 0.10, descripcion: "Copilot Business o Cursor Pro más un asistente (Claude Pro o ChatGPT Plus)." },
    hybrid: { usd_por_persona_mes: 100, sobreconsumo: 0.20, descripcion: "Claude Max 5x, o Cursor Pro+ más Copilot Business y Claude Pro." },
    bytecoding_prompts: { usd_por_persona_mes: 250, sobreconsumo: 0.30, descripcion: "Claude Max 20x o Cursor Ultra más consumo de agentes." },
    low_code: {
      usd_por_persona_mes: 40,
      sobreconsumo: 0,
      descripcion: "Asiento de constructor (Power Apps Premium) más asistente de IA.",
      usd_por_usuario_final_mes: 20,
      usuarios_finales_supuestos: 10,
    },
  },
};

export const PERICIA_POR_OMISION: FactoresPericia = { "1": 0.35, "2": 0.65, "3": 0.85, "4": 1.0, "5": 1.15 };

/** DOF/Banxico FIX al 09-09-2026. Se actualiza en /admin/parametros. */
export const TIPO_CAMBIO_POR_OMISION = 16.92;

export const PERICIA_ETIQUETAS: Record<number, string> = {
  1: "Nunca ha usado IA para programar",
  2: "La ha probado",
  3: "La usa en algunos proyectos",
  4: "La usa a diario y sabe dar instrucciones",
  5: "Arma flujos con agentes y revisa lo que generan",
};

export interface PersonaHerramienta {
  role: string;
  availabilityPercent: number | string;
  aiSkill?: number | null;
}

const esTecnico = (p: PersonaHerramienta) => (ROLES_CON_ASIENTO as readonly string[]).includes(p.role);

/** Un asiento por persona técnica. No se prorratea: la licencia se paga completa aunque trabaje medio tiempo. */
export function asientosDeHerramienta(team: PersonaHerramienta[]): number {
  return team.filter(esTecnico).length;
}

/**
 * Pericia promedio del equipo con la IA (1 a 5), ponderada por disponibilidad y
 * solo entre puestos técnicos. Si nadie tiene dato, 3 ("la usa en algunos
 * proyectos"), y se dice.
 */
export function periciaDelEquipo(team: PersonaHerramienta[]): { promedio: number; conDato: boolean; personas: number } {
  const tecnicos = team.filter(esTecnico);
  const base = tecnicos.length > 0 ? tecnicos : team;
  const conDato = base.filter((p) => p.aiSkill != null && Number.isFinite(Number(p.aiSkill)));
  if (conDato.length === 0) return { promedio: 3, conDato: false, personas: base.length };
  let peso = 0;
  let suma = 0;
  for (const p of conDato) {
    const w = Math.max(0, Number(p.availabilityPercent)) || 0;
    const nivel = Math.min(5, Math.max(1, Number(p.aiSkill)));
    peso += w;
    suma += nivel * w;
  }
  const promedio = peso > 0 ? suma / peso : conDato.reduce((a, p) => a + Number(p.aiSkill), 0) / conDato.length;
  return { promedio: Math.round(promedio * 100) / 100, conDato: true, personas: base.length };
}

/** Interpola entre niveles enteros; fuera de 1..5 se recorta. */
export function factorDePericia(pericia: number, factores: FactoresPericia = PERICIA_POR_OMISION): number {
  const p = Math.min(5, Math.max(1, pericia));
  const bajo = Math.floor(p);
  const alto = Math.min(5, bajo + 1);
  const fBajo = factores[String(bajo)] ?? 1;
  const fAlto = factores[String(alto)] ?? fBajo;
  const t = p - bajo;
  return Math.round((fBajo + (fAlto - fBajo) * t) * 10000) / 10000;
}

export interface ModoAjustadoPorPericia {
  velocity_factor: number;
  prototype_speedup: number;
  effort_efficiency: number;
  /** Parte de la ganancia nominal que se acredita (1 = la nominal completa). */
  factor: number;
  /** false en tradicional y low-code: su ganancia no depende de saber dar instrucciones. */
  aplica: boolean;
  nominal: { velocity_factor: number; prototype_speedup: number; effort_efficiency: number };
}

/**
 * La ganancia de un modo es lo que se ahorra respecto a hacerlo a mano:
 * (1 − effort_efficiency) en horas y (velocity_factor − 1) en calendario.
 * Se acredita solo la parte que corresponde a la pericia del equipo.
 * Con factor 1 el resultado es idéntico al nominal.
 */
export function ajustarPorPericia(
  v: ModeVelocity & { effort_efficiency?: number },
  mode: DevelopmentMode,
  pericia: number,
  factores: FactoresPericia = PERICIA_POR_OMISION,
): ModoAjustadoPorPericia {
  const nominal = {
    velocity_factor: v.velocity_factor,
    prototype_speedup: v.prototype_speedup,
    effort_efficiency: v.effort_efficiency ?? 1.0,
  };
  const aplica = MODOS_CON_PERICIA.includes(mode);
  if (!aplica) return { ...nominal, factor: 1, aplica, nominal };
  const f = factorDePericia(pericia, factores);
  const r4 = (n: number) => Math.round(n * 10000) / 10000;
  return {
    velocity_factor: r4(1 + (nominal.velocity_factor - 1) * f),
    prototype_speedup: r4(1 + (nominal.prototype_speedup - 1) * f),
    // Nunca por arriba de 1: con poca pericia se pierde el ahorro, no se agregan horas.
    effort_efficiency: r4(Math.min(1, 1 - (1 - nominal.effort_efficiency) * f)),
    factor: f,
    aplica,
    nominal,
  };
}

export interface ResultadoHerramientas {
  asientos: number;
  usdPorAsiento: number;
  sobreconsumo: number;
  tipoCambio: number;
  /** Pesos al mes, sin IVA (acreditable si la plataforma está inscrita en el SAT). */
  mensualMXN: number;
  descripcion: string;
  /** Solo plataformas de armado: licencias por usuario final después de entregar. */
  usuariosFinales: number;
  usuariosFinalesSupuestos: boolean;
  usdPorUsuarioFinal: number;
  mensualUsuariosFinalesMXN: number;
}

export function costoHerramientasPorModo(input: {
  mode: DevelopmentMode | string;
  asientos: number;
  tabla?: TablaHerramientas;
  tipoCambio?: number;
  usuariosFinales?: number | null;
}): ResultadoHerramientas {
  const tabla = input.tabla ?? HERRAMIENTAS_POR_OMISION;
  const tipoCambio = input.tipoCambio && input.tipoCambio > 0 ? input.tipoCambio : TIPO_CAMBIO_POR_OMISION;
  const fila = tabla.por_modo[input.mode] ?? HERRAMIENTAS_POR_OMISION.por_modo[input.mode] ?? { usd_por_persona_mes: 0, sobreconsumo: 0 };
  const usd = Math.max(0, Number(fila.usd_por_persona_mes) || 0);
  const sobre = Math.max(0, Number(fila.sobreconsumo) || 0);
  const asientos = Math.max(0, Math.floor(input.asientos));
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const usdUsuario = Math.max(0, Number(fila.usd_por_usuario_final_mes) || 0);
  const supuestos = !(input.usuariosFinales != null && input.usuariosFinales > 0);
  const usuariosFinales = usdUsuario > 0 ? (supuestos ? Math.max(0, Number(fila.usuarios_finales_supuestos) || 0) : Number(input.usuariosFinales)) : 0;

  return {
    asientos,
    usdPorAsiento: usd,
    sobreconsumo: sobre,
    tipoCambio,
    mensualMXN: r2(asientos * usd * (1 + sobre) * tipoCambio),
    descripcion: fila.descripcion ?? "",
    usuariosFinales,
    usuariosFinalesSupuestos: usdUsuario > 0 && supuestos,
    usdPorUsuarioFinal: usdUsuario,
    mensualUsuariosFinalesMXN: r2(usuariosFinales * usdUsuario * tipoCambio),
  };
}
