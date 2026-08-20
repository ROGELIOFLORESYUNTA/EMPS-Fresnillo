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
  MODO: "Modos de desarrollo",
  CHANGE: "Cálculo de cambios a medio proyecto",
  CHATBOT: "Cotizador automático",
  OTROS: "Otros",
};

/** Fuente oficial de cada grupo, en lenguaje llano, para la página pública. */
export const FUENTE_POR_CATEGORIA: Record<string, string> = {
  IMSS: "Ley del Seguro Social y las cuotas vigentes del IMSS.",
  UMA: "Valor publicado por el INEGI en el Diario Oficial de la Federación.",
  SALARIO: "Salarios mínimos aprobados por la CONASAMI y publicados en el Diario Oficial.",
  LFT: "Ley Federal del Trabajo, incluida la reforma de vacaciones vigente desde 2023.",
  ZAC: "Ley de Hacienda del Estado de Zacatecas y la Secretaría de Finanzas estatal.",
  INFONAVIT: "Ley del INFONAVIT.",
  FED: "Ley del IVA y Ley del Impuesto sobre la Renta.",
  MODO: "Estudios publicados sobre productividad por forma de desarrollo, calibrados para este sistema.",
  CHANGE: "Práctica internacional de gestión de proyectos, ajustada al costo laboral mexicano.",
  CHATBOT: "Ajustes comerciales propios del cotizador.",
  OTROS: "Valores internos del sistema.",
};

export function categorizar(key: string): string {
  if (key.startsWith("CHATBOT_")) return "CHATBOT";
  if (key.startsWith("CHANGE_")) return "CHANGE";
  if (key.startsWith("IMSS_")) return "IMSS";
  if (key.startsWith("UMA_")) return "UMA";
  if (key.startsWith("SALARIO_")) return "SALARIO";
  if (key.startsWith("LFT_")) return "LFT";
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

/** Convierte IMSS_ENFERMEDAD_MATERNIDAD_FIJA en "IMSS Enfermedad maternidad fija". */
export function nombreLegible(key: string): string {
  return key
    .split("_")
    .map((w) => (SIGLAS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}
