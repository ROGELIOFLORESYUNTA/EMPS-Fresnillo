import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatMXN, RISK_LEVELS } from "@/lib/utils";

export interface TarjetaDeOpcion {
  titulo: string;
  modoLabel: string;
  escenarioLabel: string;
  total: number | null;
  semanas: number | null;
  riskLevel: string | null;
  veredicto: string | null;
  porque: string;
  href: string;
  activa: boolean;
}

/**
 * De 15 renglones a tres tarjetas: la recomendada, la que elegiste y la más
 * segura. La tabla completa sigue disponible debajo, plegada.
 */
export function TarjetasDeOpcion({ tarjetas }: { tarjetas: TarjetaDeOpcion[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {tarjetas.map((t) => (
        <Link
          key={t.titulo}
          href={t.href}
          className={`block rounded-md border p-4 space-y-1 transition-colors hover:bg-accent ${t.activa ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{t.titulo}</p>
          {t.total != null ? (
            <>
              <p className="text-xl font-bold">{formatMXN(t.total)}</p>
              <p className="text-sm">
                {t.modoLabel}, {t.escenarioLabel}
                {t.semanas != null && ` · ${(t.semanas / 4.33).toFixed(1)} meses`}
              </p>
              <div className="flex flex-wrap gap-1">
                {t.riskLevel && (
                  <Badge className={RISK_LEVELS[t.riskLevel as keyof typeof RISK_LEVELS]?.bg}>
                    Riesgo {RISK_LEVELS[t.riskLevel as keyof typeof RISK_LEVELS]?.label ?? t.riskLevel}
                  </Badge>
                )}
                {t.veredicto && <Badge variant="outline">{t.veredicto}</Badge>}
              </div>
            </>
          ) : (
            <p className="text-xl font-bold text-muted-foreground">Sin elegir</p>
          )}
          <p className="text-xs text-muted-foreground">{t.porque}</p>
        </Link>
      ))}
    </div>
  );
}

/** La nota de Rogelio: por qué la forma de hacerlo pesa más que el precio. */
export function PorQueImportaLaForma() {
  return (
    <div className="rounded-md border-l-4 border-primary/60 bg-muted/40 p-3 text-sm space-y-1">
      <p className="font-medium">Por qué la forma de hacerlo importa tanto</p>
      <p className="text-muted-foreground">
        Ya casi nadie programa todo a mano: hoy se combina trabajo de personas con inteligencia artificial y con plataformas de armado, y cada combinación cuesta y tarda distinto para el mismo sistema.
        Un desarrollador puede saber programar muy bien y no saber lo que cuesta una nómina, los impuestos que se pagan sobre ella ni cuántos meses puede aguantar sin cobrar. Por eso muchos proyectos se cotizan barato, se quedan sin dinero a la mitad y no se terminan.
        Este sistema pone las cinco formas de hacerlo lado a lado, dice cuáles sirven para este proyecto y saca el precio con la nómina y los impuestos reales, para que la decisión se tome con el número completo.
      </p>
      <p className="text-xs">
        <Link href="/metodologia" className="underline">Cómo se calcula</Link> · <Link href="/fuentes" className="underline">De dónde salen los parámetros</Link>
      </p>
    </div>
  );
}
