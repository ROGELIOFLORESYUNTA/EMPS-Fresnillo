/**
 * Sección "Tu decisión y lo que pasó después".
 * Muestra la decisión activa (la foto de las cifras al decidir), el delta
 * contra hoy (la misma opción en la última versión) y la cronología de
 * modificaciones posteriores. Server component presentacional.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, History } from "lucide-react";
import { formatMXN, formatWeeks, DEVELOPMENT_MODES, SCENARIO_LABELS, RISK_LEVELS, labelOf } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";

export interface DecisionTimelineItem {
  date: Date;
  text: string;
}

export function DecisionSection({
  decision,
  currentTotal,
  latestVersion,
  timeline,
  supersededCount,
}: {
  decision: {
    mode: string;
    scenario: string;
    versionAtDecision: number;
    totalAtDecision: number;
    weeksAtDecision: number | null;
    riskLevelAtDecision: string | null;
    recommendedMode: string | null;
    recommendedScenario: string | null;
    followedRecommendation: boolean | null;
    decidedByName: string | null;
    note: string | null;
    createdAt: Date;
  };
  currentTotal: number | null;
  latestVersion: number;
  timeline: DecisionTimelineItem[];
  supersededCount: number;
}) {
  const modeLabels = Object.fromEntries(DEVELOPMENT_MODES.map((m) => [m.value, m.label]));
  const modeLabel = modeLabels[decision.mode] ?? decision.mode;
  const scenarioLabel = labelOf(SCENARIO_LABELS, decision.scenario);
  const riskLabel = decision.riskLevelAtDecision
    ? (RISK_LEVELS[decision.riskLevelAtDecision as keyof typeof RISK_LEVELS]?.label ?? decision.riskLevelAtDecision)
    : null;

  const delta = currentTotal !== null ? currentTotal - decision.totalAtDecision : null;
  const deltaPct = delta !== null && decision.totalAtDecision > 0 ? (delta / decision.totalAtDecision) * 100 : null;
  const deltaClass =
    delta === null || Math.abs(deltaPct ?? 0) <= 5
      ? "text-foreground"
      : delta > 0
        ? "text-amber-700"
        : "text-green-700";

  return (
    <Card className="border-green-300/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-green-700" />
          Tu decisión y lo que pasó después
          <InfoTip title="¿Qué es esto?">
            El día que elegiste una opción, el sistema guardó una foto de sus cifras. Aquí comparamos esa foto contra
            las cifras de hoy y te enlistamos lo que tocaste después, para que sepas exactamente qué cambió y cuánto.
          </InfoTip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* La decisión */}
        <div className="space-y-1.5">
          <p>
            El <strong>{decision.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</strong>
            {decision.decidedByName ? <>, <strong>{decision.decidedByName}</strong>,</> : null} se eligió:{" "}
            <strong>{modeLabel}</strong> · escenario <strong>{scenarioLabel}</strong> por{" "}
            <strong>{formatMXN(decision.totalAtDecision)}</strong>
            {decision.weeksAtDecision !== null && <> ({formatWeeks(decision.weeksAtDecision)}{riskLabel ? `, riesgo ${riskLabel.toLowerCase()}` : ""})</>}
            {" "}— versión {decision.versionAtDecision}.
          </p>
          {decision.followedRecommendation === true && (
            <Badge variant="success" className="text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Siguió la recomendación del sistema
            </Badge>
          )}
          {decision.followedRecommendation === false && decision.recommendedMode && (
            <Badge variant="outline" className="text-xs">
              El sistema recomendaba {modeLabels[decision.recommendedMode] ?? decision.recommendedMode} ·{" "}
              {labelOf(SCENARIO_LABELS, decision.recommendedScenario ?? "")}
            </Badge>
          )}
          {decision.note && <p className="text-xs text-muted-foreground italic">Nota: “{decision.note}”</p>}
        </div>

        {/* El delta contra hoy */}
        <div className="rounded-md bg-muted/40 p-3">
          {currentTotal === null ? (
            <p className="text-xs text-muted-foreground">
              La combinación elegida ya no aparece en la última versión. Recalcula el proyecto para comparar.
            </p>
          ) : delta === 0 ? (
            <p>Esa misma opción hoy cuesta lo mismo: no ha habido recálculos que la muevan.</p>
          ) : (
            <p className={deltaClass}>
              Esa misma opción hoy (versión {latestVersion}) cuesta <strong>{formatMXN(currentTotal)}</strong>:{" "}
              {delta! > 0 ? "subió" : "bajó"} <strong>{formatMXN(Math.abs(delta!))}</strong> ({Math.abs(deltaPct!).toFixed(1)}%)
              desde tu decisión.
            </p>
          )}
        </div>

        {/* Cronología de modificaciones posteriores */}
        <div>
          <p className="font-medium mb-1.5">Lo que se modificó después de decidir:</p>
          {timeline.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No se ha modificado nada desde la decisión. Las cifras siguen siendo las mismas.
            </p>
          ) : (
            <ul className="space-y-1">
              {timeline.map((item, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0 font-mono">
                    {item.date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-2">
          ¿Cambiaste de opinión? Elige otra opción arriba: la anterior queda guardada en el historial.
          {supersededCount > 0 && <> Decisiones anteriores: {supersededCount}.</>}
        </p>
      </CardContent>
    </Card>
  );
}
