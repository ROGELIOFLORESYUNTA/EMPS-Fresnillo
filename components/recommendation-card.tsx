/**
 * Tarjeta "¿Cuál opción te conviene?" — presenta la recomendación del motor
 * (lib/engine/recommendation.ts) con sus razones y advertencias en lenguaje
 * llano. Server component presentacional: recibe todo por props.
 */
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertTriangle, Eye } from "lucide-react";
import { formatMXN, DEVELOPMENT_MODES, SCENARIO_LABELS, labelOf } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import { ElegirOpcionButton } from "@/components/elegir-opcion-button";
import type { RecommendationResult } from "@/lib/engine/recommendation";

export function RecommendationCard({
  projectId,
  recommendation,
  selectedMode,
  selectedScenario,
}: {
  projectId: string;
  recommendation: RecommendationResult;
  selectedMode: string;
  selectedScenario: string;
}) {
  const r = recommendation;
  const modeLabels = Object.fromEntries(DEVELOPMENT_MODES.map((m) => [m.value, m.label]));
  const modeLabel = modeLabels[r.best.mode] ?? r.best.mode;
  const scenarioLabel = labelOf(SCENARIO_LABELS, r.best.scenario);
  const isViewing = r.best.mode === selectedMode && r.best.scenario === selectedScenario;

  const headline =
    r.roleUsed === "operador_municipal"
      ? "Como personal del Ayuntamiento, te conviene presupuestar con:"
      : r.roleUsed === "proveedor"
        ? "Como proveedor, te conviene cotizar con:"
        : "Comparando precio, riesgo y tiempo, la opción más equilibrada es:";

  return (
    <Card className="border-primary/40 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          ¿Cuál opción te conviene?
          <InfoTip title="¿Cómo se elige?">
            El sistema compara las opciones ya calculadas de este proyecto con reglas fijas (no adivina): descarta las de
            riesgo crítico y pondera precio, riesgo y tiempo según quién eres. Abajo están las razones con las cifras
            reales. La decisión final siempre es tuya.
          </InfoTip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{headline}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-bold">{modeLabel}</span>
          <Badge variant="secondary">escenario {scenarioLabel}</Badge>
          <span className="text-xl font-bold text-primary">{formatMXN(r.bestOption.total)}</span>
          {isViewing && <Badge variant="success">Estás viendo esta opción</Badge>}
        </div>

        <ul className="space-y-1.5 text-sm">
          {r.reasons.map((reason, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary shrink-0">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>

        {r.warnings.length > 0 && (
          <div className="border-l-4 border-amber-400 bg-amber-50/60 rounded-md p-3 space-y-1">
            {r.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-950 flex gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}

        {r.runnerUp && (
          <p className="text-xs text-muted-foreground">
            Segunda opción: <strong>{modeLabels[r.runnerUp.mode] ?? r.runnerUp.mode}</strong> ·{" "}
            {labelOf(SCENARIO_LABELS, r.runnerUp.scenario)}. {r.runnerUp.why}
          </p>
        )}

        {r.roleUsed === "neutral" && (
          <p className="text-xs text-muted-foreground">
            ¿Trabajas en un Ayuntamiento o eres proveedor?{" "}
            <Link href="/mi-cuenta" className="text-primary underline hover:no-underline">
              Dinos en Mi cuenta
            </Link>{" "}
            y la recomendación se ajusta a tu caso.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!isViewing && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/projects/${projectId}?mode=${r.best.mode}&scenario=${r.best.scenario}`}>
                <Eye className="w-4 h-4 mr-1.5" />
                Ver esta opción
              </Link>
            </Button>
          )}
          <ElegirOpcionButton
            projectId={projectId}
            mode={r.best.mode}
            scenario={r.best.scenario}
            modeLabel={modeLabel}
            scenarioLabel={scenarioLabel}
            recommendedMode={r.best.mode}
            recommendedScenario={r.best.scenario}
            variant="recomendada"
          />
        </div>
      </CardContent>
    </Card>
  );
}
