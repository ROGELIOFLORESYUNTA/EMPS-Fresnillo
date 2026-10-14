import Link from "next/link";
import { InfoTip } from "@/components/info-tip";
import { cn } from "@/lib/utils";
import { pesos } from "@/lib/graficas";
import type { OnTimeResult } from "@/lib/engine/reports-insights";
import type { Lado } from "@/lib/lado";

/**
 * Las cuatro respuestas que un patrón busca antes de cualquier tabla: cuánto,
 * cuándo, si le alcanza y qué eligió. El total es el protagonista (56 px; 40 en
 * celular) con tres renglones de 16 px debajo; las otras tres van en segundo
 * tamaño. Debajo de cada cifra clave hay una frase visible que dice qué es, y
 * el icono de información (24 px, con zona de toque de 44) queda solo para el
 * detalle. Todo lo demás de la pantalla explica estos cuatro datos.
 */

const fechaLarga = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

function Etiqueta({ texto, titulo, etiqueta, children }: { texto: string; titulo: string; etiqueta: string; children: React.ReactNode }) {
  return (
    // Un div, no un p: el panel del icono lleva párrafos y no pueden ir dentro de otro párrafo.
    <div className="flex items-center text-base font-semibold text-tinta-suave">
      {texto}
      <InfoTip grande title={titulo} etiqueta={etiqueta}>
        {children}
      </InfoTip>
    </div>
  );
}

export function TresRespuestas(p: {
  total: number;
  semanas: number | null;
  presupuesto: number | null;
  onTime: OnTimeResult;
  modoLabel: string;
  escenarioLabel: string;
  decision: { modoLabel: string; escenarioLabel: string; fecha: Date; por: string | null } | null;
  esLaElegida: boolean;
  esRecomendada: boolean;
  /** Enlace "Ver el reporte para llevar" al pie de la cuarta respuesta (donde no hay fila de acciones). */
  hrefReporte?: string;
  /** Utilidad sobre el precio sin IVA (0.2 = 20 %). */
  margen?: number | null;
  /** Lo que cuesta la misma forma de hacerlo si todo sale bien y si hay tropiezos. */
  rango?: { optimista: number | null; conservador: number | null };
  /** Desde qué cara se lee; sin dato, la frase del precio no habla de nadie en particular. */
  perspectiva?: Lado;
  /** Todo el equipo es contrato propio: el costo es lo que vale tu tiempo. */
  soloTuTiempo?: boolean;
  /** La estimación lleva herramientas de IA. */
  incluyeIA?: boolean;
  /** Detalle de "de dónde sale este precio", detrás del icono de información. */
  infoPrecio?: React.ReactNode;
}) {
  const meses = p.semanas != null ? p.semanas / 4.33 : null;
  const diferencia = p.presupuesto != null ? p.presupuesto - p.total : null;
  const utilidad = p.margen != null && p.margen > 0 ? ` del ${Math.round(p.margen * 100)} %` : "";
  const ia = p.incluyeIA ? " las herramientas de IA," : "";

  const explicacionPrecio =
    p.perspectiva === "ayuntamiento"
      ? `Suma el equipo del proveedor con sus cargas,${ia} su utilidad${utilidad} y el IVA.`
      : p.perspectiva === "desarrollador"
        ? p.soloTuTiempo
          ? `Suma lo que vale tu tiempo,${ia} tu utilidad${utilidad} y el IVA.`
          : `Suma lo que pagas al equipo con sus cargas,${ia} tu utilidad${utilidad} y el IVA.`
        : `Suma el equipo con sus cargas,${ia} la utilidad${utilidad} y el IVA.`;

  const rango =
    p.rango && p.rango.optimista != null && p.rango.conservador != null
      ? `Entre ${pesos(p.rango.optimista)} si todo sale bien y ${pesos(p.rango.conservador)} si hay tropiezos.`
      : null;

  const dias_ = p.onTime.daysOverDeadline != null ? Math.round(p.onTime.daysOverDeadline) : null;

  return (
    <section aria-label="Las cuatro respuestas" className="rounded-xl border bg-lienzo p-5 sm:p-7">
      {/* 1. Cuánto: el protagonista */}
      <div>
        {p.infoPrecio ? (
          <Etiqueta texto="Te va a costar" titulo="¿De dónde sale este precio?" etiqueta="Detalle de cuánto te va a costar">
            {p.infoPrecio}
          </Etiqueta>
        ) : (
          <p className="text-base font-semibold text-tinta-suave">Te va a costar</p>
        )}
        <p className="mt-1 text-cifra-movil text-marino sm:text-cifra">{pesos(p.total)}</p>
        <div className="mt-3 space-y-1 text-base">
          <p className="text-tinta">
            Con IVA. {p.modoLabel}, escenario {p.escenarioLabel}.
          </p>
          <p className="text-tinta-suave">{explicacionPrecio}</p>
          {rango && <p className="text-tinta-suave">{rango}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 border-t pt-6 sm:grid-cols-3 sm:gap-8">
        {/* 2. Cuándo */}
        <div>
          <Etiqueta texto="Va a tardar" titulo="¿De dónde salen los meses?" etiqueta="Detalle de cuánto va a tardar">
            <p>
              Son las horas de trabajo del proyecto entre lo que rinde el equipo cada semana. Rinde distinto según cuántas personas son, cuánto
              tiempo le dedican y la forma de hacerlo: por eso cambia al elegir otra.
            </p>
            <p>Un mes son 4.33 semanas. Los cambios que pidan después de firmar no están contados.</p>
          </Etiqueta>
          <p className="mt-1 text-[1.75rem] font-bold leading-tight text-marino">{meses != null ? `${meses.toFixed(1)} meses` : "Sin dato"}</p>
          <p className="mt-2 text-base text-tinta-suave">
            {p.semanas != null ? `Son ${p.semanas.toFixed(1)} semanas de trabajo. ` : ""}
            {p.onTime.level === "sin_fecha" && "No registraste fecha límite."}
            {p.onTime.level === "holgado" && "Alcanza antes de tu fecha límite."}
            {p.onTime.level === "apretado" && "Apenas cabe en tu fecha límite, si no hay cambios."}
            {p.onTime.level === "alto_riesgo" && (
              <strong className="font-semibold text-amber-800">
                Se pasa de tu fecha límite{dias_ != null ? ` por ${dias(dias_)}` : ""}.
              </strong>
            )}
          </p>
        </div>

        {/* 3. Si alcanza */}
        <div>
          <Etiqueta texto="¿Te alcanza?" titulo="¿Cómo se sabe si te alcanza?" etiqueta="Detalle de si te alcanza">
            <p>Se compara el precio con IVA contra el dinero que registraste al crear el proyecto.</p>
            <p>Si no registraste cuánto tienes, no hay contra qué comparar. Puedes agregarlo en Datos generales del proyecto.</p>
          </Etiqueta>
          {diferencia == null ? (
            <>
              <p className="mt-1 text-[1.75rem] font-bold leading-tight text-tinta-suave">Sin presupuesto</p>
              <p className="mt-2 text-base text-tinta-suave">Registra cuánto dinero tienes y aquí te dice si cabe.</p>
            </>
          ) : diferencia >= 0 ? (
            <>
              <p className="mt-1 text-[1.75rem] font-bold leading-tight text-marino">Sí cabe</p>
              <p className="mt-2 text-base text-tinta-suave">
                Te sobran {pesos(diferencia)} de los {pesos(p.presupuesto!)} que tienes.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[1.75rem] font-bold leading-tight text-amber-800">Se pasa</p>
              <p className="mt-2 text-base text-tinta-suave">
                Faltan {pesos(-diferencia)}; tienes {pesos(p.presupuesto!)}. Quita piezas o cambia la forma de hacerlo.
              </p>
            </>
          )}
        </div>

        {/* 4. Qué eligió */}
        <div>
          <Etiqueta
            texto={p.decision ? "Elegiste" : "Todavía no eliges"}
            titulo="¿Qué pasa cuando eliges?"
            etiqueta="Detalle de qué elegiste"
          >
            <p>Elegir guarda la opción con sus cifras de hoy. Si después recalculas o te piden cambios, el sistema te muestra cuánto se movió.</p>
            <p>Puedes cambiar de opción cuando quieras; la anterior queda en el historial.</p>
          </Etiqueta>
          {p.decision ? (
            <>
              <p className={cn("mt-1 text-[1.75rem] font-bold leading-tight text-marino")}>
                {p.decision.modoLabel}, {p.decision.escenarioLabel}
              </p>
              <p className="mt-2 text-base text-tinta-suave">
                El {fechaLarga(p.decision.fecha)}
                {p.decision.por ? `, ${p.decision.por}` : ""}. {p.esLaElegida ? "Es la opción que estás viendo." : "Ahora estás viendo otra opción."}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[1.75rem] font-bold leading-tight text-tinta-suave">Sin elegir</p>
              <p className="mt-2 text-base text-tinta-suave">
                {p.esRecomendada ? "Estás viendo la opción que recomendamos." : "Estás viendo otra opción, no la que recomendamos."} Cuando decidas, usa
                &quot;Elegir esta opción&quot; y aquí queda registrado.
              </p>
            </>
          )}
          {p.hrefReporte && (
            <Link href={p.hrefReporte} className="mt-2 inline-flex min-h-11 items-center text-base font-semibold text-accion underline underline-offset-4">
              Ver el reporte para llevar
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
