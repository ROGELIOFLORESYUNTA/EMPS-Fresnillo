/**
 * Etiquetas y agrupación del catálogo de parámetros fiscales y laborales.
 *
 * Vive aparte porque lo usan dos pantallas: la pública de fuentes
 * (/fuentes, solo lectura) y el editor donde cada visitante ajusta sus
 * propios valores (/admin/parametros).
 */

export const CATEGORIAS: Record<string, string> = {
  IMSS: "Cuotas IMSS por ramo",
  UMA: "Unidad de Medida y Actualización",
  SALARIO: "Salarios mínimos",
  LFT: "Prestaciones de la Ley Federal del Trabajo",
  ZAC: "Impuestos del Estado de Zacatecas",
  INFONAVIT: "INFONAVIT",
  FED: "Impuestos federales (IVA, ISR)",
  RECURSOS: "Equipo, materiales y gastos",
  MODO: "Modos de desarrollo",
  CHANGE: "Cálculo de cambios a medio proyecto",
  CHATBOT: "Cotizador automático",
  OTROS: "Otros",
};

/**
 * Orden en que se muestran los grupos. Primero lo que cualquiera reconoce y
 * puede ir a verificar en una ley (impuestos, cuotas, prestaciones); al final
 * la calibración propia del sistema. Antes salían en orden alfabético, así que
 * lo primero que veía el visitante eran los factores internos de cambios.
 */
export const ORDEN_CATEGORIAS = [
  "FED",
  "IMSS",
  "INFONAVIT",
  "ZAC",
  "LFT",
  "SALARIO",
  "UMA",
  "RECURSOS",
  "MODO",
  "CHANGE",
  "CHATBOT",
  "OTROS",
];

/** Fuente oficial de cada grupo, en lenguaje llano, para la página pública. */
export const FUENTE_POR_CATEGORIA: Record<string, string> = {
  IMSS: "Ley del Seguro Social y las cuotas vigentes del IMSS.",
  UMA: "Valor publicado por el INEGI en el Diario Oficial de la Federación.",
  SALARIO: "Salarios mínimos aprobados por la CONASAMI y publicados en el Diario Oficial.",
  LFT: "Ley Federal del Trabajo, incluida la reforma de vacaciones vigente desde 2023.",
  ZAC: "Ley de Hacienda del Estado de Zacatecas y la Secretaría de Finanzas estatal.",
  INFONAVIT: "Ley del INFONAVIT.",
  FED: "Ley del IVA y Ley del Impuesto sobre la Renta.",
  RECURSOS: "Ley del Impuesto sobre la Renta para la depreciación, y supuestos propios del sistema para el uso del equipo.",
  MODO: "Estudios publicados sobre productividad por forma de desarrollo, calibrados para este sistema.",
  CHANGE: "Práctica internacional de gestión de proyectos, ajustada al costo laboral mexicano.",
  CHATBOT: "Ajustes comerciales propios del cotizador.",
  OTROS: "Valores internos del sistema.",
};

export function categorizar(key: string): string {
  if (key.startsWith("CHATBOT_")) return "CHATBOT";
  if (key.startsWith("CHANGE_")) return "CHANGE";
  if (key.startsWith("IMSS_") || key === "SBC_TOPE_UMA") return "IMSS";
  if (key.startsWith("UMA_")) return "UMA";
  if (key.startsWith("SALARIO_")) return "SALARIO";
  if (key.startsWith("LFT_")) return "LFT";
  if (key.startsWith("RESOURCE_") || key.startsWith("DEPRECIACION_")) return "RECURSOS";
  if (key === "ISN_ZACATECAS" || key === "IMPUESTO_UAZ") return "ZAC";
  if (key === "INFONAVIT_PATRON") return "INFONAVIT";
  if (key === "IVA_GENERAL" || key === "ISR_PERSONA_MORAL") return "FED";
  if (key.startsWith("DEV_MODE") || key === "SCENARIO_FACTORS" || key === "DEFAULT_CARGA_PATRONAL_ESTIMADA") return "MODO";
  return "OTROS";
}

const SIGLAS = new Set([
  "IMSS", "IVA", "ISR", "ISN", "UMA", "UAZ", "SBC", "PTU", "CEAV", "LFT",
  "RESICO", "PF", "INFONAVIT", "ZLFN", "CHATBOT", "ROSBECLOUD",
]);

/**
 * Nombre de cada valor en español, como lo diría alguien del Ayuntamiento.
 *
 * Sin esto, la pantalla pública mostraba "Change Artifact Weights" o
 * "IMSS Eym especie cuota fija patron", que no le dicen nada a nadie y en la
 * página que existe para dar confianza se leían como descuido.
 */
const NOMBRES_ES: Record<string, string> = {
  // Impuestos federales
  IVA_GENERAL: "IVA general",
  ISR_PERSONA_MORAL: "ISR de persona moral",

  // IMSS
  IMSS_EYM_ESPECIE_CUOTA_FIJA_PATRON: "Enfermedad y maternidad, cuota fija en especie (patrón)",
  IMSS_EYM_ESPECIE_EXCEDENTE_PATRON: "Enfermedad y maternidad, excedente en especie (patrón)",
  IMSS_EYM_ESPECIE_EXCEDENTE_OBRERO: "Enfermedad y maternidad, excedente en especie (trabajador)",
  IMSS_EYM_DINERO_PATRON: "Enfermedad y maternidad, prestaciones en dinero (patrón)",
  IMSS_EYM_DINERO_OBRERO: "Enfermedad y maternidad, prestaciones en dinero (trabajador)",
  IMSS_EYM_PENSIONADOS_PATRON: "Gastos médicos de pensionados (patrón)",
  IMSS_EYM_PENSIONADOS_OBRERO: "Gastos médicos de pensionados (trabajador)",
  IMSS_INVALIDEZ_VIDA_PATRON: "Invalidez y vida (patrón)",
  IMSS_INVALIDEZ_VIDA_OBRERO: "Invalidez y vida (trabajador)",
  IMSS_RETIRO_PATRON: "Retiro (patrón)",
  IMSS_CEAV_PATRON_2026: "Cesantía en edad avanzada y vejez (patrón)",
  IMSS_CV_OBRERO: "Cesantía en edad avanzada y vejez (trabajador)",
  IMSS_GUARDERIAS_PATRON: "Guarderías y prestaciones sociales (patrón)",
  IMSS_RIESGO_TRABAJO_CLASE_I: "Riesgo de trabajo, clase I (riesgo mínimo, oficinas)",
  IMSS_RIESGO_TRABAJO_CLASE_II: "Riesgo de trabajo, clase II (riesgo bajo)",
  IMSS_RIESGO_TRABAJO_CLASE_III: "Riesgo de trabajo, clase III (riesgo medio)",
  IMSS_RIESGO_TRABAJO_CLASE_IV: "Riesgo de trabajo, clase IV (riesgo alto)",
  IMSS_RIESGO_TRABAJO_CLASE_V: "Riesgo de trabajo, clase V (riesgo máximo)",
  SBC_TOPE_UMA: "Tope del salario base de cotización, en UMA",
  INFONAVIT_PATRON: "Aportación al INFONAVIT (patrón)",

  // Zacatecas
  ISN_ZACATECAS: "Impuesto sobre nóminas de Zacatecas",
  IMPUESTO_UAZ: "Sobretasa para la Universidad Autónoma de Zacatecas",

  // Ley Federal del Trabajo
  LFT_AGUINALDO_DIAS_MIN: "Aguinaldo, días mínimos de ley",
  LFT_PRIMA_VACACIONAL_MIN: "Prima vacacional mínima",
  LFT_PTU_PORCENTAJE: "Reparto de utilidades (PTU)",
  LFT_VACACIONES_DIAS_2026: "Vacaciones, días del primer año",

  // Salarios y UMA
  SALARIO_MINIMO_GENERAL_DIARIO: "Salario mínimo general, por día",
  SALARIO_MINIMO_GENERAL_MENSUAL: "Salario mínimo general, por mes",
  SALARIO_MINIMO_FRONTERA_DIARIO: "Salario mínimo de la frontera norte, por día",
  SALARIO_MINIMO_FRONTERA_MENSUAL: "Salario mínimo de la frontera norte, por mes",
  UMA_DIARIA: "UMA por día",
  UMA_MENSUAL: "UMA por mes",
  UMA_ANUAL: "UMA por año",

  // Equipo, materiales y gastos
  DEPRECIACION_COMPUTO_ANUAL: "Depreciación anual de equipo de cómputo",
  DEPRECIACION_MOBILIARIO_OFICINA_ANUAL: "Depreciación anual de mobiliario de oficina",
  RESOURCE_ADMIN_OVERHEAD_DEFAULT: "Gasto administrativo sobre equipo y materiales",
  RESOURCE_DEFAULT_ALLOCATION_PERCENT: "Porcentaje de uso que se carga al proyecto",
  RESOURCE_VAT_CREDITABLE_WITH_CFDI_DEFAULT: "IVA que se puede acreditar con factura",
  RESOURCE_VAT_CREDITABLE_WITHOUT_CFDI_DEFAULT: "IVA que se puede acreditar sin factura",

  // Modos de desarrollo
  DEV_MODE_FACTORS: "Rendimiento de cada modo de desarrollo",
  DEV_MODE_VELOCITY: "Velocidad de avance por modo de desarrollo",
  SCENARIO_FACTORS: "Factores de los escenarios optimista, probable y conservador",
  DEFAULT_CARGA_PATRONAL_ESTIMADA: "Carga patronal estimada cuando no se captura el equipo",

  // Cambios a medio proyecto
  CHANGE_ARTIFACT_WEIGHTS: "Trabajo que implica cada cosa que hay que rehacer",
  CHANGE_CLARITY_FACTOR: "Ajuste según qué tan claro estaba el requerimiento",
  CHANGE_CONTINGENCY_BY_TYPE: "Reserva para imprevistos según el tipo de cambio",
  CHANGE_FREE_CHANGE_LIMIT_MXN: "Monto hasta el cual un cambio no se cobra",
  CHANGE_HIGH_RISK_MODE_FLOOR: "Riesgo mínimo que se asume por modo de desarrollo",
  CHANGE_HOURLY_RATE_DEFAULT_MXN: "Tarifa por hora de referencia para cobrar cambios",
  CHANGE_MAINTENANCE_RATE_BY_RISK: "Costo del mantenimiento según el riesgo del sistema",
  CHANGE_MINIMUM_CHARGE_MXN: "Cobro mínimo por atender un cambio",
  CHANGE_MODE_FACTOR: "Cuánto encarece el cambio según el modo de desarrollo",
  CHANGE_PHASE_FACTOR: "Cuánto encarece el cambio según la fase del proyecto",
};

/** Convierte IMSS_ENFERMEDAD_MATERNIDAD_FIJA en "IMSS Enfermedad maternidad fija". */
export function nombreLegible(key: string): string {
  const enEspanol = NOMBRES_ES[key];
  if (enEspanol) return enEspanol;
  return key
    .split("_")
    .map((w) => (SIGLAS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

/**
 * La fuente, como se le muestra al visitante.
 *
 * Algunos valores traen en su campo `source` el archivo interno del que se
 * sembraron (por ejemplo "EMPS Fresnillo v7 (31_seed_...json)"). Un nombre de
 * archivo no es fundamento para nadie, y en la pantalla que existe para dar
 * confianza se leía como descuido. Se dice lo que realmente son: calibración
 * del propio sistema, no una cifra de ley.
 */
export function fuenteLegible(source: string | null | undefined): string {
  if (!source) return "Valor interno del sistema.";
  if (/\.(json|csv|sql|md|ts|tsx)\b/i.test(source)) {
    return "Calibración propia de este sistema. No es una cifra de ley.";
  }
  return source;
}

/**
 * Valor y unidad como los leeria alguien del Ayuntamiento.
 *
 * En la base los porcentajes viven como fraccion (0.16) y la unidad como
 * "rate". Mostrarlos crudos obligaba al lector a hacer la conversion mental
 * en la pantalla que debe convencerlo, asi que aqui se traducen: 0.16 -> 16%.
 */
export function valorLegible(value: string | null, unit: string): { valor: string; unidad: string } {
  if (unit === "json" || unit === "table" || unit === "table_antiguedad") {
    return { valor: "tabla", unidad: "varios valores" };
  }
  const n = value === null ? NaN : Number(value);
  if (Number.isNaN(n)) return { valor: value ?? "—", unidad: unit };

  switch (unit) {
    case "rate": {
      // Redondeo a 4 decimales: cuotas como 0.00625 no deben perder digitos.
      const pct = Math.round(n * 1000000) / 10000;
      return { valor: `${pct}%`, unidad: "porcentaje" };
    }
    case "MXN":
      return {
        valor: n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }),
        unidad: "pesos",
      };
    case "dias_salario":
      return { valor: String(n), unidad: n === 1 ? "día de salario" : "días de salario" };
    case "veces_UMA":
      return { valor: String(n), unidad: n === 1 ? "vez la UMA" : "veces la UMA" };
    default:
      return { valor: String(n), unidad: unit };
  }
}
