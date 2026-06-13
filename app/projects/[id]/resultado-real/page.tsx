"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ClipboardCheck, ArrowLeft } from "lucide-react";
import { api, apiPost } from "@/lib/api-client";

interface ProjectInfo {
  id: string;
  name: string;
}

interface ActualResult {
  id: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  actualEffortHours: string | number | null;
  actualTotalCostMxn: string | number | null;
  actualMaintenanceCostMxn: string | number | null;
  actualChangeCount: number | null;
  wasCompleted: boolean | null;
  mainDeviationReason: string | null;
  lessonsLearned: string | null;
}

export default function ProjectResultadoRealPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState(false);
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
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function load() {
    try {
      const p = await api<{ project: ProjectInfo }>(`/api/projects/${projectId}`);
      setProject(p.project);
    } catch {
      // si falla, dejamos el nombre vacío
    }
    try {
      const r = await api<{ result: ActualResult | null }>(`/api/projects/${projectId}/actual-result`);
      if (r.result) {
        setExisting(true);
        setForm({
          actualStartDate: r.result.actualStartDate ? r.result.actualStartDate.slice(0, 10) : "",
          actualEndDate: r.result.actualEndDate ? r.result.actualEndDate.slice(0, 10) : "",
          actualEffortHours: r.result.actualEffortHours != null ? Number(r.result.actualEffortHours) : 0,
          actualTotalCostMxn: r.result.actualTotalCostMxn != null ? Number(r.result.actualTotalCostMxn) : 0,
          actualMaintenanceCostMxn: r.result.actualMaintenanceCostMxn != null ? Number(r.result.actualMaintenanceCostMxn) : 0,
          actualChangeCount: r.result.actualChangeCount ?? 0,
          wasCompleted: r.result.wasCompleted ?? true,
          mainDeviationReason: r.result.mainDeviationReason ?? "",
          lessonsLearned: r.result.lessonsLearned ?? "",
        });
      }
    } catch {
      // sin resultado previo
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (form.actualStartDate) payload.actualStartDate = new Date(form.actualStartDate).toISOString();
      else delete payload.actualStartDate;
      if (form.actualEndDate) payload.actualEndDate = new Date(form.actualEndDate).toISOString();
      else delete payload.actualEndDate;
      await apiPost(`/api/projects/${projectId}/actual-result`, payload);
      setSaved(true);
      router.refresh();
      setTimeout(() => router.push(`/projects/${projectId}`), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: project?.name ?? "Proyecto", href: `/projects/${projectId}` },
        { label: "Resultado real" },
      ]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6" />
          {existing ? "Editar resultado real" : "Registrar resultado real"}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          {project ? <>Proyecto: <strong>{project.name}</strong>. </> : null}
          Captura lo que pasó de verdad al terminar el proyecto. El sistema compara esto contra lo estimado
          para medir su precisión, y crea un caso de entrenamiento para la validación de la hipótesis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lo que pasó realmente</CardTitle>
          <CardDescription>Solo lo que sepas. Lo más importante son las horas reales y el costo real.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
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
              <Textarea value={form.mainDeviationReason} onChange={(e) => setForm({ ...form, mainDeviationReason: e.target.value })} placeholder="¿Por qué costó o tardó más o menos de lo estimado?" rows={2} />
            </div>
            <div className="grid gap-1">
              <Label>Lecciones aprendidas</Label>
              <Textarea value={form.lessonsLearned} onChange={(e) => setForm({ ...form, lessonsLearned: e.target.value })} placeholder="Qué cambiarías la próxima vez" rows={2} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-green-700">Guardado. Regresando al proyecto...</p>}
            <div className="flex justify-between">
              <Button asChild variant="outline" type="button">
                <Link href={`/projects/${projectId}`}><ArrowLeft className="w-4 h-4 mr-2" />Volver al proyecto</Link>
              </Button>
              <Button type="submit">{existing ? "Guardar cambios" : "Guardar resultado"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
