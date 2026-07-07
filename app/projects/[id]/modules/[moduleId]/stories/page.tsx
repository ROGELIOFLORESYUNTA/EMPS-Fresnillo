"use client";
import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { SCALE_GUIDES } from "@/lib/utils";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";

interface Story {
  id: string;
  actor: string;
  need: string;
  benefit: string;
  rules: string | null;
  dataRequired: string | null;
  acceptanceCriteria: string | null;
  evidenceExpected: string | null;
  maturityLevel: number;
  risks: string | null;
  priority: string;
  status: string;
}

const FORM_DEFAULT = {
  actor: "",
  need: "",
  benefit: "",
  rules: "",
  dataRequired: "",
  acceptanceCriteria: "",
  evidenceExpected: "",
  maturityLevel: 3,
  risks: "",
  priority: "media",
};

export default function StoriesPage({ params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const { id: projectId, moduleId } = use(params);
  const [stories, setStories] = useState<Story[]>([]);
  const [moduleName, setModuleName] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_DEFAULT });

  useEffect(() => { refresh(); }, [moduleId]);

  async function refresh() {
    const [data, mod] = await Promise.all([
      api<{ stories: Story[] }>(`/api/modules/${moduleId}/stories`),
      api<{ module: { name: string } }>(`/api/modules/${moduleId}`),
    ]);
    setStories(data.stories);
    setModuleName(mod.module.name);
  }

  function startEdit(s: Story) {
    setEditingId(s.id);
    setShowForm(true);
    setForm({
      actor: s.actor,
      need: s.need,
      benefit: s.benefit,
      rules: s.rules ?? "",
      dataRequired: s.dataRequired ?? "",
      acceptanceCriteria: s.acceptanceCriteria ?? "",
      evidenceExpected: s.evidenceExpected ?? "",
      maturityLevel: s.maturityLevel,
      risks: s.risks ?? "",
      priority: s.priority,
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
        await apiPut(`/api/stories/${editingId}`, form);
      } else {
        await apiPost(`/api/modules/${moduleId}/stories`, form);
      }
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function handleDelete(storyId: string) {
    if (!confirm("¿Eliminar esta historia de usuario?")) return;
    await apiDelete(`/api/stories/${storyId}`);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: "Proyecto", href: `/projects/${projectId}` },
        { label: "Módulos", href: `/projects/${projectId}/modules` },
        { label: "Historias" },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historias de usuario</h1>
          <p className="text-muted-foreground text-sm">
            Módulo: <strong>{moduleName}</strong> · {stories.length} historias · cada historia describe algo concreto que alguien necesita hacer en el sistema
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...FORM_DEFAULT }); }}>
            <Plus className="w-4 h-4 mr-2" />Agregar historia
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editingId ? "Editar historia" : "Nueva historia"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Actor</Label>
                  <Input value={form.actor} required onChange={(e) => setForm({ ...form, actor: e.target.value })} placeholder="ej. Ciudadano, Funcionario" />
                </div>
                <div className="grid gap-2">
                  <Label>Madurez del requerimiento (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.maturityLevel} onChange={(e) => setForm({ ...form, maturityLevel: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">{SCALE_GUIDES.maturity}</p>
                </div>
                <div className="grid gap-2">
                  <Label>Prioridad</Label>
                  <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Necesidad (¿qué quiere?)</Label>
                <Textarea value={form.need} required onChange={(e) => setForm({ ...form, need: e.target.value })} placeholder="Quiero..." rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Beneficio (¿para qué?)</Label>
                <Textarea value={form.benefit} required onChange={(e) => setForm({ ...form, benefit: e.target.value })} placeholder="Para..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Reglas de negocio</Label>
                  <Textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} rows={3} placeholder="Qué se permite y qué no. ej. Solo el titular puede solicitar; máximo 3 trámites por día" />
                </div>
                <div className="grid gap-2">
                  <Label>Datos requeridos</Label>
                  <Textarea value={form.dataRequired} onChange={(e) => setForm({ ...form, dataRequired: e.target.value })} rows={3} placeholder="Qué información se captura. ej. CURP, domicilio, comprobante en PDF" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Criterios de aceptación</Label>
                  <Textarea value={form.acceptanceCriteria} onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })} rows={3} placeholder="Cómo sabremos que quedó bien. ej. Al guardar, se genera folio y llega correo al ciudadano" />
                </div>
                <div className="grid gap-2">
                  <Label>Evidencia esperada</Label>
                  <Textarea value={form.evidenceExpected} onChange={(e) => setForm({ ...form, evidenceExpected: e.target.value })} rows={3} placeholder="Qué documento o registro comprueba que funciona. ej. acuse con folio, captura del reporte" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Riesgos</Label>
                <Textarea value={form.risks} onChange={(e) => setForm({ ...form, risks: e.target.value })} rows={2} placeholder="Qué podría complicarla. ej. depende de que Tesorería comparta su información" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-1" />Cancelar
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-1" />
                  {editingId ? "Guardar cambios" : "Guardar historia"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {stories.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">
              Aún no hay historias para este módulo. Sirven para aterrizar QUÉ debe hacer exactamente: entre más claras, mejor estimación y menos malentendidos con el cliente. Son opcionales, pero recomendadas para los módulos importantes.
            </p>
          ) : (
            <div className="divide-y">
              {stories.map((s) => (
                <div key={s.id} className="p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{s.actor}</Badge>
                      <Badge variant="secondary">Prioridad: {s.priority}</Badge>
                      <Badge variant="outline">Madurez {s.maturityLevel}/5</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(s)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="Eliminar">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">
                    <strong>Como </strong>{s.actor}<strong>, quiero</strong> {s.need} <strong>para</strong> {s.benefit}
                  </p>
                  {s.acceptanceCriteria && (
                    <p className="text-xs text-muted-foreground mt-2"><strong>Criterios:</strong> {s.acceptanceCriteria}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
