import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMXN, formatWeeks } from "@/lib/utils";
import type { OnTimeResult, QuebrarRiskResult, ViabilityResult, MaintenanceResult, ChangeRangeRow } from "@/lib/engine/reports-insights";

/**
 * Las preguntas que el reporte municipal ya contestaba y la pantalla no:
 * ¿va a terminar a tiempo?, ¿el proveedor va a aguantar?, cuánto cuesta
 * mantenerlo, cuánto cuesta cada cambio y qué NO está incluido. Mismas
 * funciones de lib/engine/reports-insights, mismo veredicto que el reporte.
 */
export function PreguntasDelPatron(p: {
  onTime: OnTimeResult;
  capitalRequerido: number;
  quebrar: QuebrarRiskResult;
  viabilidad: ViabilityResult;
  mantenimiento: MaintenanceResult;
  rangosCambio: ChangeRangeRow[];
  esProveedor: boolean;
  /** Plataforma de armado: licencias por usuario final que siguen después de entregar. */
  licenciasUsuarioFinal?: { usuarios: number; usdPorUsuario: number; mensualMXN: number; supuestos: boolean } | null;
  /** Con IA los cambios chicos llevan menos horas: factor ya aplicado a los rangos y forma de hacerlo. */
  ajusteHorasCambios?: { factor: number; modoLabel: string } | null;
}) {
  const meses = p.onTime.weeksNeeded / 4.33;
  return (
    <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
      <Card>
        <CardHeader><CardTitle className="text-base">¿Va a terminar a tiempo?</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>Se necesitan <strong>{formatWeeks(p.onTime.weeksNeeded)}</strong> (unos {meses.toFixed(1)} meses).</p>
          {p.onTime.level === "sin_fecha" && <p className="text-muted-foreground">No registraste fecha límite. Agrégala (por ejemplo, el cierre de la administración) y aquí te avisa si el plazo aprieta.</p>}
          {p.onTime.level === "holgado" && p.onTime.weeksAvailable !== null && <p className="text-green-700">Sobra tiempo: la fecha límite da {formatWeeks(p.onTime.weeksAvailable)}.</p>}
          {p.onTime.level === "apretado" && p.onTime.weeksAvailable !== null && <p className="text-amber-700">La fecha límite da {formatWeeks(p.onTime.weeksAvailable)}. Cabe, pero solo si no hay cambios.</p>}
          {p.onTime.level === "alto_riesgo" && <p className="text-red-700"><strong>No cabe en la fecha.</strong> {p.onTime.weeksAvailable !== null ? `Hay ${formatWeeks(p.onTime.weeksAvailable)} y se necesitan ${formatWeeks(p.onTime.weeksNeeded)}.` : ""} Recorta piezas o mueve la fecha antes de firmar.</p>}
        </CardContent>
      </Card>

      <Card className={p.quebrar.level === "alto" ? "border-red-300" : p.quebrar.level === "medio" ? "border-amber-300" : ""}>
        <CardHeader><CardTitle className="text-base">{p.esProveedor ? "¿Te sale, o vas a poner de tu bolsa?" : "¿El proveedor va a aguantar?"}</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {p.capitalRequerido > 0 ? (
            <>
              <p>{p.esProveedor ? "Vas a poner" : "El proveedor va a poner"} <strong>{formatMXN(p.capitalRequerido)}</strong> de su bolsa ({(p.quebrar.ratio * 100).toFixed(0)} % del precio) antes de cobrar todo.</p>
              {p.esProveedor ? (
                <>
                  {p.viabilidad.level === "comodo" && <p className="text-green-700">Cómodo: la utilidad cubre de sobra lo que adelantas.</p>}
                  {p.viabilidad.level === "apretado" && <p className="text-amber-700">Apretado: adelantas casi toda tu utilidad. Pide un anticipo mayor.</p>}
                  {p.viabilidad.level === "rojo" && <p className="text-red-700"><strong>En rojo:</strong> adelantas más de lo que vas a ganar. No firmes sin cambiar la forma de pago.</p>}
                </>
              ) : (
                <>
                  {p.quebrar.level === "bajo" && <p className="text-green-700">Riesgo bajo. Pídele que demuestre que tiene ese dinero.</p>}
                  {p.quebrar.level === "medio" && <p className="text-amber-700">Riesgo medio. Si no lo tiene, va a pedir más anticipo o va a entregar tarde.</p>}
                  {p.quebrar.level === "alto" && <p className="text-red-700"><strong>Riesgo alto de que se quede sin dinero a media obra.</strong> Negocia más anticipo o pagos por entrega antes de firmar.</p>}
                </>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Todavía no hay flujo de efectivo calculado para esta opción.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Después de entregarlo, ¿cuánto cuesta mantenerlo?</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>Unos <strong>{formatMXN(p.mantenimiento.monthlyAmount)}</strong> al mes ({formatMXN(p.mantenimiento.annualAmount)} al año), calculado como {(p.mantenimiento.pctOfTotal * 100).toFixed(0)} % del precio.</p>
          <p className="text-muted-foreground">Es una referencia para negociarlo en el contrato; no está incluido en el precio de arriba.</p>
          {p.licenciasUsuarioFinal && (
            <p className="text-amber-800">
              Además, por ser una plataforma de armado: <strong>{formatMXN(p.licenciasUsuarioFinal.mensualMXN)} al mes</strong> en licencias ({p.licenciasUsuarioFinal.usuarios} usuario(s) × {p.licenciasUsuarioFinal.usdPorUsuario} USD
              {p.licenciasUsuarioFinal.supuestos ? ", usuarios supuestos; captura cuántos son en Datos generales" : ""}) mientras el sistema se use. Tampoco está en el precio.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Qué NO está incluido</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
            <li>Nómina oficial timbrada ni declaraciones ante el SAT</li>
            <li>Conexión directa con SAT, IMSS o bancos, y firma electrónica</li>
            <li>Gestión completa de contratos públicos</li>
            <li>Asesoría contable, fiscal o legal (esto es una estimación, no un dictamen)</li>
            <li>Mantenimiento después de la entrega (ver tarjeta de al lado)</li>
          </ul>
        </CardContent>
      </Card>

      {p.rangosCambio.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Si pides cambios, esto cuesta aparte</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-muted-foreground">Pedir &quot;una modificación pequeña&quot; sin cotizarla es la causa principal de que un proyecto se abandone a la mitad. Que el procedimiento de cambios quede escrito en el contrato, con estos rangos.</p>
            {p.ajusteHorasCambios && p.ajusteHorasCambios.factor < 0.999 && (
              <p className="text-green-800">
                Con {p.ajusteHorasCambios.modoLabel} y la pericia de este equipo, cada cambio lleva {Math.round((1 - p.ajusteHorasCambios.factor) * 100)} % menos horas que a mano: el detalle que antes esperaba un ticket hoy se resuelve en la misma sesión. Es la misma regla que usa la calculadora de cambios del proyecto y los rangos ya la descuentan.
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de cambio</TableHead>
                  <TableHead>Qué es</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Cuesta entre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.rangosCambio.map((r) => (
                  <TableRow key={r.type}>
                    <TableCell className="font-medium">{r.etiqueta}</TableCell>
                    <TableCell className="text-muted-foreground">{r.description}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.minHours.toLocaleString("es-MX", { maximumFractionDigits: 1 })} a {r.maxHours.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-mono">{r.maxCost > 0 ? `${formatMXN(r.minCost)} y ${formatMXN(r.maxCost)}` : "Sin cobro"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
