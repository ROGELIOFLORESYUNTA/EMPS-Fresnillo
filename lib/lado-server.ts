/**
 * Lectura del lado desde componentes y rutas del servidor.
 *
 * El middleware calcula el lado por el host y lo deja en el encabezado
 * HEADER_LADO. Si por alguna razón no viene (llamada directa al servidor
 * standalone sin pasar por el middleware), se vuelve a calcular del host.
 */
import { headers } from "next/headers";
import { HEADER_LADO, esLado, ladoDesdeHost, type Lado } from "@/lib/lado";

export async function getLado(): Promise<Lado> {
  const h = await headers();
  const marcado = h.get(HEADER_LADO);
  if (esLado(marcado)) return marcado;
  return ladoDesdeHost(h.get("host"));
}
