import { cn } from "@/lib/utils";
import { pesos, pesosCompactos, type ModeloDeFlujo } from "@/lib/graficas";
import { COLORES_FLUJO } from "@/lib/colores-grafica";

/**
 * Flujo de efectivo mes a mes: por cada mes, lo que se cobra sube y lo que se
 * gasta baja desde la misma línea del cero, y una línea une el saldo acumulado.
 * El peor mes lleva fondo ámbar, un punto más grande y la frase escrita arriba.
 *
 * Son cajas y una línea de SVG sin librería. Todo el texto es HTML de 12 px o
 * más (un texto dentro de un SVG que se encoge se vuelve ilegible en celular).
 * La dirección (arriba cobros, abajo gastos) y los rótulos dicen lo mismo que
 * el color, así que se lee igual en blanco y negro. La tabla con las mismas
 * cifras queda plegada debajo, en cada pantalla que usa esta gráfica.
 */

const ANCHO_POR_MES = 26; // píxeles mínimos por mes; si no caben, la gráfica se desliza dentro de su caja
const ANCHO_EJE = 64;

export function GraficaFlujo({ modelo, frase, id = "flujo-de-efectivo" }: { modelo: ModeloDeFlujo; frase: string; id?: string }) {
  const { meses, marcas, minimo, maximo } = modelo;
  const n = meses.length;
  const rango = maximo - minimo || 1;
  // Posición vertical en porcentaje: 0 arriba, 100 abajo.
  const y = (v: number) => ((maximo - v) / rango) * 100;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const cero = y(0);
  const puntos = meses.map((m, i) => `${x(i)},${y(m.acumulado)}`).join(" ");
  const enLaMitadDerecha = (i: number) => i > (n - 1) / 2;
  const resumen = `Flujo de efectivo de ${n} ${n === 1 ? "mes" : "meses"}. ${frase}`;

  return (
    <figure aria-labelledby={id}>
      <figcaption
        id={id}
        className={cn("text-seccion text-tinta", modelo.peor && "border-l-4 pl-3")}
        style={modelo.peor ? { borderColor: COLORES_FLUJO.atencion } : undefined}
      >
        {frase}
      </figcaption>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-tinta">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORES_FLUJO.cobro }} />
          Cobros al cliente, hacia arriba
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORES_FLUJO.gasto }} />
          Gastos del proyecto, hacia abajo
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="flex items-center">
            <span className="h-0.5 w-5" style={{ backgroundColor: COLORES_FLUJO.saldo }} />
            <span className="-ml-3 h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: COLORES_FLUJO.saldo }} />
          </span>
          Saldo acumulado
        </li>
        {modelo.peor && (
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORES_FLUJO.atencion }} />
            El peor mes
          </li>
        )}
      </ul>

      <div className="mt-4 overflow-x-auto">
        <div style={{ minWidth: `${n * ANCHO_POR_MES + ANCHO_EJE}px` }}>
          <div className="flex">
            {/* Eje vertical: pesos */}
            <div className="relative h-56 shrink-0 sm:h-64" style={{ width: ANCHO_EJE }} aria-hidden>
              {marcas.map((m) => (
                <span
                  key={m}
                  className="absolute right-2 -translate-y-1/2 whitespace-nowrap text-xs tabular-nums text-tinta-suave"
                  style={{ top: `${y(m)}%` }}
                >
                  {pesosCompactos(m)}
                </span>
              ))}
            </div>

            {/* Área de la gráfica */}
            <div className="relative h-56 min-w-0 flex-1 sm:h-64" role="img" aria-label={resumen}>
              {marcas.map((m) => (
                <span
                  key={m}
                  className="absolute inset-x-0 h-px"
                  style={{ top: `${y(m)}%`, backgroundColor: m === 0 ? "rgba(11,31,58,0.5)" : "rgba(11,31,58,0.1)" }}
                />
              ))}

              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {meses.map((m) => (
                  <div
                    key={m.mes}
                    className="relative"
                    title={`Mes ${m.mes}: cobras ${pesos(m.cobro)}, gastas ${pesos(m.gasto)}, saldo acumulado ${pesos(m.acumulado)}`}
                  >
                    {m.esPeor && (
                      <span className="absolute inset-y-0 left-1/2 w-full max-w-[56px] -translate-x-1/2 rounded" style={{ backgroundColor: COLORES_FLUJO.atencionFondo }} />
                    )}
                    {m.cobro > 0 && (
                      <span
                        className="absolute left-1/2 w-[62%] max-w-[22px] -translate-x-1/2 rounded-t-[4px]"
                        style={{ top: `${y(m.cobro)}%`, height: `${cero - y(m.cobro)}%`, backgroundColor: COLORES_FLUJO.cobro }}
                      />
                    )}
                    {m.gasto > 0 && (
                      <span
                        className="absolute left-1/2 w-[62%] max-w-[22px] -translate-x-1/2 rounded-b-[4px]"
                        style={{ top: `${cero}%`, height: `${y(-m.gasto) - cero}%`, backgroundColor: COLORES_FLUJO.gasto }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <polyline
                  points={puntos}
                  fill="none"
                  stroke={COLORES_FLUJO.saldo}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {meses.map((m, i) => (
                <span
                  key={m.mes}
                  aria-hidden
                  className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white", m.esPeor ? "h-4 w-4" : "h-2.5 w-2.5")}
                  style={{ left: `${x(i)}%`, top: `${y(m.acumulado)}%`, backgroundColor: m.esPeor ? COLORES_FLUJO.atencion : COLORES_FLUJO.saldo }}
                />
              ))}

              {modelo.peor &&
                meses.map((m, i) =>
                  m.esPeor ? (
                    <span
                      key={`etiqueta-${m.mes}`}
                      aria-hidden
                      className={cn(
                        "absolute -translate-y-1/2 whitespace-nowrap rounded bg-white/90 px-1 text-xs font-semibold tabular-nums",
                        enLaMitadDerecha(i) ? "-translate-x-full -ml-3" : "ml-3",
                      )}
                      style={{ left: `${x(i)}%`, top: `${y(m.acumulado)}%`, color: COLORES_FLUJO.atencionTexto }}
                    >
                      {pesos(m.acumulado)}
                    </span>
                  ) : null,
                )}
            </div>
          </div>

          {/* Eje horizontal: meses */}
          <div className="flex" aria-hidden>
            <span className="shrink-0 pr-2 pt-1 text-right text-xs text-tinta-suave" style={{ width: ANCHO_EJE }}>
              Mes
            </span>
            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
              {meses.map((m) => (
                <span
                  key={m.mes}
                  className={cn("pt-1 text-center text-xs tabular-nums", m.esPeor ? "font-bold" : "text-tinta-suave")}
                  style={m.esPeor ? { color: COLORES_FLUJO.atencionTexto } : undefined}
                >
                  {m.mes}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
