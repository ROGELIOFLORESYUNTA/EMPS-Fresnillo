import Link from "next/link";
import { cn } from "@/lib/utils";
import { mesesEnTexto, pesos, pesosCompactos, type DatosDeFormas, type FilaDeForma } from "@/lib/graficas";
import { COLORES_FORMAS } from "@/lib/colores-grafica";
import { ESCENARIOS_LLANOS } from "@/lib/formas";

/**
 * Las cinco formas de hacerlo, una barra por forma sobre la misma escala de
 * pesos. La banda clara va de lo optimista a lo conservador y la marca oscura
 * es el escenario que se está viendo; a la derecha, el monto y los meses.
 *
 * Es la única comparación que decide el precio, así que se dibuja: las formas
 * descartadas para este proyecto salen en gris con su razón en una línea, la
 * elegida lleva borde y tocar una forma cambia las cifras de arriba (la
 * dirección ya guarda ?mode= y ?scenario=). Pura estructura de cajas, sin
 * librería de gráficas ni JavaScript en el navegador.
 */

// Tres columnas en pantalla ancha: nombre, carril y cifras. En celular, el
// nombre y las cifras van arriba y el carril abajo, a todo el ancho.
const REJILLA =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 sm:grid-cols-[11rem_minmax(0,1fr)_9.5rem] sm:items-center sm:gap-x-4";

/** "Hay piezas críticas" -> "hay piezas críticas" (va después de dos puntos); las siglas y los números se quedan. */
const minusculaInicial = (t: string) => (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);

function Carril({ fila, datos }: { fila: FilaDeForma; datos: DatosDeFormas }) {
  const silenciada = fila.veredicto === "no_recomendable";
  const p = fila.posicion;
  const ancho = p ? Math.max(p.hasta - p.desde, 1.2) : 0;
  const detalle =
    fila.optimista != null && fila.conservador != null
      ? `De ${pesos(fila.optimista)} si todo sale bien a ${pesos(fila.conservador)} si hay tropiezos${
          fila.probable != null ? `; lo más seguro, ${pesos(fila.probable)}` : ""
        }`
      : "Todavía no se calcula";
  return (
    <div className="relative h-6" aria-hidden title={detalle}>
      <div className="absolute inset-x-0 inset-y-1 rounded" style={{ backgroundColor: COLORES_FORMAS.carril }} />
      <div className="absolute inset-y-0 inset-x-[7px]">
        {datos.marcas.map((m) => (
          <span key={m} className="absolute inset-y-1 w-px bg-tinta/10" style={{ left: `${(m / datos.tope) * 100}%` }} />
        ))}
        {p && (
          <>
            <span
              className="absolute inset-y-1.5 rounded-sm"
              style={{
                left: `${p.desde}%`,
                width: `${ancho}%`,
                backgroundColor: silenciada ? COLORES_FORMAS.bandaSilenciada : COLORES_FORMAS.banda,
              }}
            />
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
              style={{ left: `${p.marca}%`, backgroundColor: silenciada ? COLORES_FORMAS.marcaSilenciada : COLORES_FORMAS.marca }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function GraficaFormas({
  datos,
  titular,
  ayuda,
  escenario,
  hrefBase,
  id = "las-cinco-formas",
}: {
  datos: DatosDeFormas;
  titular: string;
  ayuda: string;
  /** Escenario que se está viendo: optimistic, probable o conservative. */
  escenario: string;
  /** Ruta de la pantalla, sin parámetros: /projects/<id>. */
  hrefBase: string;
  id?: string;
}) {
  const modoVisto = datos.filas.find((f) => f.seleccionada)?.mode ?? "hybrid";
  return (
    <section aria-labelledby={id} className="rounded-xl border bg-lienzo p-5 sm:p-7">
      <h2 id={id} className="text-seccion text-tinta">
        {titular}
      </h2>
      <p className="mt-1 text-base text-tinta-suave">{ayuda}</p>

      <nav aria-label="Escenario" className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-papel p-1 sm:inline-grid">
        {ESCENARIOS_LLANOS.map((e) => {
          const activo = e.value === escenario;
          return (
            <Link
              key={e.value}
              href={`${hrefBase}?mode=${modoVisto}&scenario=${e.value}`}
              scroll={false}
              aria-current={activo ? "true" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center rounded-md border px-2 text-center leading-tight sm:px-5",
                activo ? "border-marino bg-lienzo text-marino" : "border-transparent text-tinta-suave hover:text-tinta",
              )}
            >
              <span className="text-sm font-semibold">{e.nombre}</span>
              <span className="text-xs">{e.frase}</span>
            </Link>
          );
        })}
      </nav>

      {/* Escala común: las mismas marcas para las cinco formas */}
      <div className={cn(REJILLA, "mt-5 px-3 sm:px-4")} aria-hidden>
        <div className="col-span-2 sm:col-span-1 sm:col-start-2">
          <div className="relative mx-[7px] h-4">
            {datos.marcas.map((m) => (
              <span
                key={m}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-xs text-tinta-suave"
                style={{ left: `${(m / datos.tope) * 100}%` }}
              >
                {pesosCompactos(m)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-1 space-y-1">
        {datos.filas.map((f) => {
          const silenciada = f.veredicto === "no_recomendable";
          return (
            <li
              key={f.mode}
              className={cn("relative rounded-lg border-2 px-3 py-3 sm:px-4", f.seleccionada ? "border-accion" : "border-transparent hover:bg-papel")}
            >
              <div className={REJILLA}>
                <div className="col-start-1 row-start-1 min-w-0">
                  <Link
                    href={`${hrefBase}?mode=${f.mode}&scenario=${escenario}`}
                    scroll={false}
                    title={f.tecnico}
                    aria-current={f.seleccionada ? "true" : undefined}
                    className={cn(
                      "text-base font-semibold after:absolute after:inset-0 after:content-[''] after:rounded-lg",
                      silenciada ? "text-tinta-suave" : "text-tinta",
                    )}
                  >
                    {f.nombre}
                  </Link>
                  {f.recomendada && <span className="block text-xs font-semibold text-marino">Recomendada</span>}
                </div>
                <div className="col-start-2 row-start-1 text-right sm:col-start-3">
                  {f.elegido != null ? (
                    <>
                      <p className={cn("text-base font-semibold leading-tight tabular-nums", silenciada ? "text-tinta-suave" : "text-tinta")}>
                        {pesos(f.elegido)}
                      </p>
                      {f.meses != null && <p className="text-sm leading-tight text-tinta-suave">{mesesEnTexto(f.meses)}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-tinta-suave">Sin calcular</p>
                  )}
                </div>
                <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                  <Carril fila={f} datos={datos} />
                </div>
              </div>
              {f.razon && (
                <p className="mt-1 text-sm text-tinta-suave">
                  {silenciada ? (
                    <strong className="font-semibold text-amber-800">No se recomienda: </strong>
                  ) : (
                    <strong className="font-semibold">Con reservas: </strong>
                  )}
                  {minusculaInicial(f.razon)}.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-tinta-suave">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-8 rounded-sm" style={{ backgroundColor: COLORES_FORMAS.banda }} />
          De si todo sale bien a si hay tropiezos
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: COLORES_FORMAS.marca }} />
          El escenario que ves
        </span>
      </p>
    </section>
  );
}
