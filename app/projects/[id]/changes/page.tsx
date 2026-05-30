"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, apiPost, apiPut } from "@/lib/api-client";
import { formatMXN } from "@/lib/utils";
import { Plus, Check, X, Calculator, FileSearch } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  computeChangeCost,
  PHASE_LABELS,
  DEFAULT_CONTINGENCY,
  DEFAULT_MIN_COST_MXN,
  type ProjectPhase,
} from "@/lib/engine/change-cost";

interface ChangeRow {
  id: string;
  type: string;
  requesterName: string;
  description: string;
  reason: string | null;
  timeImpactHours: string | number | null;
  costImpact: string | number | null;
  testingImpact: string | null;
  decision: string;
  createdAt: string;
}

const TIPO_LABELS: Record<string, string> = {
  correccion: "Corrección",
  garantia: "Garantía",
  ajuste_menor: "Ajuste menor",
  mejora: "Mejora",
  nuevo_alcance: "Nuevo alcance",
};

export default function ChangesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    requesterName: "",
    description: "",
    type: "mejora" as keyof typeof TIPO_LABELS,
    reason: "",
    timeImpactHours: 0,
    costImpact: 0,
    testingImpact: "",
  });
  const [hourlyRate, setHourlyRate] = useState(500);
  const [phase, setPhase] = useState<ProjectPhase>("mitad");
  const [contingencyPct, setContingencyPct] = useState(DEFAULT_CONTINGENCY * 100);
  const suggestion = computeChangeCost({
    hours: form.timeImpactHours,
    hourlyRate,
    phase,
    contingency: contingencyPct / 100,
    minimum: DEFAULT_MIN_COST_MXN,
  });

  useEffect(() => {
    refresh();
  }, [projectId]);

  async function refresh() {
    const data = await api<{ changes: ChangeRow[] }>(`/api/projects/${projectId}/changes`);
    setChanges(data.changes);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost(`/api/projects/${projectId}/changes`, form);
      setShowForm(false);
      setForm({ ...form, requesterName: "", description: "", reason: "", testingImpact: "" });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function handleDecision(id: string, decision: "aceptado" | "rechazado") {
    if (!confirm(`¿Marcar este cambio como ${decision}?`)) return;
    await apiPut(`/api/changes/${id}`, { decision, decidedBy: "Operador" });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: "Proyecto", href: `/projects/${projectId}` },
        { label: "Cambios" },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Control de cambios</h1>
          <p className="text-muted-foreground text-sm">{changes.length} cambios registrados · {changes.filter((c) => c.decision === "pendiente").length} pendientes de decisión</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-2" />{showForm ? "Cancelar" : "Registrar cambio"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo cambio</CardTitle>
            <CardDescription>Registrar una solicitud de cambio para el proyecto. Quedará pendiente hasta que se acepte o rechace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Solicitante</Label>
                  <Input value={form.requesterName} required onChange={(e) => setForm({ ...form, requesterName: e.target.value })} placeholder="ej. Dirección de Innovación" />
                </div>
                <div className="grid gap-2">
                  <Label>Tipo de cambio</Label>
                  <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as keyof typeof TIPO_LABELS })}>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea value={form.description} required onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="¿Qué cambio se solicita?" />
              </div>
              <div className="grid gap-2">
                <Label>Causa / Justificación</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="¿Por qué se solicita este cambio?" rows={2} />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Impacto en horas (estimado)</Label>
                  <Input type="number" min={0} step={1} value={form.timeImpactHours} onChange={(e) => setForm({ ...form, timeImpactHours: +e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Tarifa por hora (MXN)</Label>
                  <Input type="number" min={0} step={50} value={hourlyRate} onChange={(e) => setHourlyRate(+e.target.value)} />
                  <p className="text-xs text-muted-foreground">Costo promedio del equipo por hora.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Fase del proyecto</Label>
                  <Select value={phase} onChange={(e) => setPhase(e.target.value as ProjectPhase)}>
                    <option value="inicio">{PHASE_LABELS.inicio}</option>
                    <option value="mitad">{PHASE_LABELS.mitad}</option>
                    <option value="avanzado">{PHASE_LABELS.avanzado}</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">Cambios tardíos cuestan más (curva de costo del cambio de Boehm, estándar del Project Management Institute).</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 items-end">
                <div className="grid gap-2 md:col-span-1">
                  <Label>Contingencia (%)</Label>
                  <Input type="number" min={0} max={50} step={1} value={contingencyPct} onChange={(e) => setContingencyPct(+e.target.value)} />
                  <p className="text-xs text-muted-foreground">Reserva para imprevistos. La práctica internacional (Project Management Institute) recomienda 10 a 15% típico, hasta 25% en proyectos complejos.</p>
                </div>
                <div className="md:col-span-2 rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium flex items-center gap-1 mb-2">
                    <Calculator className="w-4 h-4" /> Costo sugerido
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>Horas × tarifa: <span className="font-mono">{formatMXN(suggestion.baseCost)}</span></li>
                    <li>× factor de fase ({suggestion.phaseFactor.toFixed(1)}): <span className="font-mono">{formatMXN(suggestion.adjustedByPhase)}</span></li>
                    <li>+ contingencia ({(suggestion.contingencyRate * 100).toFixed(0)}%): <span className="font-mono">{formatMXN(suggestion.contingencyAmount)}</span></li>
                    {suggestion.hitMinimum && <li className="text-amber-700">Aplicó costo mínimo de {formatMXN(DEFAULT_MIN_COST_MXN)}.</li>}
                  </ul>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <span className="text-base font-semibold">{formatMXN(suggestion.suggestedTotal)}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, costImpact: Math.round(suggestion.suggestedTotal) }))}>
                      Usar este costo
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Costo final (MXN)</Label>
                <Input type="number" min={0} step={1000} value={form.costImpact} onChange={(e) => setForm({ ...form, costImpact: +e.target.value })} />
                <p className="text-xs text-muted-foreground">Puedes ajustarlo manualmente. Si dejas 0 con horas {">"} 0, lo recomendable es pulsar &quot;Usar este costo&quot;.</p>
              </div>
              <div className="grid gap-2">
                <Label>Impacto en pruebas</Label>
                <Textarea value={form.testingImpact} onChange={(e) => setForm({ ...form, testingImpact: e.target.value })} placeholder="¿Qué pruebas adicionales se requieren?" rows={2} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end">
                <Button type="submit">Guardar cambio</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {changes.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">Aún no hay cambios registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead>Decisión</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="outline">{TIPO_LABELS[c.type] ?? c.type}</Badge></TableCell>
                    <TableCell>{c.requesterName}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate" title={c.description}>{c.description}</p>
                      {c.reason && <p className="text-xs text-muted-foreground truncate" title={c.reason}>Causa: {c.reason}</p>}
                    </TableCell>
                    <TableCell className="text-right">{c.timeImpactHours ? Number(c.timeImpactHours).toFixed(0) : "—"}</TableCell>
                    <TableCell className="text-right">{c.costImpact ? formatMXN(Number(c.costImpact)) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.decision === "aceptado" ? "success" : c.decision === "rechazado" ? "destructive" : "outline"}>
                        {c.decision}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" asChild title="Evaluar impacto con motor v7">
                          <Link href={`/projects/${projectId}/changes/${c.id}/impact`}>
                            <FileSearch className="w-4 h-4" />
                          </Link>
                        </Button>
                        {c.decision === "pendiente" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleDecision(c.id, "aceptado")} title="Aceptar (decisión rápida sin evaluación detallada)">
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDecision(c.id, "rechazado")} title="Rechazar">
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
