/**
 * El "lado" desde el que se ve el sistema, decidido por el host.
 *
 * Hay dos caras con el mismo código y la misma base de datos:
 *   - desarrollador: estimacion.hazlatarea.com (y cualquier host no listado,
 *     incluidas las llamadas internas a 127.0.0.1 y el chatbot).
 *   - ayuntamiento:  ayuntamientos.hazlatarea.com (y ayuntamientos.localhost
 *     en desarrollo).
 *
 * Este archivo no importa nada de Node ni de Prisma: lo usa el middleware
 * (Edge) y también el servidor. La regla de negocio es que una misma persona
 * no vea los dos lados: el desarrollador no ve el presupuesto del cliente y el
 * cliente no ve la nómina ni la utilidad del desarrollador.
 */
export type Lado = "desarrollador" | "ayuntamiento";

/** Encabezado con el que el middleware le dice al servidor en qué lado está. */
export const HEADER_LADO = "x-emps-lado";

export const LADOS: readonly Lado[] = ["desarrollador", "ayuntamiento"];

const HOSTS_AYUNTAMIENTO_POR_OMISION = "ayuntamientos.hazlatarea.com,ayuntamientos.localhost";

type Entorno = Record<string, string | undefined>;

export function esLado(valor: unknown): valor is Lado {
  return valor === "desarrollador" || valor === "ayuntamiento";
}

/** Hosts (sin puerto, en minúsculas) que muestran la cara de ayuntamientos. */
export function hostsAyuntamiento(env: Entorno = process.env): Set<string> {
  const crudo = (env.HOSTS_AYUNTAMIENTO ?? "").trim() || HOSTS_AYUNTAMIENTO_POR_OMISION;
  return new Set(
    crudo
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Lado cuando el host no está en la lista o no hay host (llamadas internas). */
export function ladoPorOmision(env: Entorno = process.env): Lado {
  return env.LADO_POR_OMISION === "ayuntamiento" ? "ayuntamiento" : "desarrollador";
}

/** Quita el puerto y los corchetes de IPv6: "ayuntamientos.localhost:3003" -> "ayuntamientos.localhost". */
export function hostSinPuerto(host: string | null | undefined): string {
  const h = (host ?? "").trim().toLowerCase();
  if (!h) return "";
  if (h.startsWith("[")) {
    const cierre = h.indexOf("]");
    return cierre > 0 ? h.slice(1, cierre) : h;
  }
  return h.split(":")[0];
}

export function ladoDesdeHost(host: string | null | undefined, env: Entorno = process.env): Lado {
  const h = hostSinPuerto(host);
  if (h && hostsAyuntamiento(env).has(h)) return "ayuntamiento";
  return ladoPorOmision(env);
}

/** El lado implica el rol del workspace; ya no se pregunta. */
export function rolDeLado(lado: Lado): "proveedor" | "operador_municipal" {
  return lado === "ayuntamiento" ? "operador_municipal" : "proveedor";
}

/**
 * Lado de un proyecto guardado. Los proyectos anteriores a la separación no
 * traen lado: se tratan como de ayuntamiento, que es lo que era el sistema.
 */
export function ladoDelProyecto(valor: string | null | undefined): Lado {
  return valor === "desarrollador" ? "desarrollador" : "ayuntamiento";
}
