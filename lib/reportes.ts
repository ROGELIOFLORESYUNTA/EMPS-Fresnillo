/**
 * Qué reportes existen y en qué cara se ofrece cada uno.
 *
 * Una sola lista para las dos pantallas que la necesitan: el índice de
 * reportes de un proyecto y cada reporte. La regla de fondo (lib/lado.ts) es
 * que el cliente no ve la nómina ni la utilidad del desarrollador, y el
 * desarrollador no recibe el reporte redactado para el Ayuntamiento. Un
 * reporte que no corresponde a la cara contesta 404, igual que un proyecto del
 * otro lado.
 *
 * Archivo de datos puros: sin Node, Prisma ni cookies, para poder probarlo.
 */
import type { Lado } from "@/lib/lado";

export interface DefinicionDeReporte {
  title: string;
  /** Para quién está redactado. */
  audience: string;
  /** Una frase para el índice de reportes. */
  descripcion: string;
  /** Caras donde se ofrece. */
  lados: readonly Lado[];
  /** Solo con sesión de investigador (cookie de administrador). */
  soloAdmin?: boolean;
  /** false = todavía no se puede abrir; el índice lo muestra "en preparación". */
  disponible: boolean;
}

export const REPORTES: Record<string, DefinicionDeReporte> = {
  municipal: {
    title: "Reporte para Ayuntamiento",
    audience: "Ayuntamiento de Fresnillo, Zacatecas",
    descripcion:
      "Resumen ejecutivo: alcance, tiempos, costos, riesgos, qué NO está incluido, mantenimiento, alertas de cotización baja, checklist de aceptación.",
    lados: ["ayuntamiento"],
    disponible: true,
  },
  provider: {
    title: "Reporte de viabilidad para proveedor",
    audience: "Proveedor de software",
    descripcion:
      "Costo real del equipo, capital de trabajo, impuestos estimados, margen, precio mínimo sostenible, recomendación de anticipo y mantenimiento.",
    lados: ["desarrollador"],
    disponible: true,
  },
  cotizacion: {
    title: "Cotización para tu cliente",
    audience: "Tu cliente",
    descripcion: "La cotización lista para llevar a tu cliente: el precio, el tiempo y lo que incluye.",
    lados: ["desarrollador"],
    disponible: false,
  },
  research: {
    title: "Reporte académico (validación de investigación)",
    audience: "Universidad Autónoma de Zacatecas",
    descripcion: "Datos del proyecto y de cada estimación para la validación de la hipótesis.",
    lados: ["desarrollador", "ayuntamiento"],
    soloAdmin: true,
    disponible: true,
  },
};

/** El tipo viene de la URL: ojo con nombres como "constructor", que no son reportes. */
function definicion(tipo: string): DefinicionDeReporte | null {
  return Object.prototype.hasOwnProperty.call(REPORTES, tipo) ? REPORTES[tipo] : null;
}

/** ¿Se puede abrir este reporte desde esta cara? Si no, hay que contestar 404. */
export function reportePermitido(tipo: string, lado: Lado, esAdmin: boolean): boolean {
  const def = definicion(tipo);
  if (!def || !def.disponible) return false;
  if (!def.lados.includes(lado)) return false;
  if (def.soloAdmin && !esAdmin) return false;
  return true;
}

export interface ReporteDelIndice extends DefinicionDeReporte {
  key: string;
}

/** Los reportes que el índice de un proyecto ofrece en esta cara (el académico no va ahí). */
export function reportesDelIndice(lado: Lado): ReporteDelIndice[] {
  return Object.entries(REPORTES)
    .filter(([, def]) => !def.soloAdmin && def.lados.includes(lado))
    .map(([key, def]) => ({ key, ...def }));
}
