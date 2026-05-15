"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, FileBarChart } from "lucide-react";
import { api, apiPost } from "@/lib/api-client";
import { formatMXN } from "@/lib/utils";

interface ProjectOption {
  id: string;
  name: string;
}

interface ActualResult {
  id: string;
  projectId: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  actualEffortHours: string | number | null;
  actualTotalCostMxn: string | number | null;
  actualChangeCount: number | null;
  wasCompleted: boolean | null;
  mainDeviationReason: string | null;
  createdAt: string;
}

export default function ResultadosRealesPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [results, setResults] = useState<{ project: ProjectOption; result: ActualResult }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    actualStartDate: "",
    actualEndDate: "",
    actualEffortHours: 0,
    actualTotalCostMxn: 0,
    actualMaintenanceCostMxn: 0,
    actualChangeCount: 0,
    wasCompleted: true,
    mainDeviationReason: "",
    lessonsLearned: "",
  });

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    const data = await api<{ projects: ProjectOption[] }>("/api/projects");
    setProjects(data.projects);
    // Cargar resultados de cada proyecto
    const out: { project: ProjectOption; result: ActualResult }[] = [];
    for (const p of data.projects) {
      const r = await api<{ result: ActualResult | null }>(`/api/projects/${p.id}/actual-result`);
      if (r.result) out.push({ project: p, result: r.result });
    }
    setResults(out);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedProjectId) {
      setError("Selecciona un proyecto.");
      return;
    }
    try {
      const payload: Record<string, unknown> = { ...form };
      if (form.actualStartDate) payload.actualStartDate = new Date(form.actualStartDate).toISOString();
      else delete payload.actualStartDate;
      if (form.actualEndDate) payload.actualEndDate = new Date(form.actualEndDate).toISOString();
      else delete payload.actualEndDate;
      await apiPost(`/api/projects/${selectedProjectId}/actual-result`, payload);
      setShowForm(false);
      setForm({ ...form, mainDeviationReason: "", lessonsLearned: "" });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Resultados reales" },
      ]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-6 h-6" />
            Resultados reales de proyectos
          </h1>
          <p className="text-muted-foreground max-w-3xl mt-1">
            Cuando un proyecto ya cerró, aquí se registra cuánto costó realmente, cuánto duró y por qué se desvió de la estimación. Esto retroalimenta el modelo y mide la precisión del estimador. Al guardar, el sistema crea también un caso de entrenamiento derivado.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-2" />{showForm ? "Cancelar" : "Registrar resultado"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado real de un proyecto</CardTitle>
            <CardDescription>Captura lo que pasó realmente al cerrar el proyecto.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid gap-4">
              <div className="grid gap-1">
                <Label>Proyecto</Label>
                <Select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} required>
                  <option value="">Selecciona un proyecto...</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label>Fecha de inicio real</Label>
                  <Input type="date" value={form.actualStartDate} onChange={(e) => setForm({ ...form, actualStartDate: e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Fecha de cierre real</Label>
                  <Input type="date" value={form.actualEndDate} onChange={(e) => setForm({ ...form, actualEndDate: e.target.value })} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <Label>Horas reales</Label>
                  <Input type="number" min={0} value={form.actualEffortHours} onChange={(e) => setForm({ ...form, actualEffortHours: +e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Costo total real (MXN)</Label>
                  <Input type="number" min={0} value={form.actualTotalCostMxn} onChange={(e) => setForm({ ...form, actualTotalCostMxn: +e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Cambios solicitados</Label>
                  <Input type="number" min={0} value={form.actualChangeCount} onChange={(e) => setForm({ ...form, actualChangeCount: +e.target.value })} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3 items-center">
                <div className="grid gap-1">
                  <Label>Costo de mantenimiento posterior (MXN)</Label>
                  <Input type="number" min={0} value={form.actualMaintenanceCostMxn} onChange={(e) => setForm({ ...form, actualMaintenanceCostMxn: +e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm mt-5">
                  <input type="checkbox" checked={form.wasCompleted} onChange={(e) => setForm({ ...form, wasCompleted: e.target.checked })} />
                  El proyecto se completó exitosamente
                </label>
              </div>
              <div className="grid gap-1">
                <Label>Razón principal de la desviación</Label>
                <Textarea value={form.mainDeviationReason} onChange={(e) => setForm({ ...form, mainDeviationReason: e.target.value })} placeholder="¿Por qué costó/tardó más o menos de lo estimado?" rows={2} />
              </div>
              <div className="grid gap-1">
                <Label>Lecciones aprendidas</Label>
                <Textarea value={form.lessonsLearned} onChange={(e) => setForm({ ...form, lessonsLearned: e.target.value })} placeholder="Qué cambiarías la próxima vez" rows={2} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end">
                <Button type="submit">Guardar resultado</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {results.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <p className="mb-2">Aún no hay resultados registrados.</p>
              <p className="text-xs">
                Para alimentar el modelo y validar la hipótesis del artículo, agrega el resultado real de un proyecto que ya cerró. El sistema también creará automáticamente un caso de entrenamiento derivado.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Fechas reales</TableHead>
                  <TableHead className="text-right">Horas reales</TableHead>
                  <TableHead className="text-right">Costo real</TableHead>
                  <TableHead className="text-right">Cambios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Razón desviación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.result.id}>
                    <TableCell className="font-medium">{r.project.name}</TableCell>
                    <TableCell className="text-xs">
                      {r.result.actualStartDate && <p>Inicio: {new Date(r.result.actualStartDate).toLocaleDateString("es-MX")}</p>}
                      {r.result.actualEndDate && <p>Cierre: {new Date(r.result.actualEndDate).toLocaleDateString("es-MX")}</p>}
                    </TableCell>
                    <TableCell className="text-right">{r.result.actualEffortHours ? Number(r.result.actualEffortHours).toFixed(0) : "—"}</TableCell>
                    <TableCell className="text-right">{r.result.actualTotalCostMxn ? formatMXN(Number(r.result.actualTotalCostMxn)) : "—"}</TableCell>
                    <TableCell className="text-right">{r.result.actualChangeCount ?? "—"}</TableCell>
                    <TableCell>{r.result.wasCompleted === true ? "Completado" : r.result.wasCompleted === false ? "Cancelado" : "—"}</TableCell>
                    <TableCell className="text-xs max-w-md truncate" title={r.result.mainDeviationReason ?? ""}>{r.result.mainDeviationReason ?? "—"}</TableCell>
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
