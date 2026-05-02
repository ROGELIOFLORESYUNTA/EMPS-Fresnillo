"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, apiPut } from "@/lib/api-client";
import { EditBreadcrumbs } from "@/components/breadcrumbs";
import { Sliders, Save, RotateCcw, AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";

type Mode = "traditional" | "ai_assisted" | "bytecoding_prompts" | "low_code" | "hybrid";

interface ModeCalibration {
  velocity_factor: number;
  prototype_speedup: number;
  hardening_overhead: number;
  effort_efficiency?: number;
  prototype_quality_factor?: number;
  notes?: string;
  evidencia?: string;
}

type AllCalibrations = Record<Mode, ModeCalibration>;

const MODE_LABELS: Record<Mode, { label: string; description: string }> = {
  traditional: {
    label: "Tradicional",
    description: "Codificación manual. Línea base — siempre 1.0. No editable.",
  },
  ai_assisted: {
    label: "Asistido por IA",
    description: "Asistencia generativa para autocompletar, generar pruebas y documentar.",
  },
  bytecoding_prompts: {
    label: "Bytecoding (prompts)",
    description: "IA genera código y el humano verifica/endurece. Prototipo muy rápido pero requiere hardening.",
  },
  low_code: {
    label: "Low-code",
    description: "Plataformas de configuración (formularios, flujos). Muy rápido pero con riesgo de vendor lock-in.",
  },
  hybrid: {
    label: "Híbrido",
    description: "Mezcla manual para componentes críticos + asistido/bytecoding para boilerplate.",
  },
};

const DEFAULTS: AllCalibrations = {
  traditional: { velocity_factor: 1.00, prototype_speedup: 1.00, hardening_overhead: 0.00, effort_efficiency: 1.00 },
  ai_assisted: { velocity_factor: 1.55, prototype_speedup: 2.50, hardening_overhead: 0.05, effort_efficiency: 0.78 },
  bytecoding_prompts: { velocity_factor: 3.00, prototype_speedup: 7.00, hardening_overhead: 0.20, prototype_quality_factor: 0.55, effort_efficiency: 0.65 },
  low_code: { velocity_factor: 3.50, prototype_speedup: 8.00, hardening_overhead: 0.25, effort_efficiency: 0.50 },
  hybrid: { velocity_factor: 1.90, prototype_speedup: 3.50, hardening_overhead: 0.10, effort_efficiency: 0.72 },
};

export default function CalibracionPage() {
  const [data, setData] = useState<AllCalibrations | null>(null);
  const [original, setOriginal] = useState<AllCalibrations | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ velocity: AllCalibrations }>(`/api/calibracion/velocity`).then((r) => {
      // Limpia metadata interna (_semantica, _baseline, etc.)
      const clean = Object.fromEntries(
        Object.entries(r.velocity).filter(([k]) => !k.startsWith("_")),
      ) as AllCalibrations;
      setData(clean);
      setOriginal(JSON.parse(JSON.stringify(clean)));
    }).catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"));
  }, []);

  function updateMode(mode: Mode, field: keyof ModeCalibration, value: number) {
    if (!data) return;
    setData({
      ...data,
      [mode]: { ...data[mode], [field]: value },
    });
    setSuccess(null);
  }

  function restoreDefaults() {
    if (!confirm("Restaurar todos los valores predeterminados? Los cambios sin guardar se perderán.")) return;
    setData(JSON.parse(JSON.stringify(DEFAULTS)));
    setSuccess(null);
  }

  function resetChanges() {
    if (!original) return;
    setData(JSON.parse(JSON.stringify(original)));
    setSuccess(null);
  }

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      await apiPut(`/api/calibracion/velocity`, data);
      setOriginal(JSON.parse(JSON.stringify(data)));
      setSuccess("Calibración guardada. Las próximas estimaciones usarán estos valores. Estimaciones anteriores no se modifican (auditabilidad).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">Cargando…</div>;
  }

  const hasChanges = JSON.stringify(data) !== JSON.stringify(original);

  return (
    <div className="space-y-6 max-w-5xl">
      <EditBreadcrumbs
        items={[
          { label: "Editar parámetros", href: "/admin/parametros" },
          { label: "Calibración del motor" },
        ]}
        editingWhat={hasChanges ? "Calibración del motor (sin guardar)" : undefined}
      />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sliders className="w-6 h-6" />Calibración del motor</h1>
        <p className="text-muted-foreground text-sm">Ajusta los multiplicadores de cada modo de desarrollo si las estimaciones no reflejan la realidad de tu equipo.</p>
      </div>

      {/* Explicación de los 3 factores */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4" />¿Qué significa cada valor?</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold mb-1">Velocidad calendario (×)</p>
            <p className="text-muted-foreground">Cuánto más rápido entrega el modo respecto a tradicional. <strong>2× = mitad de tiempo</strong>. <strong>3× = un tercio del tiempo</strong>.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Aceleración a prototipo (×)</p>
            <p className="text-muted-foreground">Cuánto más rápido se llega a un prototipo funcional (no endurecido). En bytecoding es típicamente más alto que velocity total porque el prototipo sale rápido pero el hardening toma tiempo.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Sobrecosto de endurecimiento (%)</p>
            <p className="text-muted-foreground">Trabajo adicional de revisión/seguridad/refactor que el modo añade. <strong>20% = 20% más horas</strong> que tradicional para la misma calidad final.</p>
          </div>
        </CardContent>
      </Card>

      {/* Mensaje de auditabilidad */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardContent className="py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Las estimaciones existentes no se modifican</p>
            <p className="text-muted-foreground">
              Cada estimación guarda una copia de los parámetros con los que fue calculada. Si cambias estos valores y quieres que un proyecto use los nuevos,
              debes ir al proyecto y presionar <strong>&ldquo;Recalcular con parámetros vigentes&rdquo;</strong> (genera nueva versión sin borrar la anterior).
            </p>
          </div>
        </CardContent>
      </Card>

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 text-green-800 text-sm border border-green-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Editor de cada modo */}
      <div className="space-y-4">
        {(Object.keys(MODE_LABELS) as Mode[]).map((mode) => {
          const m = data[mode];
          const isTraditional = mode === "traditional";
          return (
            <Card key={mode} className={isTraditional ? "bg-muted/30" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">{MODE_LABELS[mode].label}</CardTitle>
                    <CardDescription>{MODE_LABELS[mode].description}</CardDescription>
                  </div>
                  {isTraditional && <Badge variant="outline">Línea base · solo lectura</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Velocidad calendario</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.05"
                        min={0.5}
                        max={10}
                        value={m.velocity_factor}
                        disabled={isTraditional}
                        onChange={(e) => updateMode(mode, "velocity_factor", +e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">×</span>
                      <span className="text-sm text-muted-foreground">→ {(100 / m.velocity_factor).toFixed(0)}% del tiempo de tradicional</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Aceleración a prototipo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        min={1}
                        max={20}
                        value={m.prototype_speedup}
                        disabled={isTraditional}
                        onChange={(e) => updateMode(mode, "prototype_speedup", +e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">× más rápido</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Sobrecosto endurecimiento</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="1"
                        min={0}
                        max={50}
                        value={Math.round(m.hardening_overhead * 100)}
                        disabled={isTraditional}
                        onChange={(e) => updateMode(mode, "hardening_overhead", +e.target.value / 100)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">% extra</span>
                    </div>
                  </div>
                </div>
                {mode === "bytecoding_prompts" && m.prototype_quality_factor !== undefined && (
                  <div className="mt-4 grid gap-2">
                    <Label>Calidad del prototipo (cuánto del producto final entrega el prototipo crudo)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="5"
                        min={20}
                        max={95}
                        value={Math.round((m.prototype_quality_factor ?? 0.55) * 100)}
                        onChange={(e) => updateMode(mode, "prototype_quality_factor" as keyof ModeCalibration, +e.target.value / 100)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">% de calidad final · el resto lo aporta el hardening posterior</span>
                    </div>
                  </div>
                )}
                {m.notes && <p className="text-xs text-muted-foreground mt-3 italic">{m.notes.split(".")[0]}.</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 sticky bottom-4 p-3 bg-card border rounded-lg shadow-md">
        <div className="text-sm">
          {hasChanges ? (
            <span className="text-orange-700 font-medium">⚠ Hay cambios sin guardar</span>
          ) : (
            <span className="text-muted-foreground">Sin cambios pendientes</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={restoreDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />Valores predeterminados
          </Button>
          {hasChanges && (
            <Button variant="outline" onClick={resetChanges}>
              Descartar cambios
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando…" : "Guardar calibración"}
          </Button>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link href="/admin/parametros" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver al editor de parámetros
        </Link>
      </div>
    </div>
  );
}
