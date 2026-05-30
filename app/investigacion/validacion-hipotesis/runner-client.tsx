"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, AlertTriangle, CheckCircle2, XCircle, HelpCircle, FlaskConical } from "lucide-react";
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

interface AnalysisResult {
  generatedAt: string;
  n: number;
  descriptive: {
    mapeHours: { n: number; mean: number; median: number; stddev: number; min: number; max: number; q25: number; q75: number };
    mapeCost: { mean: number; median: number; stddev: number };
    accuracyRate: number;
  };
  correlation: Array<{ feature: string; vsMape: number; pValueApprox: number; interpretation: string }>;
  regression: {
    rSquared: number;
    rmse: number;
    intercept: number;
    coefficients: Array<{ feature: string; coef: number; pValueApprox: number; interpretation: string }>;
  } | null;
  classification: {
    accuracy: number;
    trainSize: number;
    testSize: number;
    featureImportance: Array<{ feature: string; importance: number }>;
  } | null;
  neuralNet: {
    mapeOfPredictionVsActual: number;
    finalLoss: number;
    epochs: number;
    scatterData: Array<{ predicted: number; actual: number }>;
    overfittingWarning: string;
  } | null;
  hypothesis: {
    verdict: "cumplida" | "parcialmente_cumplida" | "no_cumplida" | "datos_insuficientes";
    reason: string;
    n: number;
    rSquared: number | null;
    significantPredictors: number;
    minSampleRequired: number;
  };
}

export function ValidacionRunner() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeSynthetic, setIncludeSynthetic] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/research/analysis/run?includeSynthetic=${includeSynthetic}`, {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "Error al ejecutar análisis.");
      } else {
        setResult(d);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ejecutar análisis</CardTitle>
          <CardDescription>
            Lee los proyectos cerrados con resultado real capturado, calcula MAPE por proyecto y corre todos los
            modelos. Resultados en pantalla en ~3 segundos. Cero datos enviados a servicios externos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeSynthetic}
              onChange={(e) => setIncludeSynthetic(e.target.checked)}
            />
            Incluir casos sintéticos de desarrollo (sourceKind=simulated_dev_only)
          </label>
          <Button onClick={runAnalysis} disabled={loading}>
            <Play className="w-4 h-4 mr-2" />
            {loading ? "Ejecutando análisis..." : "Correr análisis"}
          </Button>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result && <ResultadoCompleto result={result} />}
    </div>
  );
}

function ResultadoCompleto({ result }: { result: AnalysisResult }) {
  const v = result.hypothesis.verdict;
  const verdictMap = {
    cumplida: { color: "bg-green-50 border-green-300 text-green-900", Icon: CheckCircle2, label: "Hipótesis CUMPLIDA" },
    parcialmente_cumplida: { color: "bg-amber-50 border-amber-300 text-amber-900", Icon: HelpCircle, label: "Hipótesis PARCIALMENTE CUMPLIDA" },
    no_cumplida: { color: "bg-red-50 border-red-300 text-red-900", Icon: XCircle, label: "Hipótesis NO CUMPLIDA" },
    datos_insuficientes: { color: "bg-slate-50 border-slate-300 text-slate-900", Icon: HelpCircle, label: "DATOS INSUFICIENTES" },
  } as const;
  const { color, Icon, label } = verdictMap[v];

  return (
    <div className="space-y-5">
      <div className={`border-2 rounded-lg p-5 ${color}`}>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {label}
        </h2>
        <p className="text-sm mt-2">{result.hypothesis.reason}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <Badge variant="outline">N = {result.hypothesis.n}</Badge>
          {result.hypothesis.rSquared !== null && (
            <Badge variant="outline">R² = {result.hypothesis.rSquared.toFixed(3)}</Badge>
          )}
          <Badge variant="outline">Predictores significativos = {result.hypothesis.significantPredictors}</Badge>
        </div>
      </div>

      {result.n > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estadística descriptiva del MAPE</CardTitle>
            <CardDescription>
              Tasa de proyectos precisos (MAPE ≤ 15%): <strong>{(result.descriptive.accuracyRate * 100).toFixed(1)}%</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Métrica</th>
                  <th className="text-right py-1">MAPE horas</th>
                  <th className="text-right py-1">MAPE costo</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Media</td><td className="text-right">{result.descriptive.mapeHours.mean.toFixed(2)}%</td><td className="text-right">{result.descriptive.mapeCost.mean.toFixed(2)}%</td></tr>
                <tr><td>Mediana</td><td className="text-right">{result.descriptive.mapeHours.median.toFixed(2)}%</td><td className="text-right">{result.descriptive.mapeCost.median.toFixed(2)}%</td></tr>
                <tr><td>Desviación estándar</td><td className="text-right">{result.descriptive.mapeHours.stddev.toFixed(2)}</td><td className="text-right">{result.descriptive.mapeCost.stddev.toFixed(2)}</td></tr>
                <tr><td>Mín / Máx</td><td className="text-right">{result.descriptive.mapeHours.min.toFixed(1)} / {result.descriptive.mapeHours.max.toFixed(1)}</td><td className="text-right">—</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {result.correlation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Correlación de cada variable con MAPE</CardTitle>
            <CardDescription>
              Pearson r entre cada feature y el MAPE de horas. Valores negativos = la feature reduce el MAPE.
              p &lt; 0.05 = correlación estadísticamente significativa (aprox).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Feature</th>
                  <th className="text-right py-1">r</th>
                  <th className="text-right py-1">p≈</th>
                  <th className="text-left py-1">Interpretación</th>
                </tr>
              </thead>
              <tbody>
                {result.correlation.map((c) => (
                  <tr key={c.feature} className="border-b">
                    <td className="py-1 font-mono text-xs">{c.feature}</td>
                    <td className={`text-right py-1 ${c.vsMape < -0.3 ? "text-green-700" : c.vsMape > 0.3 ? "text-red-700" : ""}`}>
                      {c.vsMape.toFixed(3)}
                    </td>
                    <td className="text-right py-1">{c.pValueApprox.toFixed(3)}</td>
                    <td className="py-1 text-xs text-muted-foreground">{c.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {result.regression && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regresión multivariable lineal</CardTitle>
            <CardDescription>
              R² = <strong>{result.regression.rSquared.toFixed(3)}</strong> · RMSE = {result.regression.rmse.toFixed(2)} ·
              intercept = {result.regression.intercept.toFixed(2)}.{" "}
              <span className="text-muted-foreground">Evidencia principal del artículo.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Feature</th>
                  <th className="text-right py-1">Coef</th>
                  <th className="text-right py-1">p≈</th>
                  <th className="text-left py-1">Interpretación</th>
                </tr>
              </thead>
              <tbody>
                {result.regression.coefficients.map((c) => (
                  <tr key={c.feature} className="border-b">
                    <td className="py-1 font-mono text-xs">{c.feature}</td>
                    <td className={`text-right py-1 ${c.pValueApprox < 0.05 ? "font-bold" : ""}`}>{c.coef.toFixed(3)}</td>
                    <td className="text-right py-1">{c.pValueApprox.toFixed(3)}</td>
                    <td className="py-1 text-xs text-muted-foreground">{c.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {result.classification && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Random Forest — predicción "estimación precisa sí/no"</CardTitle>
            <CardDescription>
              Accuracy en test = <strong>{(result.classification.accuracy * 100).toFixed(1)}%</strong>{" "}
              (train n={result.classification.trainSize}, test n={result.classification.testSize}). Feature
              importance medida por permutación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: Math.max(220, result.classification.featureImportance.length * 22) }}>
              <ResponsiveContainer>
                <BarChart data={result.classification.featureImportance} layout="vertical" margin={{ left: 110 }}>
                  <CartesianGrid stroke="#eee" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="feature" width={120} style={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="importance" fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {result.neuralNet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-600" />
              Red neuronal MLP (exhibición técnica)
            </CardTitle>
            <CardDescription>
              MAPE de predicción = {result.neuralNet.mapeOfPredictionVsActual.toFixed(2)} · loss final ={" "}
              {result.neuralNet.finalLoss.toFixed(2)} · {result.neuralNet.epochs} epochs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 mb-4">
              <strong>⚠ Disclaimer académico:</strong> {result.neuralNet.overfittingWarning}
            </div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid stroke="#eee" />
                  <XAxis type="number" dataKey="actual" name="MAPE real" />
                  <YAxis type="number" dataKey="predicted" name="MAPE predicho" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 60, y: 60 }]} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Scatter data={result.neuralNet.scatterData} fill="#dc2626" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cada punto es un proyecto. Línea gris = predicción perfecta. Mientras más cerca de la línea, mejor
              el ajuste del MLP.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground border-t pt-3">
        Generado: {new Date(result.generatedAt).toLocaleString("es-MX")} · N = {result.n} casos analizados.
      </div>
    </div>
  );
}
