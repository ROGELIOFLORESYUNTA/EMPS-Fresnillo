/**
 * POST /api/parameters/revalidate-change-cache
 *
 * v7: invalida la caché en memoria de los parámetros del motor de cambios.
 * Se llama desde el botón "Limpiar caché de parámetros de cambios" en /admin/parametros
 * cuando el operador acaba de modificar un valor CHANGE_* y quiere que tome efecto inmediato.
 *
 * Nota: Hoy loadChangeImpactParameters no usa cache porque Next 15 unstable_cache
 * tiene complicaciones con DB queries server-side y el latency local de SQLite
 * es de pocos ms. Endpoint queda implementado para futura adopción de cache.
 */
import { NextResponse } from "next/server";

export async function POST() {
  // Stub para futura activación de cache. Hoy no hay cache que invalidar.
  return NextResponse.json({
    ok: true,
    message: "Caché de parámetros invalidada. Las próximas solicitudes leen valores frescos de DB.",
    timestamp: new Date().toISOString(),
  });
}
