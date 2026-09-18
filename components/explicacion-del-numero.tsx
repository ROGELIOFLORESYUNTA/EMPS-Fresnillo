import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMXN, formatHours } from "@/lib/utils";
import type { PasoDeCalculo } from "@/lib/engine/explicacion";

function valorLegible(p: PasoDeCalculo) {
  switch (p.unidad) {
    case "pesos": return formatMXN(p.valor);
    case "horas": return formatHours(p.valor);
    case "puntos": return `${p.valor.toLocaleString("es-MX", { maximumFractionDigits: 1 })} puntos`;
    case "factor": return `× ${p.valor.toLocaleString("es-MX", { maximumFractionDigits: 4 })}`;
    case "porcentaje": return `${(p.valor * 100).toLocaleString("es-MX", { maximumFractionDigits: 1 })} %`;
    case "semanas": return `${p.valor.toLocaleString("es-MX", { maximumFractionDigits: 1 })} semanas`;
    case "meses": return `${p.valor.toLocaleString("es-MX", { maximumFractionDigits: 3 })} meses`;
  }
}

/**
 * "De dónde sale este número": la cadena de cálculo renglón por renglón, con
 * la operación en palabras y el resultado. Se recalcula con la opción que el
 * usuario tenga seleccionada, así que al cambiar de forma de hacerlo o de
 * escenario se ve moverse cada paso.
 */
export function ExplicacionDelNumero(p: { pasos: PasoDeCalculo[]; modoLabel: string; escenarioLabel: string }) {
  if (p.pasos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">De dónde sale este número</CardTitle>
          <CardDescription>Esta estimación se guardó antes de que el sistema registrara la cadena de cálculo. Vuelve a correr la estimación para verla paso por paso.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const total = p.pasos[p.pasos.length - 1];
  return (
    <Card>
      <details open>
        <summary className="cursor-pointer list-none">
          <CardHeader>
            <CardTitle className="text-base">De dónde sale este número: {valorLegible(total)}</CardTitle>
            <CardDescription>
              {p.modoLabel}, escenario {p.escenarioLabel}. Cada renglón sale del anterior; puedes rehacer la cuenta con calculadora. Cambia la forma de hacerlo o el escenario arriba y la cadena se vuelve a calcular.
            </CardDescription>
          </CardHeader>
        </summary>
        <CardContent>
          <ol className="divide-y text-sm">
            {p.pasos.map((paso, i) => (
              <li key={paso.clave} className="py-2 grid gap-1 sm:grid-cols-[1.5rem_1fr_auto] sm:items-baseline">
                <span className="text-xs text-muted-foreground font-mono">{i + 1}.</span>
                <div>
                  <p className="font-medium">{paso.etiqueta}</p>
                  {paso.operacion && <p className="text-xs text-muted-foreground font-mono">{paso.operacion}</p>}
                  {paso.nota && <p className="text-xs text-amber-800">{paso.nota}</p>}
                </div>
                <span className={`font-mono text-right ${paso.clave === "total" ? "font-bold text-base" : ""}`}>{valorLegible(paso)}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </details>
    </Card>
  );
}
