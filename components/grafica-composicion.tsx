import Link from "next/link";
import { cn } from "@/lib/utils";
import { pesos, type SegmentoDeComposicion } from "@/lib/graficas";
import { RAMPA_COMPOSICION } from "@/lib/colores-grafica";

/**
 * De qué se compone el precio: una sola barra horizontal que suma el total,
 * con un pedazo por cada parte (equipo con cargas, herramientas de IA, otros
 * gastos, utilidad e IVA). Sin librería: son cajas con ancho proporcional.
 *
 * Cada pedazo lleva su nombre y su monto escritos dentro cuando el texto cabe;
 * cuando no cabe, el rótulo va debajo de la barra con el mismo color como
 * muestra. El título dice la conclusión, no el tema. El "cabe" se decide con
 * tres anchos de referencia (celular, tableta y pantalla ancha), para que el
 * texto nunca se corte ni se encime sin necesitar JavaScript.
 */

// Ancho mínimo de la barra en cada tamaño de pantalla, en píxeles: celular
// (menos de 640), tableta (640 a 1023) y pantalla ancha (1024 en adelante).
const ANCHO_BARRA = { base: 280, sm: 520, lg: 880 } as const;

/** Píxeles que necesita un pedazo para escribir su nombre (en renglones) y su monto: 12 px el nombre, 14 px el monto. */
function anchoNecesario(nombre: string, monto: string): number {
  const palabraLarga = Math.max(...nombre.split(" ").map((p) => p.length));
  return Math.max(monto.length * 8.3, palabraLarga * 6.8) + 16;
}

export function GraficaComposicion({
  segmentos,
  total,
  titular,
  id = "composicion-del-precio",
}: {
  segmentos: SegmentoDeComposicion[];
  total: number;
  titular: string;
  id?: string;
}) {
  const filas = segmentos.map((s) => {
    const monto = pesos(s.monto);
    const necesario = anchoNecesario(s.nombre, monto);
    const porcentaje = s.fraccion * 100;
    return {
      ...s,
      montoTexto: monto,
      porcentaje,
      color: RAMPA_COMPOSICION[s.clave],
      dentro: {
        base: s.fraccion * ANCHO_BARRA.base >= necesario,
        sm: s.fraccion * ANCHO_BARRA.sm >= necesario,
        lg: s.fraccion * ANCHO_BARRA.lg >= necesario,
      },
      titulo: `${s.nombre}: ${monto} (${porcentaje < 1 ? "menos del 1" : Math.round(porcentaje)} % del precio)`,
    };
  });

  return (
    <section aria-labelledby={id} className="rounded-xl border bg-lienzo p-5 sm:p-7">
      <h2 id={id} className="text-seccion text-tinta">
        {titular}
      </h2>

      <div role="group" aria-label="Las partes del precio" className="mt-5 flex min-h-14 items-stretch gap-0.5">
        {filas.map((s) => (
          <div
            key={s.clave}
            title={s.titulo}
            className="flex min-w-0 first:rounded-l-md last:rounded-r-md"
            style={{ flex: `${s.monto} 1 0px`, backgroundColor: s.color.fondo, color: s.color.texto }}
          >
            <div
              className={cn(
                "flex-1 flex-col justify-center px-2 py-1.5 leading-tight",
                s.dentro.base ? "flex" : "hidden",
                s.dentro.sm ? "sm:flex" : "sm:hidden",
                s.dentro.lg ? "lg:flex" : "lg:hidden",
              )}
            >
              <span className="text-xs font-medium">{s.nombre}</span>
              <span className="text-sm font-semibold tabular-nums">{s.montoTexto}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Los pedazos donde el texto no cabe llevan su rótulo aquí, con su color de muestra. */}
      <ul className="flex flex-wrap gap-x-6">
        {filas.map((s) => (
          <li
            key={s.clave}
            className={cn(
              "mt-3 items-center gap-2 text-sm text-tinta",
              s.dentro.base ? "hidden" : "flex",
              s.dentro.sm ? "sm:hidden" : "sm:flex",
              s.dentro.lg ? "lg:hidden" : "lg:flex",
            )}
          >
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color.fondo }} />
            <span>{s.nombre}</span>
            <strong className="font-semibold tabular-nums">{s.montoTexto}</strong>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-tinta-suave">
        Las partes suman {pesos(total)} con IVA. Los impuestos y las cuotas salen de fuentes oficiales.{" "}
        <Link href="/fuentes" className="font-medium text-accion underline underline-offset-4">
          Ver de dónde salen
        </Link>
      </p>
    </section>
  );
}
