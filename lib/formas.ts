/**
 * Las cinco formas de hacerlo, con el nombre que usa la gente.
 *
 * La clave técnica (`value`) es la que guarda la base de datos y no cambia;
 * el nombre llano es el que se ve en pantalla y el nombre técnico queda para
 * el atributo `title` (el texto que sale al dejar el cursor encima).
 *
 * Van en orden de la más lenta a la más rápida, que es el orden en que se
 * dibujan las gráficas.
 */
export type ClaveDeForma = "traditional" | "ai_assisted" | "hybrid" | "bytecoding_prompts" | "low_code";

export interface FormaDeHacerlo {
  value: ClaveDeForma;
  /** Nombre que se ve: "A mano", "Con IA"... */
  nombre: string;
  /** Nombre técnico, solo para el `title`. */
  tecnico: string;
}

export const FORMAS_DE_HACERLO: readonly FormaDeHacerlo[] = [
  { value: "traditional", nombre: "A mano", tecnico: "Tradicional" },
  { value: "ai_assisted", nombre: "Con IA", tecnico: "Asistido por herramientas generativas" },
  { value: "hybrid", nombre: "Híbrido", tecnico: "Híbrido" },
  { value: "bytecoding_prompts", nombre: "Casi todo con IA", tecnico: "Bytecoding (prompts)" },
  { value: "low_code", nombre: "Plataforma de armado", tecnico: "Low-code" },
] as const;

/** clave -> nombre llano. */
export const NOMBRE_DE_FORMA: Record<string, string> = Object.fromEntries(FORMAS_DE_HACERLO.map((f) => [f.value, f.nombre]));

/** clave -> nombre técnico. */
export const NOMBRE_TECNICO_DE_FORMA: Record<string, string> = Object.fromEntries(
  FORMAS_DE_HACERLO.map((f) => [f.value, f.tecnico]),
);

/** Nombre llano de una forma; si la clave no se conoce, la clave sin guiones bajos. */
export function nombreDeForma(clave: string | null | undefined): string {
  if (!clave) return "";
  return NOMBRE_DE_FORMA[clave] ?? clave.replace(/_/g, " ");
}

/** Escenarios: nombre corto y la frase que lo explica. */
export const ESCENARIOS_LLANOS = [
  { value: "optimistic", nombre: "Optimista", frase: "si todo sale bien" },
  { value: "probable", nombre: "Probable", frase: "lo más seguro" },
  { value: "conservative", nombre: "Conservador", frase: "si hay tropiezos" },
] as const;

/** clave de escenario -> nombre en minúsculas, como se lee en una frase. */
export const NOMBRE_DE_ESCENARIO: Record<string, string> = {
  optimistic: "optimista",
  probable: "probable",
  conservative: "conservador",
};
