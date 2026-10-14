/**
 * Aptitud de cada forma de hacerlo (modo de desarrollo) PARA ESTE proyecto.
 *
 * Antes la recomendación la decidía el rol y no el proyecto: el orden de
 * precio entre modos está fijo por construcción (low-code siempre es el más
 * barato y rápido) y ningún dato del proyecto podía cambiarlo. Un sinodal
 * preguntaría "¿tu sistema recomienda low-code para todo?" y la respuesta era
 * sí.
 *
 * Esta función mira lo que ya se captura (integraciones, datos personales,
 * criticidad, claridad) y dice, por modo, si es apto, si va con reservas o si
 * no se recomienda, con la razón en lenguaje llano. El motor de recomendación
 * excluye los no recomendables y penaliza los que van con reservas. Así la
 * recomendación cambia con el proyecto y se puede defender caso por caso.
 *
 * Los umbrales están aquí, en un solo lugar, para que la tesis pueda citarlos
 * y para poder moverlos sin tocar la lógica.
 */
import type { ModuleInput } from "./types";

export type Veredicto = "apto" | "con_reservas" | "no_recomendable";

export interface AptitudModo {
  mode: string;
  veredicto: Veredicto;
  razones: string[];
}

export const UMBRALES_APTITUD = {
  /** Con más de estas integraciones, low-code no se recomienda. */
  lowCodeIntegracionesMax: 3,
  /** Con más de esta cantidad, low-code va con reservas. */
  lowCodeIntegracionesReservas: 1,
  /** Criticidad a partir de la cual un módulo con datos personales descarta low-code. */
  lowCodeCriticidadDescarta: 5,
  /** Criticidad a partir de la cual low-code va con reservas. */
  lowCodeCriticidadReservas: 4,
  /** Claridad promedio por debajo de la cual bytecoding no se recomienda. */
  bytecodingClaridadMin: 2.5,
  /** Claridad promedio por debajo de la cual bytecoding va con reservas. */
  bytecodingClaridadReservas: 3.5,
  /** Claridad promedio por debajo de la cual el asistido por IA va con reservas. */
  asistidoClaridadReservas: 2.5,
  /** Claridad promedio por debajo de la cual el híbrido va con reservas. */
  hibridoClaridadReservas: 2.0,
  /** Pericia del equipo con la IA (1-5) por debajo de la cual bytecoding no se recomienda. */
  bytecodingPericiaMin: 2,
  /** Pericia por debajo de la cual bytecoding va con reservas. */
  bytecodingPericiaReservas: 3,
  /** Pericia por debajo de la cual el asistido por IA y el híbrido van con reservas. */
  asistidoPericiaReservas: 2,
} as const;

export type UmbralesAptitud = typeof UMBRALES_APTITUD;

export const MODOS = ["traditional", "ai_assisted", "hybrid", "bytecoding_prompts", "low_code"] as const;

function resumen(modules: ModuleInput[]) {
  const n = Math.max(1, modules.length);
  return {
    integraciones: modules.reduce((a, m) => a + (m.integrationsCount ?? 0), 0),
    datosPersonales: modules.some((m) => m.sensitiveData),
    criticidadMax: modules.reduce((a, m) => Math.max(a, m.criticality), 0),
    // Módulos que a la vez son críticos y manejan datos personales: donde una
    // plataforma de armado o código generado sin revisar duele más.
    criticosConDatos: modules.filter((m) => m.sensitiveData && m.criticality >= 5).length,
    claridad: modules.reduce((a, m) => a + m.clarity, 0) / n,
  };
}

export interface EquipoParaAptitud {
  /** Pericia promedio del equipo con la IA, 1 a 5; null si no se capturó. */
  periciaIA?: number | null;
}

export function aptitudDeModos(
  modules: ModuleInput[],
  umbrales: UmbralesAptitud = UMBRALES_APTITUD,
  equipo?: EquipoParaAptitud,
): Record<string, AptitudModo> {
  const r = resumen(modules);
  const out: Record<string, AptitudModo> = {};
  const pericia = equipo?.periciaIA != null && Number.isFinite(equipo.periciaIA) ? equipo.periciaIA : null;

  // --- Low-code: rápido y barato para registros sencillos; frágil con
  //     integraciones, datos personales y módulos críticos.
  {
    const razones: string[] = [];
    let veredicto: Veredicto = "apto";
    if (r.integraciones > umbrales.lowCodeIntegracionesMax) {
      veredicto = "no_recomendable";
      razones.push(`Se conecta con ${r.integraciones} sistemas de afuera; las plataformas de armado se atoran con tantas conexiones.`);
    } else if (r.integraciones > umbrales.lowCodeIntegracionesReservas) {
      veredicto = "con_reservas";
      razones.push(`Se conecta con ${r.integraciones} sistemas de afuera; hay que confirmar que la plataforma los soporte.`);
    }
    if (r.criticosConDatos > 0 && r.criticidadMax >= umbrales.lowCodeCriticidadDescarta) {
      veredicto = "no_recomendable";
      // La razón que descarta va primero: es la que se muestra en una sola línea.
      razones.unshift(
        `${r.criticosConDatos === 1 ? "Una pieza crítica maneja" : `${r.criticosConDatos} piezas críticas manejan`} datos personales; con una plataforma de armado no controlas dónde quedan ni cómo se protegen.`,
      );
    } else if (r.datosPersonales || r.criticidadMax >= umbrales.lowCodeCriticidadReservas) {
      if (veredicto === "apto") veredicto = "con_reservas";
      razones.push(
        r.datosPersonales
          ? "Maneja datos personales; hay que revisar dónde los guarda la plataforma y bajo qué contrato."
          : "Tiene piezas de alta criticidad; una falla de la plataforma es una falla del sistema completo.",
      );
    }
    if (razones.length === 0) razones.push("Registros sencillos, sin conexiones delicadas: es donde estas plataformas rinden mejor.");
    out.low_code = { mode: "low_code", veredicto, razones };
  }

  // --- Bytecoding (casi todo con IA): necesita saber con claridad qué se
  //     quiere; con requisitos vagos genera mucho que hay que tirar.
  {
    const razones: string[] = [];
    let veredicto: Veredicto = "apto";
    if (r.claridad < umbrales.bytecodingClaridadMin) {
      veredicto = "no_recomendable";
      razones.push(`La claridad promedio es ${r.claridad.toFixed(1)} de 5: generar código sobre requisitos vagos produce trabajo que se tira.`);
    } else if (r.claridad < umbrales.bytecodingClaridadReservas) {
      veredicto = "con_reservas";
      razones.push(`La claridad promedio es ${r.claridad.toFixed(1)} de 5; conviene aclarar antes de generar.`);
    }
    if (r.datosPersonales && r.criticidadMax >= umbrales.lowCodeCriticidadReservas) {
      if (veredicto === "apto") veredicto = "con_reservas";
      razones.push("Hay piezas críticas con datos personales: el código generado necesita revisión de seguridad por una persona.");
    }
    if (pericia != null && pericia < umbrales.bytecodingPericiaMin) {
      veredicto = "no_recomendable";
      // La razón que descarta va primero: es la que se muestra en una sola línea.
      razones.unshift(`El equipo casi no ha trabajado con IA (pericia ${pericia.toFixed(1)} de 5): hacer casi todo con IA sin saber dar instrucciones sale más lento, no más rápido.`);
    } else if (pericia != null && pericia < umbrales.bytecodingPericiaReservas) {
      if (veredicto === "apto") veredicto = "con_reservas";
      razones.push(`La pericia del equipo con la IA es ${pericia.toFixed(1)} de 5: se acredita solo parte del ahorro; conviene capacitar antes de cotizar así.`);
    }
    if (razones.length === 0) razones.push("Los requisitos están claros; el código generado se puede revisar y endurecer sin sorpresas.");
    out.bytecoding_prompts = { mode: "bytecoding_prompts", veredicto, razones };
  }

  // --- Asistido por IA
  {
    const razones: string[] = [];
    let veredicto: Veredicto = "apto";
    if (r.claridad < umbrales.asistidoClaridadReservas) {
      veredicto = "con_reservas";
      razones.push(`Con claridad ${r.claridad.toFixed(1)} de 5, la ayuda de la IA rinde menos: primero hay que entender qué se quiere.`);
    }
    if (pericia != null && pericia < umbrales.asistidoPericiaReservas) {
      veredicto = "con_reservas";
      razones.push(`El equipo casi no ha usado IA (pericia ${pericia.toFixed(1)} de 5): las primeras semanas no ahorran tiempo.`);
    }
    if (razones.length === 0) razones.push("Una persona programa con ayuda de la IA y revisa todo; sirve para casi cualquier proyecto.");
    out.ai_assisted = { mode: "ai_assisted", veredicto, razones };
  }

  // --- Híbrido
  {
    const razones: string[] = [];
    let veredicto: Veredicto = "apto";
    if (r.claridad < umbrales.hibridoClaridadReservas) {
      veredicto = "con_reservas";
      razones.push(`Con claridad ${r.claridad.toFixed(1)} de 5, cualquier forma de hacerlo va a necesitar retrabajo.`);
    }
    if (pericia != null && pericia < umbrales.asistidoPericiaReservas) {
      veredicto = "con_reservas";
      razones.push(`El equipo casi no ha usado IA (pericia ${pericia.toFixed(1)} de 5): la parte con IA va a rendir menos de lo nominal.`);
    }
    if (razones.length === 0) razones.push("Lo crítico a mano y lo repetitivo con IA; es la forma más equilibrada para un sistema municipal.");
    out.hybrid = { mode: "hybrid", veredicto, razones };
  }

  // --- Tradicional: siempre apto; su problema es el costo, no la aptitud.
  out.traditional = {
    mode: "traditional",
    veredicto: "apto",
    razones: ["Todo a mano y revisado; es la forma más lenta y cara, pero sirve para cualquier proyecto."],
  };

  return out;
}

export const VEREDICTO_ETIQUETA: Record<Veredicto, string> = {
  apto: "Sirve para este proyecto",
  con_reservas: "Sirve, con reservas",
  no_recomendable: "No se recomienda para este proyecto",
};
