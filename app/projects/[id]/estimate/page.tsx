"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, apiPost } from "@/lib/api-client";
import { BarraDePasos } from "@/components/barra-de-pasos";
import { DEVELOPMENT_MODES, formatMXN } from "@/lib/utils";

interface HerramientasResp {
  asientos: number;
  pericia: { promedio: number; conDato: boolean };
  tipoCambio: number;
  porModo: Record<string, { mensualMXN: number; factor: number; aplica: boolean; mensualUsuariosFinalesMXN: number; usuariosFinales: number; usuariosFinalesSupuestos: boolean }>;
}
import { Calculator, Lightbulb, AlertCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allModes, setAllModes] = useState(true);
  // La capacidad semanal se calcula del equipo (disponibilidad x 40 h); solo
  // se fija a mano si el usuario lo pide, porque divide el precio.
  const [capacidadDelEquipo, setCapacidadDelEquipo] = useState(true);
  const [proyecto, setProyecto] = useState<{ estimatedBudget: string | number | null; targetDate: string | null; team: { availabilityPercent: string | number }[] } | null>(null);
  useEffect(() => {
    api<{ project: { estimatedBudget: string | number | null; targetDate: string | null; team: { availabilityPercent: string | number }[] } }>(`/api/projects/${projectId}`)
      .then((r) => setProyecto(r.project))
      .catch(() => setProyecto(null));
  }, [projectId]);
  const [herramientas, setHerramientas] = useState<HerramientasResp | null>(null);
  useEffect(() => {
    api<HerramientasResp>(`/api/projects/${projectId}/herramientas`).then(setHerramientas).catch(() => setHerramientas(null));
  }, [projectId]);
  const horasDelEquipo = proyecto?.team?.length
    ? Math.max(1, proyecto.team.reduce((a, t) => a + (Number(t.availabilityPercent) / 100) * 40, 0))
    : null;
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
        weeklyTeamCapacityHours: capacidadDelEquipo ? undefined : form.weeklyTeamCapacityHours,
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
      <BarraDePasos projectId={projectId} actual={4} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="w-6 h-6" />Calcular cuánto cuesta y cuánto tarda</h1>
        <p className="text-muted-foreground text-sm">Compara las 5 formas de hacerlo con tres escenarios: si todo sale bien (optimista), lo más seguro (probable) y si hay tropiezos (conservador). Cada corrida se guarda como versión nueva.</p>
        {proyecto && (proyecto.estimatedBudget != null || proyecto.targetDate) && (
          <p className="text-sm mt-2">
            {proyecto.estimatedBudget != null && <>Dinero disponible: <strong>{formatMXN(Number(proyecto.estimatedBudget))}</strong>. </>}
            {proyecto.targetDate && <>Fecha límite: <strong>{new Date(proyecto.targetDate).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</strong>. </>}
            El resultado te dirá si cabe y si llega a tiempo.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuración</CardTitle>
            <CardDescription className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Si comparas las 5 formas de hacerlo, el sistema corre 15 estimaciones (5 formas por 3 escenarios) y las guarda como versión nueva, para que se pueda revisar después.</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
              <input type="checkbox" id="allModes" checked={allModes} onChange={(e) => setAllModes(e.target.checked)} />
              <Label htmlFor="allModes" className="cursor-pointer">Comparar las 5 formas de hacerlo (recomendado)</Label>
            </div>

            {!allModes && (
              <div className="grid gap-2">
                <Label>Una sola forma de hacerlo</Label>
                <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  {DEVELOPMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Utilidad que quiere ganar el proveedor (%)</Label>
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
                <p className="text-xs text-muted-foreground">Ejemplo: 20 = gana 20 % sobre lo que le cuesta. Es la parte del precio que no es costo.</p>
              </div>
              <div className="grid gap-2">
                <Label>Horas a la semana del equipo</Label>
                {capacidadDelEquipo ? (
                  <>
                    <p className="text-sm font-medium">{horasDelEquipo != null ? `${horasDelEquipo.toLocaleString("es-MX", { maximumFractionDigits: 0 })} horas` : "Se calculan del equipo"}</p>
                    <p className="text-xs text-muted-foreground">
                      Sale del equipo capturado: la parte del tiempo de cada persona por 40 horas.{" "}
                      <button type="button" className="underline" onClick={() => setCapacidadDelEquipo(false)}>Quiero fijarlas yo</button>
                    </p>
                  </>
                ) : (
                  <>
                    <Input type="number" min={1} value={form.weeklyTeamCapacityHours} onChange={(e) => setForm({ ...form, weeklyTeamCapacityHours: +e.target.value })} />
                    <p className="text-xs text-amber-800">
                      Cuidado: este número divide el precio (80 horas cuestan el doble que 160).{" "}
                      <button type="button" className="underline" onClick={() => setCapacidadDelEquipo(true)}>Volver a calcularlas del equipo</button>
                    </p>
                  </>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Cómo calcular lo que cuesta el equipo</Label>
                <Select value={form.costMode} onChange={(e) => setForm({ ...form, costMode: e.target.value as "detailed" | "estimated" })}>
                  <option value="detailed">Detallado: IMSS, INFONAVIT e impuesto sobre nómina, cuota por cuota</option>
                  <option value="estimated">Rápido: 40 % sobre el sueldo</option>
                </Select>
                <p className="text-xs text-muted-foreground">Detallado es el exacto; rápido sirve para una primera idea.</p>
              </div>
            </div>

            {herramientas && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-medium text-sm">Herramientas de IA que se cobran, según la forma de hacerlo</p>
                <p className="text-muted-foreground">
                  {herramientas.asientos} asiento(s) para las personas técnicas del equipo · pericia con la IA {herramientas.pericia.promedio} de 5
                  {herramientas.pericia.conDato ? "" : " (no capturada; se asume 3)"} · {herramientas.tipoCambio} pesos por dólar.
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5">
                  {DEVELOPMENT_MODES.map((m) => {
                    const h = herramientas.porModo[m.value];
                    if (!h) return null;
                    return (
                      <li key={m.value}>
                        {m.label}: <strong>{formatMXN(h.mensualMXN)}</strong> al mes
                        {h.aplica && h.factor !== 1 ? ` · se acredita ${Math.round(h.factor * 100)} % del ahorro de la IA` : ""}
                        {h.mensualUsuariosFinalesMXN > 0 ? ` · después de entregar, ${formatMXN(h.mensualUsuariosFinalesMXN)} al mes de licencias para ${h.usuariosFinales} usuario(s)${h.usuariosFinalesSupuestos ? " (supuestos)" : ""}` : ""}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-muted-foreground">Entran al costo y al precio con el mismo número, sin IVA porque es acreditable. La pericia se captura en Equipo; los precios y el tipo de cambio están en Fuentes.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <details className="mt-4 rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm">
            <span className="font-medium">Ajustar detalles</span>
            <span className="text-muted-foreground"> · anticipo {form.anticipoPct} %, pago final {form.finalPaymentPct} %, otras herramientas {formatMXN(form.monthlyToolsCost)} al mes, administración {formatMXN(form.monthlyAdminCost)} al mes, el proveedor puede adelantar {formatMXN(form.capitalDeclaredByProvider)}</span>
          </summary>
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Calendario de pagos</CardTitle>
            <CardDescription>Cuándo cobra el proveedor. Con esto se calcula cuánto dinero tiene que poner de su bolsa mientras le pagan (capital de trabajo).</CardDescription>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Otras herramientas al mes (servidores, dominios, licencias que no son de IA)</Label>
                <Input type="number" min={0} value={form.monthlyToolsCost} onChange={(e) => setForm({ ...form, monthlyToolsCost: +e.target.value })} />
                <p className="text-xs text-muted-foreground">{formatMXN(form.monthlyToolsCost)}</p>
              </div>
              <div className="grid gap-2">
                <Label>Administración al mes (contador, oficina)</Label>
                <Input type="number" min={0} value={form.monthlyAdminCost} onChange={(e) => setForm({ ...form, monthlyAdminCost: +e.target.value })} />
                <p className="text-xs text-muted-foreground">{formatMXN(form.monthlyAdminCost)}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Dinero que el proveedor puede adelantar (capital de trabajo)</Label>
              <Input type="number" min={0} step={10000} value={form.capitalDeclaredByProvider} onChange={(e) => setForm({ ...form, capitalDeclaredByProvider: +e.target.value })} />
              <p className="text-xs text-muted-foreground">{formatMXN(form.capitalDeclaredByProvider)}. Es lo que pone de su bolsa mientras le pagan. Si el proyecto necesita más que esto, el sistema lo marca en rojo.</p>
            </div>
          </CardContent>
        </Card>
        </details>

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
            {submitting ? "Calculando..." : allModes ? "Calcular las 5 formas de hacerlo" : "Calcular"}
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
