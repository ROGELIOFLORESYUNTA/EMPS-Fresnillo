"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, Pencil, Trash2, X, Save, BrainCircuit, Check, BarChart3 } from "lucide-react";

interface MLModel {
  id: string;
  modelKey: string;
  modelName: string;
  targetVariable: string;
  algorithm: string;
  trainingDatasetNotes: string | null;
  modelArtifactPath: string | null;
  status: string;
  trainedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  _count?: { metrics: number; predictions: number };
}

const FORM_DEFAULT = {
  modelKey: "effort_range_model" as const,
  modelName: "",
  targetVariable: "effort_hours",
  algorithm: "random_forest" as const,
  trainingDatasetNotes: "",
  modelArtifactPath: "",
};

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive"> = {
  draft: "outline",
  trained: "warning",
  approved: "success",
  retired: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  trained: "Entrenado",
  approved: "Aprobado",
  retired: "Retirado",
};

export default function AdminModelosMLPage() {
  const [models, setModels] = useState<MLModel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_DEFAULT });
  const [showMetricFor, setShowMetricFor] = useState<string | null>(null);
  const [metric, setMetric] = useState({ datasetSplit: "test" as const, metricName: "mae" as const, metricValue: 0, sampleSize: 0, notes: "" });

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const data = await api<{ models: MLModel[] }>(`/api/ml-models`);
    setModels(data.models);
  }

  function startEdit(m: MLModel) {
    setEditingId(m.id);
    setShowForm(true);
    setForm({
      modelKey: m.modelKey as never,
      modelName: m.modelName,
      targetVariable: m.targetVariable,
      algorithm: m.algorithm as never,
      trainingDatasetNotes: m.trainingDatasetNotes ?? "",
      modelArtifactPath: m.modelArtifactPath ?? "",
    });
  }

  function cancelEdit() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...FORM_DEFAULT });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        const { modelKey: _m, ...rest } = form;
        void _m;
        await apiPut(`/api/ml-models/${editingId}`, rest);
      } else {
        await apiPost(`/api/ml-models`, form);
      }
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Marcar este modelo como retirado?")) return;
    await apiDelete(`/api/ml-models/${id}`);
    await refresh();
  }

  async function handleApprove(id: string) {
    const approvedBy = prompt("Nombre del aprobador:");
    if (!approvedBy) return;
    await apiPost(`/api/ml-models/${id}/approve`, { approvedBy });
    await refresh();
  }

  async function handleAddMetric(e: React.FormEvent) {
    e.preventDefault();
    if (!showMetricFor) return;
    try {
      await apiPost(`/api/ml-models/${showMetricFor}/metrics`, metric);
      setShowMetricFor(null);
      setMetric({ datasetSplit: "test", metricName: "mae", metricValue: 0, sampleSize: 0, notes: "" });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al agregar métrica");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Modelos ML" },
      ]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BrainCircuit className="w-6 h-6" />Modelos de aprendizaje automático</h1>
          <p className="text-muted-foreground text-sm">{models.length} modelos registrados · {models.filter((m) => m.status === "approved").length} aprobados</p>
        </div>
        {!showForm && !showMetricFor && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...FORM_DEFAULT }); }}>
            <Plus className="w-4 h-4 mr-2" />Registrar modelo
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editingId ? "Editar modelo" : "Nuevo modelo"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de modelo</Label>
                  <Select value={form.modelKey} onChange={(e) => setForm({ ...form, modelKey: e.target.value as never })} disabled={!!editingId}>
                    <option value="effort_range_model">Rango de esfuerzo</option>
                    <option value="change_risk_model">Riesgo de cambios</option>
                    <option value="cost_deviation_model">Desviación de costo</option>
                    <option value="mode_factor_model">Factor por modo</option>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Nombre descriptivo</Label>
                  <Input value={form.modelName} required onChange={(e) => setForm({ ...form, modelName: e.target.value })} placeholder="ej. Effort RF v1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Variable objetivo</Label>
                  <Input value={form.targetVariable} required onChange={(e) => setForm({ ...form, targetVariable: e.target.value })} placeholder="effort_hours" />
                </div>
                <div className="grid gap-2">
                  <Label>Algoritmo</Label>
                  <Select value={form.algorithm} onChange={(e) => setForm({ ...form, algorithm: e.target.value as never })}>
                    <option value="rules_only">Solo reglas (sin ML)</option>
                    <option value="linear_regression">Regresión lineal</option>
                    <option value="random_forest">Random forest</option>
                    <option value="gradient_boosting">Gradient boosting</option>
                    <option value="xgboost">XGBoost</option>
                    <option value="neural_network">Red neuronal</option>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notas del dataset de entrenamiento</Label>
                <Textarea value={form.trainingDatasetNotes} onChange={(e) => setForm({ ...form, trainingDatasetNotes: e.target.value })} rows={2} placeholder="ej. JOSSE + 200 casos locales 2026" />
              </div>
              <div className="grid gap-2">
                <Label>Ruta del artefacto del modelo (opcional)</Label>
                <Input value={form.modelArtifactPath} onChange={(e) => setForm({ ...form, modelArtifactPath: e.target.value })} placeholder="s3://bucket/effort_v1.pkl" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Cancelar</Button>
                <Button type="submit"><Save className="w-4 h-4 mr-1" />{editingId ? "Guardar cambios" : "Registrar modelo"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showMetricFor && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Agregar métrica</CardTitle>
            <CardDescription>Modelo: <code className="bg-muted px-1 rounded text-xs">{models.find((m) => m.id === showMetricFor)?.modelKey}</code></CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMetric} className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Split del dataset</Label>
                  <Select value={metric.datasetSplit} onChange={(e) => setMetric({ ...metric, datasetSplit: e.target.value as never })}>
                    <option value="train">Entrenamiento</option>
                    <option value="validation">Validación</option>
                    <option value="test">Prueba</option>
                    <option value="local">Local (casos propios)</option>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Nombre de la métrica</Label>
                  <Select value={metric.metricName} onChange={(e) => setMetric({ ...metric, metricName: e.target.value as never })}>
                    <option value="mae">MAE (error absoluto medio)</option>
                    <option value="rmse">RMSE</option>
                    <option value="mape">MAPE (% error)</option>
                    <option value="r2">R²</option>
                    <option value="range_coverage_pct">Cobertura del rango</option>
                    <option value="error_by_mode">Error por modo</option>
                    <option value="error_by_size">Error por tamaño</option>
                    <option value="error_by_project_type">Error por tipo</option>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Valor</Label>
                  <Input type="number" step="0.0001" value={metric.metricValue} onChange={(e) => setMetric({ ...metric, metricValue: +e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Tamaño de muestra</Label>
                  <Input type="number" min={1} value={metric.sampleSize} onChange={(e) => setMetric({ ...metric, sampleSize: +e.target.value })} />
                </div>
                <div className="col-span-2 grid gap-2">
                  <Label>Notas</Label>
                  <Input value={metric.notes} onChange={(e) => setMetric({ ...metric, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowMetricFor(null)}><X className="w-4 h-4 mr-1" />Cancelar</Button>
                <Button type="submit"><Save className="w-4 h-4 mr-1" />Guardar métrica</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {models.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BrainCircuit className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aún no hay modelos registrados.</p>
              <p className="text-sm mt-2">Cuando exista suficiente dataset local se pueden entrenar los 4 modelos planeados (effort, change risk, cost deviation, mode factor).</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Variable</TableHead>
                  <TableHead>Algoritmo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Métricas</TableHead>
                  <TableHead className="text-center">Predicciones</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.modelKey}</TableCell>
                    <TableCell className="font-medium">{m.modelName}</TableCell>
                    <TableCell><Badge variant="outline">{m.targetVariable}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{m.algorithm}</Badge></TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[m.status]}>{STATUS_LABEL[m.status] ?? m.status}</Badge></TableCell>
                    <TableCell className="text-center">{m._count?.metrics ?? 0}</TableCell>
                    <TableCell className="text-center">{m._count?.predictions ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setShowMetricFor(m.id)} title="Agregar métrica">
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                        {m.status !== "approved" && m.status !== "retired" && (
                          <Button variant="ghost" size="icon" onClick={() => handleApprove(m.id)} title="Aprobar para uso">
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => startEdit(m)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} title="Retirar">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
