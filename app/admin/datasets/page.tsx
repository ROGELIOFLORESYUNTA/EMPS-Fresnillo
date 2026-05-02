"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Plus, Pencil, Trash2, X, Save, ExternalLink, Database, Upload } from "lucide-react";

interface Dataset {
  id: string;
  code: string;
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  doi: string | null;
  license: string | null;
  description: string | null;
  intendedUse: string | null;
  lastCheckedAt: string | null;
  _count?: { imports: number };
}

const FORM_DEFAULT = {
  code: "",
  name: "",
  sourceType: "zenodo" as const,
  sourceUrl: "",
  doi: "",
  license: "",
  description: "",
  intendedUse: "",
};

export default function AdminDatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_DEFAULT });

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const data = await api<{ datasets: Dataset[] }>(`/api/datasets`);
    setDatasets(data.datasets);
  }

  function startEdit(d: Dataset) {
    setEditingId(d.id);
    setShowForm(true);
    setForm({
      code: d.code,
      name: d.name,
      sourceType: d.sourceType as never,
      sourceUrl: d.sourceUrl ?? "",
      doi: d.doi ?? "",
      license: d.license ?? "",
      description: d.description ?? "",
      intendedUse: d.intendedUse ?? "",
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
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name,
        sourceType: form.sourceType,
        sourceUrl: form.sourceUrl || undefined,
        doi: form.doi || undefined,
        license: form.license || undefined,
        description: form.description || undefined,
        intendedUse: form.intendedUse || undefined,
      };
      if (editingId) {
        await apiPut(`/api/datasets/${editingId}`, payload);
      } else {
        await apiPost(`/api/datasets`, payload);
      }
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este dataset? Esta acción es permanente.")) return;
    await apiDelete(`/api/datasets/${id}`);
    await refresh();
  }

  async function handleImport(id: string) {
    const fileName = prompt("Nombre del archivo importado (opcional):");
    if (fileName === null) return;
    const rows = prompt("Cantidad de registros importados:");
    if (rows === null) return;
    setImportingId(id);
    try {
      await apiPost(`/api/datasets/${id}/imports`, {
        fileName: fileName || undefined,
        rowsImported: Number(rows) || 0,
        status: "completed",
        importedBy: "Operador",
      });
      await refresh();
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Datasets" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="w-6 h-6" />Datasets registrados</h1>
          <p className="text-muted-foreground text-sm">{datasets.length} datasets para calibrar y entrenar el sistema (Public Jira, JOSSE, SEERA, casos locales).</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...FORM_DEFAULT }); }}>
            <Plus className="w-4 h-4 mr-2" />Agregar dataset
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editingId ? "Editar dataset" : "Nuevo dataset"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Código</Label>
                  <Input value={form.code} required onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ej. D8_CASOS_2027" disabled={!!editingId} />
                  <p className="text-xs text-muted-foreground">Inmutable después de crear.</p>
                </div>
                <div className="col-span-2 grid gap-2">
                  <Label>Nombre</Label>
                  <Input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de fuente</Label>
                  <Select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as never })}>
                    <option value="zenodo">Zenodo</option>
                    <option value="csv">CSV</option>
                    <option value="local_capture">Captura local</option>
                    <option value="github">GitHub</option>
                    <option value="kaggle">Kaggle</option>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>DOI (opcional)</Label>
                  <Input value={form.doi} onChange={(e) => setForm({ ...form, doi: e.target.value })} placeholder="10.5281/zenodo.xxxxxxx" />
                </div>
                <div className="grid gap-2">
                  <Label>Licencia (opcional)</Label>
                  <Input value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} placeholder="CC BY 4.0, MIT, etc." />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>URL de la fuente</Label>
                <Input type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://zenodo.org/records/..." />
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Uso previsto en el sistema</Label>
                <Textarea value={form.intendedUse} onChange={(e) => setForm({ ...form, intendedUse: e.target.value })} rows={2} placeholder="¿Para qué se va a usar este dataset?" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Cancelar</Button>
                <Button type="submit"><Save className="w-4 h-4 mr-1" />{editingId ? "Guardar cambios" : "Guardar dataset"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado</CardTitle>
          <CardDescription>Cada dataset puede tener importaciones registradas con cantidad de filas y fecha.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {datasets.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">Aún no hay datasets registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>DOI / URL</TableHead>
                  <TableHead className="text-center">Importaciones</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{d.code}</Badge></TableCell>
                    <TableCell>
                      <p className="font-medium">{d.name}</p>
                      {d.intendedUse && <p className="text-xs text-muted-foreground line-clamp-1">{d.intendedUse}</p>}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{d.sourceType}</Badge></TableCell>
                    <TableCell>
                      {d.sourceUrl ? (
                        <a href={d.sourceUrl} target="_blank" rel="noopener" className="text-primary hover:underline text-xs flex items-center gap-1">
                          {d.doi ?? d.sourceUrl.replace(/^https?:\/\//, "").substring(0, 30)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center">{d._count?.imports ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleImport(d.id)} disabled={importingId === d.id} title="Registrar importación">
                          <Upload className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(d)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} title="Eliminar">
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

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Nota:</strong> los datasets registrados aquí se usan en el pipeline de aprendizaje (
          <Link href="/admin/modelos-ml" className="text-primary hover:underline">modelos ML</Link>) para calibrar el sistema. Las importaciones se registran manualmente; la carga real del archivo se hace fuera del sistema y se reporta aquí solo el resumen.
        </CardContent>
      </Card>
    </div>
  );
}
