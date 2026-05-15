"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, ClipboardCheck } from "lucide-react";
import { api, apiPost } from "@/lib/api-client";
import { formatMXN } from "@/lib/utils";

interface TrainingCase {
  id: string;
  sourceKind: string;
  projectType?: string | null;
  municipalArea?: string | null;
  moduleCount?: number | null;
  integrationCount?: number | null;
  devModeCode?: string | null;
  estimatedEffortHours?: string | number | null;
  actualEffortHours?: string | number | null;
  estimatedCostMxn?: string | number | null;
  actualCostMxn?: string | number | null;
  changeCount?: number | null;
  labelQuality: string;
  createdAt: string;
}

const SOURCE_LABELS: Record<string, string> = {
  public_dataset: "Dataset público",
  local_capture: "Captura local",
  simulated_case: "Caso simulado",
};

const MODE_LABELS: Record<string, string> = {
  traditional: "Tradicional",
  ai_assisted: "Asistido por IA",
  bytecoding_prompts: "Bytecoding",
  low_code: "Low-code",
  hybrid: "Híbrido",
};

const LABEL_QUALITY: Record<string, string> = {
  unknown: "Desconocida",
  weak: "Débil",
  moderate: "Moderada",
  strong: "Fuerte",
};

export default function CasosEntrenamientoPage() {
  const [cases, setCases] = useState<TrainingCase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterSource, setFilterSource] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    sourceKind: "local_capture" as keyof typeof SOURCE_LABELS,
    projectType: "",
    municipalArea: "",
    moduleCount: 0,
    integrationCount: 0,
    screenCount: 0,
    reportCount: 0,
    sensitiveData: false,
    devModeCode: "hybrid" as keyof typeof MODE_LABELS,
    estimatedEffortHours: 0,
    actualEffortHours: 0,
    estimatedCostMxn: 0,
    actualCostMxn: 0,
    changeCount: 0,
    labelQuality: "moderate" as keyof typeof LABEL_QUALITY,
    notes: "",
  });

  useEffect(() => {
    refresh();
  }, [filterSource, filterMode]);

  async function refresh() {
    const q = new URLSearchParams();
    if (filterSource) q.set("sourceKind", filterSource);
    if (filterMode) q.set("devMode", filterMode);
    const data = await api<{ cases: TrainingCase[] }>(`/api/training-cases?${q.toString()}`);
    setCases(data.cases);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiPost("/api/training-cases", form);
      setShowForm(false);
      setForm({ ...form, projectType: "", municipalArea: "", notes: "" });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Casos de entrenamiento" },
      ]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6" />
            Casos de entrenamiento
          </h1>
          <p className="text-muted-foreground max-w-3xl mt-1">
            Aquí se registran proyectos pasados (con su esfuerzo estimado y real) que sirven para entrenar los modelos de ML. Pueden venir de tres orígenes: dataset público, captura local del Ayuntamiento, o caso simulado para probar el modelo.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-2" />{showForm ? "Cancelar" : "Agregar caso"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="grid gap-1">
          <Label className="text-xs">Filtrar por origen</Label>
          <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="h-9 w-48">
            <option value="">Todos</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Filtrar por modo</Label>
          <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="h-9 w-48">
            <option value="">Todos</option>
            {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo caso de entrenamiento</CardTitle>
            <CardDescription>Registra un caso histórico para alimentar futuros modelos de ML.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid gap-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <Label>Origen</Label>
                  <Select value={form.sourceKind} onChange={(e) => setForm({ ...form, sourceKind: e.target.value as keyof typeof SOURCE_LABELS })}>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>Tipo de proyecto</Label>
                  <Input value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} placeholder="ej. tramites_ciudadanos" />
                </div>
                <div className="grid gap-1">
                  <Label>Área municipal</Label>
                  <Input value={form.municipalArea} onChange={(e) => setForm({ ...form, municipalArea: e.target.value })} placeholder="ej. Innovación" />
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-3">
                <div className="grid gap-1">
                  <Label>Módulos</Label>
                  <Input type="number" min={0} value={form.moduleCount} onChange={(e) => setForm({ ...form, moduleCount: +e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Pantallas</Label>
                  <Input type="number" min={0} value={form.screenCount} onChange={(e) => setForm({ ...form, screenCount: +e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Reportes</Label>
                  <Input type="number" min={0} value={form.reportCount} onChange={(e) => setForm({ ...form, reportCount: +e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Integraciones</Label>
                  <Input type="number" min={0} value={form.integrationCount} onChange={(e) => setForm({ ...form, integrationCount: +e.target.value })} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>Modo de desarrollo usado</Label>
                  <Select value={form.devModeCode} onChange={(e) => setForm({ ...form, devModeCode: e.target.value as keyof typeof MODE_LABELS })}>
                    {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>Calidad de la etiqueta</Label>
                  <Select value={form.labelQuality} onChange={(e) => setForm({ ...form, labelQuality: e.target.value as keyof typeof LABEL_QUALITY })}>
                    {Object.entries(LABEL_QUALITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-3">
                <div className="grid gap-1">
                  <Label>Horas estimadas</Label>
                  <Input type="number" min={0} value={form.estimatedEffortHours} onChange={(e) => setForm({ ...form, estimatedEffortHours: +e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Horas reales</Label>
                  <Input type="number" min={0} value={form.actualEffortHours} onChange={(e) => setForm({ ...form, actualEffortHours: +e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Costo estimado MXN</Label>
                  <Input type="number" min={0} value={form.estimatedCostMxn} onChange={(e) => setForm({ ...form, estimatedCostMxn: +e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Costo real MXN</Label>
                  <Input type="number" min={0} value={form.actualCostMxn} onChange={(e) => setForm({ ...form, actualCostMxn: +e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contexto del caso, fuente, limitaciones..." rows={2} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end">
                <Button type="submit">Guardar caso</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {cases.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <p className="mb-2">Aún no hay casos registrados.</p>
              <p className="text-xs">
                El primer caso puede venir de un dataset público (Zenodo, SEERA), de un proyecto interno que ya cerraste, o de una simulación para probar el modelo.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origen</TableHead>
                  <TableHead>Tipo / Área</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead className="text-right">Módulos</TableHead>
                  <TableHead className="text-right">Horas est.</TableHead>
                  <TableHead className="text-right">Horas real</TableHead>
                  <TableHead className="text-right">Costo est.</TableHead>
                  <TableHead className="text-right">Costo real</TableHead>
                  <TableHead>Calidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="outline">{SOURCE_LABELS[c.sourceKind] ?? c.sourceKind}</Badge></TableCell>
                    <TableCell className="text-xs">
                      <p>{c.projectType ?? "—"}</p>
                      <p className="text-muted-foreground">{c.municipalArea ?? "—"}</p>
                    </TableCell>
                    <TableCell>{c.devModeCode ? <Badge variant="secondary">{MODE_LABELS[c.devModeCode] ?? c.devModeCode}</Badge> : "—"}</TableCell>
                    <TableCell className="text-right">{c.moduleCount ?? "—"}</TableCell>
                    <TableCell className="text-right">{c.estimatedEffortHours ? Number(c.estimatedEffortHours).toFixed(0) : "—"}</TableCell>
                    <TableCell className="text-right">{c.actualEffortHours ? Number(c.actualEffortHours).toFixed(0) : "—"}</TableCell>
                    <TableCell className="text-right">{c.estimatedCostMxn ? formatMXN(Number(c.estimatedCostMxn)) : "—"}</TableCell>
                    <TableCell className="text-right">{c.actualCostMxn ? formatMXN(Number(c.actualCostMxn)) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{LABEL_QUALITY[c.labelQuality] ?? c.labelQuality}</Badge></TableCell>
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
