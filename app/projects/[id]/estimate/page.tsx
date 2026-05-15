"use client";
import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiPost } from "@/lib/api-client";
import { DEVELOPMENT_MODES, formatMXN } from "@/lib/utils";
import { Calculator, Lightbulb, AlertCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allModes, setAllModes] = useState(true);
  // Form en porcentajes (0-100), no en decimales (0-1)
  const [form, setForm] = useState({
    mode: "hybrid" as string,
    targetMarginPct: 20,                  // %
    weeklyTeamCapacityHours: 80,
    costMode: "detailed" as "detailed" | "estimated",
    anticipoPct: 30,                       // %
    finalPaymentPct: 30,                   // %
    durationMonths: 3,
    monthlyToolsCost: 3000,
    monthlyAdminCost: 5000,
    capitalDeclaredByProvider: 100000,
  });

  // Cálculos en vivo
  const entregablesPct = Math.max(0, 100 - form.anticipoPct - form.finalPaymentPct);
  const sumaTotalPct = form.anticipoPct + entregablesPct + form.finalPaymentPct;
  const distribucionInvalida = form.anticipoPct + form.finalPaymentPct > 100;

  async function runForMode(mode: string) {
    return apiPost<{ estimates: Array<{ id: string; mode: string; scenario: string; total: number; riskLevel: string }> }>(
      `/api/projects/${projectId}/estimate`,
      {
        mode,
        targetMargin: form.targetMarginPct / 100,
        weeklyTeamCapacityHours: form.weeklyTeamCapacityHours,
        costMode: form.costMode,
        capitalDeclaredByProvider: form.capitalDeclaredByProvider,
        cashFlowAssumptions: {
          anticipoPct: form.anticipoPct / 100,
          finalPaymentPct: form.finalPaymentPct / 100,
          durationMonths: form.durationMonths,
          monthlyToolsCost: form.monthlyToolsCost,
          monthlyAdminCost: form.monthlyAdminCost,
        },
      },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (distribucionInvalida) {
      setError("Anticipo + pago final no puede exceder 100%.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (allModes) {
        for (const m of DEVELOPMENT_MODES) {
          await runForMode(m.value);
        }
      } else {
        await runForMode(form.mode);
      }
      router.push(`/projects/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: "Proyecto", href: `/projects/${projectId}` },
        { label: "Estimar" },
      ]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="w-6 h-6" />Estimar proyecto</h1>
        <p className="text-muted-foreground text-sm">Genera 3 escenarios (optimista, probable, conservador) y guarda nueva versión.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuración</CardTitle>
            <CardDescription className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Si comparas los 5 modos, el sistema corre 5 × 3 = 15 estimaciones (5 modos × 3 escenarios) y las guarda como nueva versión para auditoría.</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
              <input type="checkbox" id="allModes" checked={allModes} onChange={(e) => setAllModes(e.target.checked)} />
              <Label htmlFor="allModes" className="cursor-pointer">Comparar los 5 modos de desarrollo (recomendado)</Label>
            </div>

            {!allModes && (
              <div className="grid gap-2">
                <Label>Modo único</Label>
                <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  {DEVELOPMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Margen objetivo (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    value={form.targetMarginPct}
                    onChange={(e) => setForm({ ...form, targetMarginPct: +e.target.value })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Ejemplo: 20 = utilidad 20% sobre el costo</p>
              </div>
              <div className="grid gap-2">
                <Label>Capacidad del equipo (horas/semana)</Label>
                <Input type="number" min={1} value={form.weeklyTeamCapacityHours} onChange={(e) => setForm({ ...form, weeklyTeamCapacityHours: +e.target.value })} />
                <p className="text-xs text-muted-foreground">Suma de horas que el equipo puede trabajar en una semana</p>
              </div>
              <div className="grid gap-2">
                <Label>Cómo calcular costo de equipo</Label>
                <Select value={form.costMode} onChange={(e) => setForm({ ...form, costMode: e.target.value as "detailed" | "estimated" })}>
                  <option value="detailed">Detallado (IMSS por ramo + INFONAVIT)</option>
                  <option value="estimated">Factor estimado 40% sobre salario</option>
                </Select>
                <p className="text-xs text-muted-foreground">Detallado es más preciso; estimado más rápido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Calendario de pagos</CardTitle>
            <CardDescription>Cuándo cobra el proveedor. Se usa para calcular el capital de trabajo necesario.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Anticipo</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={form.anticipoPct}
                    onChange={(e) => setForm({ ...form, anticipoPct: +e.target.value })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Pago al inicio</p>
              </div>
              <div className="grid gap-2">
                <Label>Por entregables (calculado automáticamente)</Label>
                <Input type="text" readOnly value={`${entregablesPct}%`} className="bg-muted/50 font-medium" />
                <p className="text-xs text-muted-foreground">Se reparte cada mes intermedio</p>
              </div>
              <div className="grid gap-2">
                <Label>Pago final</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={form.finalPaymentPct}
                    onChange={(e) => setForm({ ...form, finalPaymentPct: +e.target.value })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Pago al cierre</p>
              </div>
            </div>

            {/* Visualización de la distribución */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Distribución del cobro:</span>
                <span className={distribucionInvalida ? "text-destructive font-semibold" : "font-medium"}>
                  Suma: {sumaTotalPct}%
                </span>
              </div>
              <div className="h-8 rounded-md overflow-hidden flex border">
                {form.anticipoPct > 0 && (
                  <div
                    className="bg-blue-500 text-white text-xs flex items-center justify-center font-medium"
                    style={{ width: `${(form.anticipoPct / 100) * 100}%` }}
                  >
                    Anticipo {form.anticipoPct}%
                  </div>
                )}
                {entregablesPct > 0 && !distribucionInvalida && (
                  <div
                    className="bg-emerald-500 text-white text-xs flex items-center justify-center font-medium"
                    style={{ width: `${(entregablesPct / 100) * 100}%` }}
                  >
                    Por entregables {entregablesPct}%
                  </div>
                )}
                {form.finalPaymentPct > 0 && (
                  <div
                    className="bg-violet-500 text-white text-xs flex items-center justify-center font-medium"
                    style={{ width: `${(form.finalPaymentPct / 100) * 100}%` }}
                  >
                    Final {form.finalPaymentPct}%
                  </div>
                )}
              </div>
              {distribucionInvalida && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Anticipo + pago final no puede exceder 100%. Reduce alguno para dejar espacio a los pagos por entregable.</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Duración del proyecto</Label>
                <div className="relative">
                  <Input type="number" min={1} value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: +e.target.value })} className="pr-16" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">meses</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Costo herramientas / mes</Label>
                <Input type="number" min={0} value={form.monthlyToolsCost} onChange={(e) => setForm({ ...form, monthlyToolsCost: +e.target.value })} />
                <p className="text-xs text-muted-foreground">{formatMXN(form.monthlyToolsCost)}</p>
              </div>
              <div className="grid gap-2">
                <Label>Costo administración / mes</Label>
                <Input type="number" min={0} value={form.monthlyAdminCost} onChange={(e) => setForm({ ...form, monthlyAdminCost: +e.target.value })} />
                <p className="text-xs text-muted-foreground">{formatMXN(form.monthlyAdminCost)}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Capital de trabajo declarado por el proveedor</Label>
              <Input type="number" min={0} step={10000} value={form.capitalDeclaredByProvider} onChange={(e) => setForm({ ...form, capitalDeclaredByProvider: +e.target.value })} />
              <p className="text-xs text-muted-foreground">{formatMXN(form.capitalDeclaredByProvider)}. Si la necesidad supera este monto, el sistema marca riesgo financiero alto</p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm mt-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" type="button" asChild>
            <Link href={`/projects/${projectId}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting || distribucionInvalida}>
            {submitting ? "Calculando…" : allModes ? "Estimar 5 modos × 3 escenarios" : "Estimar"}
          </Button>
        </div>
      </form>

      {/* Ayuda contextual */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Badge variant="outline">¿Por qué importa?</Badge></CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p><strong className="text-foreground">Anticipo bajo + pago final alto</strong> = el proveedor tiene que adelantar el dinero del proyecto y se queda sin liquidez. Si su capital declarado es bajo, hay riesgo de que el proyecto se detenga a la mitad.</p>
          <p><strong className="text-foreground">El sistema calcula automáticamente</strong> el capital de trabajo requerido sumando egresos mensuales (nómina + impuestos + herramientas + admin) menos ingresos por mes. Si en algún mes el saldo acumulado es negativo, ese es el capital que el proveedor necesita tener antes de empezar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
