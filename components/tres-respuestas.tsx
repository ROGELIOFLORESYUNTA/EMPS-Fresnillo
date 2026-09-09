import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatMXN, formatWeeks } from "@/lib/utils";
import type { OnTimeResult } from "@/lib/engine/reports-insights";

/**
 * Las cuatro respuestas que un patrón busca antes de cualquier tabla:
 * cuánto, cuándo, si le alcanza y qué eligió. Todo lo demás de la pantalla
 * explica estos cuatro renglones.
 */
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
  hrefReporte?: string;
}) {
  const meses = p.semanas != null ? p.semanas / 4.33 : null;
  const diferencia = p.presupuesto != null ? p.presupuesto - p.total : null;
  const fecha = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="pt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Te va a costar</p>
          <p className="text-xl xl:text-2xl font-bold break-words">{formatMXN(p.total)}</p>
          <p className="text-xs text-muted-foreground">con IVA · {p.modoLabel}, escenario {p.escenarioLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Va a tardar</p>
          <p className="text-xl xl:text-2xl font-bold break-words">{meses != null ? `${meses.toFixed(1)} meses` : "Sin dato"}</p>
          <p className="text-xs text-muted-foreground">
            {p.semanas != null ? formatWeeks(p.semanas) : ""}
            {p.onTime.level === "sin_fecha" && " · no registraste fecha límite"}
            {p.onTime.level === "holgado" && " · alcanza antes de tu fecha límite"}
            {p.onTime.level === "apretado" && " · apenas cabe en tu fecha límite, si no hay cambios"}
            {p.onTime.level === "alto_riesgo" && ` · se pasa de tu fecha límite${p.onTime.daysOverDeadline != null ? ` por ${Math.round(p.onTime.daysOverDeadline)} días` : ""}`}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">¿Te alcanza?</p>
          {diferencia == null ? (
            <>
              <p className="text-xl xl:text-2xl font-bold break-words text-muted-foreground">Sin presupuesto</p>
              <p className="text-xs text-muted-foreground">Registra cuánto dinero tienes y aquí te dice si cabe.</p>
            </>
          ) : diferencia >= 0 ? (
            <>
              <p className="text-xl xl:text-2xl font-bold break-words text-green-700">Sí cabe</p>
              <p className="text-xs text-muted-foreground">Te sobran {formatMXN(diferencia)} de los {formatMXN(p.presupuesto!)} que tienes.</p>
            </>
          ) : (
            <>
              <p className="text-xl xl:text-2xl font-bold break-words text-red-700">Se pasa</p>
              <p className="text-xs text-muted-foreground">Faltan {formatMXN(-diferencia)}; tienes {formatMXN(p.presupuesto!)}. Quita piezas o cambia la forma de hacerlo.</p>
            </>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{p.decision ? "Elegiste" : "Todavía no eliges"}</p>
          {p.decision ? (
            <>
              <p className="text-lg font-bold leading-tight">{p.decision.modoLabel}, {p.decision.escenarioLabel}</p>
              <p className="text-xs text-muted-foreground">el {fecha(p.decision.fecha)}{p.decision.por ? `, ${p.decision.por}` : ""}{p.esLaElegida ? "" : " · ahora estás viendo otra opción"}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold leading-tight">{p.esRecomendada ? "Esto es lo que recomendamos" : "Estás viendo otra opción"}</p>
              <p className="text-xs text-muted-foreground">Cuando decidas, usa &quot;Elegir esta opción&quot; y aquí queda registrado.</p>
            </>
          )}
          {p.hrefReporte && <Link href={p.hrefReporte} className="text-xs underline">Ver el reporte para llevar</Link>}
        </div>
      </CardContent>
    </Card>
  );
}
