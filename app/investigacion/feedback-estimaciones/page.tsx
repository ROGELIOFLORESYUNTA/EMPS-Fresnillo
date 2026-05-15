"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, MessageSquare } from "lucide-react";
import { api, apiPost } from "@/lib/api-client";

interface ProjectWithEstimates {
  id: string;
  name: string;
  estimates: { id: string; version: number; mode: string; scenario: string }[];
}

interface FeedbackItem {
  id: string;
  estimateId: string;
  reviewerRole: string | null;
  feedbackType: string | null;
  feedbackText: string;
  severity: string;
  createdAt: string;
}

interface FeedbackRow extends FeedbackItem {
  projectName: string;
  mode: string;
  scenario: string;
  version: number;
}

const ROLE_LABELS: Record<string, string> = {
  ayuntamiento: "Ayuntamiento",
  proveedor: "Proveedor",
  auditor: "Auditor",
  estimador: "Estimador",
  admin: "Admin",
};

const TYPE_LABELS: Record<string, string> = {
  alcance: "Alcance",
  costo: "Costo",
  tiempo: "Tiempo",
  riesgo: "Riesgo",
  parametros: "Parámetros",
  metodologia: "Metodología",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export default function FeedbackEstimacionesPage() {
  const [projects, setProjects] = useState<ProjectWithEstimates[]>([]);
  const [feedbackRows, setFeedbackRows] = useState<FeedbackRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    reviewerRole: "estimador" as keyof typeof ROLE_LABELS,
    feedbackType: "alcance" as keyof typeof TYPE_LABELS,
    feedbackText: "",
    severity: "medium" as keyof typeof SEVERITY_LABELS,
  });

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    const data = await api<{ projects: ProjectWithEstimates[] }>("/api/projects");
    setProjects(data.projects);
    const rows: FeedbackRow[] = [];
    for (const p of data.projects) {
      for (const e of p.estimates ?? []) {
        const f = await api<{ feedback: FeedbackItem[] }>(`/api/estimates/${e.id}/feedback`);
        for (const item of f.feedback) {
          rows.push({
            ...item,
            projectName: p.name,
            mode: e.mode,
            scenario: e.scenario,
            version: e.version,
          });
        }
      }
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setFeedbackRows(rows);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedEstimateId) {
      setError("Selecciona una estimación.");
      return;
    }
    try {
      await apiPost(`/api/estimates/${selectedEstimateId}/feedback`, form);
      setShowForm(false);
      setForm({ ...form, feedbackText: "" });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  const estimateOptions = projects.flatMap((p) =>
    (p.estimates ?? []).map((e) => ({
      value: e.id,
      label: `${p.name} · v${e.version} · ${e.mode} ${e.scenario}`,
    })),
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Feedback de estimaciones" },
      ]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Feedback de estimaciones
          </h1>
          <p className="text-muted-foreground max-w-3xl mt-1">
            Aquí los revisores (ayuntamiento, proveedor, auditor, estimador) dejan comentarios cualitativos sobre estimaciones existentes: si el alcance fue realista, si el costo fue razonable, si los parámetros estuvieron bien aplicados. Es evidencia cualitativa para la tesis.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-2" />{showForm ? "Cancelar" : "Registrar feedback"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo feedback</CardTitle>
            <CardDescription>Comentario cualitativo sobre una estimación existente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid gap-4">
              <div className="grid gap-1">
                <Label>Estimación</Label>
                <Select value={selectedEstimateId} onChange={(e) => setSelectedEstimateId(e.target.value)} required>
                  <option value="">Selecciona una estimación...</option>
                  {estimateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <Label>Rol del revisor</Label>
                  <Select value={form.reviewerRole} onChange={(e) => setForm({ ...form, reviewerRole: e.target.value as keyof typeof ROLE_LABELS })}>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>Tipo de feedback</Label>
                  <Select value={form.feedbackType} onChange={(e) => setForm({ ...form, feedbackType: e.target.value as keyof typeof TYPE_LABELS })}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>Severidad</Label>
                  <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as keyof typeof SEVERITY_LABELS })}>
                    {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Comentario</Label>
                <Textarea value={form.feedbackText} onChange={(e) => setForm({ ...form, feedbackText: e.target.value })} required rows={4} placeholder="¿Qué observaste? ¿Qué se puede mejorar?" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end">
                <Button type="submit">Guardar feedback</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {feedbackRows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <p className="mb-2">Aún no hay feedback registrado.</p>
              <p className="text-xs">
                Este registro sirve como evidencia cualitativa para la tesis: complementa los números con la voz de quien usó la estimación.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proyecto / Estimación</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Comentario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackRows.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{new Date(f.createdAt).toLocaleDateString("es-MX")}</TableCell>
                    <TableCell className="text-xs">
                      <p className="font-medium">{f.projectName}</p>
                      <p className="text-muted-foreground">v{f.version} · {f.mode} {f.scenario}</p>
                    </TableCell>
                    <TableCell>{f.reviewerRole ? <Badge variant="outline">{ROLE_LABELS[f.reviewerRole] ?? f.reviewerRole}</Badge> : "—"}</TableCell>
                    <TableCell>{f.feedbackType ? <Badge variant="secondary">{TYPE_LABELS[f.feedbackType] ?? f.feedbackType}</Badge> : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={f.severity === "high" ? "destructive" : f.severity === "medium" ? "outline" : "secondary"}>
                        {SEVERITY_LABELS[f.severity] ?? f.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-md">{f.feedbackText}</TableCell>
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
