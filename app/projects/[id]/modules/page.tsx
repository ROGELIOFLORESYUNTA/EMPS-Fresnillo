"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { MODULE_TYPE_LABELS, SCALE_GUIDES, labelOf } from "@/lib/utils";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, Trash2, Pencil, X, Save, BookOpen } from "lucide-react";

// Qué es cada tipo de módulo, en lenguaje llano (se muestra bajo el select).
const MODULE_TYPE_HELP: Record<string, string> = {
  catalogo: "Listas que se consultan y actualizan poco: colonias, tarifas, dependencias.",
  transaccional: "Donde se captura y procesa el trabajo diario: solicitudes, pagos, registros.",
  reporte: "Pantallas o documentos que resumen información para revisar o imprimir.",
  integracion: "Conecta este sistema con otro (por ejemplo, con el sistema de Tesorería).",
  flujo: "Procesos con pasos y aprobaciones: una solicitud que pasa por varias manos.",
};

interface ModuleItem {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  complexity: number;
  clarity: number;
  criticality: number;
  screensCount: number;
  reportsCount: number;
  catalogsCount: number;
  integrationsCount: number;
  sensitiveData: boolean;
  notes: string | null;
  stories?: { id: string }[];
}

const FORM_DEFAULT = {
  name: "",
  type: "transaccional",
  description: "",
  complexity: 3,
  clarity: 3,
  criticality: 3,
  screensCount: 1,
  reportsCount: 0,
  catalogsCount: 0,
  integrationsCount: 0,
  sensitiveData: false,
  notes: "",
};

export default function ProjectModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_DEFAULT });

  useEffect(() => { refresh(); }, [projectId]);

  async function refresh() {
    setLoading(true);
    const data = await api<{ modules: ModuleItem[] }>(`/api/projects/${projectId}/modules`);
    setModules(data.modules);
    setLoading(false);
  }

  function startEdit(m: ModuleItem) {
    setEditingId(m.id);
    setShowForm(true);
    setForm({
      name: m.name,
      type: m.type,
      description: m.description ?? "",
      complexity: m.complexity,
      clarity: m.clarity,
      criticality: m.criticality,
      screensCount: m.screensCount,
      reportsCount: m.reportsCount,
      catalogsCount: m.catalogsCount,
      integrationsCount: m.integrationsCount,
      sensitiveData: m.sensitiveData,
      notes: m.notes ?? "",
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
        await apiPut(`/api/modules/${editingId}`, form);
      } else {
        await apiPost(`/api/projects/${projectId}/modules`, form);
      }
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function handleDelete(moduleId: string) {
    if (!confirm("¿Eliminar este módulo? La acción es permanente.")) return;
    await apiDelete(`/api/modules/${moduleId}`);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: "Proyecto", href: `/projects/${projectId}` },
        { label: "Módulos" },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Módulos del proyecto</h1>
          <p className="text-muted-foreground text-sm">
            {modules.length} módulos · las piezas en que se divide el sistema. De aquí salen las horas estimadas.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...FORM_DEFAULT }); }}>
            <Plus className="w-4 h-4 mr-2" />Agregar módulo
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editingId ? "Editar módulo" : "Nuevo módulo"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Nombre</Label>
                  <Input value={form.name} required placeholder="ej. Registro de solicitudes" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="catalogo">Catálogo</option>
                    <option value="transaccional">Transaccional</option>
                    <option value="reporte">Reporte</option>
                    <option value="integracion">Integración</option>
                    <option value="flujo">Flujo</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">{MODULE_TYPE_HELP[form.type]}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Complejidad (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.complexity} onChange={(e) => setForm({ ...form, complexity: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">{SCALE_GUIDES.complexity}</p>
                </div>
                <div className="grid gap-2">
                  <Label>Claridad del requerimiento (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.clarity} onChange={(e) => setForm({ ...form, clarity: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">{SCALE_GUIDES.clarity}</p>
                </div>
                <div className="grid gap-2">
                  <Label>Criticidad (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.criticality} onChange={(e) => setForm({ ...form, criticality: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">{SCALE_GUIDES.criticality}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                Cuenta las piezas de este módulo. Si no estás seguro, deja tu mejor cálculo: se puede corregir después y re-estimar.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label>Pantallas</Label>
                  <Input type="number" min={0} value={form.screensCount} onChange={(e) => setForm({ ...form, screensCount: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">Vistas donde se captura o consulta</p>
                </div>
                <div className="grid gap-2">
                  <Label>Reportes</Label>
                  <Input type="number" min={0} value={form.reportsCount} onChange={(e) => setForm({ ...form, reportsCount: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">Documentos o resúmenes que genera</p>
                </div>
                <div className="grid gap-2">
                  <Label>Catálogos</Label>
                  <Input type="number" min={0} value={form.catalogsCount} onChange={(e) => setForm({ ...form, catalogsCount: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">Listas que administra (tarifas, áreas…)</p>
                </div>
                <div className="grid gap-2">
                  <Label>Integraciones</Label>
                  <Input type="number" min={0} value={form.integrationsCount} onChange={(e) => setForm({ ...form, integrationsCount: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">Conexiones con OTROS sistemas</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" id="sensitive" className="mt-1" checked={form.sensitiveData} onChange={(e) => setForm({ ...form, sensitiveData: e.target.checked })} />
                <div>
                  <Label htmlFor="sensitive">¿Maneja datos personales o sensibles?</Label>
                  <p className="text-xs text-muted-foreground">CURP, domicilios, datos fiscales o de salud. Marcar sube las horas (protección de datos obligatoria por ley).</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-1" />Cancelar
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-1" />
                  {editingId ? "Guardar cambios" : "Guardar módulo"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-muted-foreground">Cargando…</p>
          ) : modules.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Aún no hay módulos. Agregar el primero usando el botón superior.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Complejidad</TableHead>
                  <TableHead className="text-center">Claridad</TableHead>
                  <TableHead className="text-center">Criticidad</TableHead>
                  <TableHead className="text-center">Pantallas</TableHead>
                  <TableHead className="text-center">Reportes</TableHead>
                  <TableHead className="text-center">Integraciones</TableHead>
                  <TableHead>Sensibles</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell><Badge variant="outline">{labelOf(MODULE_TYPE_LABELS, m.type)}</Badge></TableCell>
                    <TableCell className="text-center">{m.complexity}/5</TableCell>
                    <TableCell className="text-center">{m.clarity}/5</TableCell>
                    <TableCell className="text-center">{m.criticality}/5</TableCell>
                    <TableCell className="text-center">{m.screensCount}</TableCell>
                    <TableCell className="text-center">{m.reportsCount}</TableCell>
                    <TableCell className="text-center">{m.integrationsCount}</TableCell>
                    <TableCell>{m.sensitiveData ? <Badge variant="warning">Sí</Badge> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" asChild title="Historias de usuario">
                          <Link href={`/projects/${projectId}/modules/${m.id}/stories`}>
                            <BookOpen className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(m)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} title="Eliminar">
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
