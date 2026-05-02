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
import { Plus, Pencil, Trash2, X, Save, ExternalLink, Activity, RefreshCw, Check, AlertTriangle } from "lucide-react";

interface LiveSource {
  id: string;
  sourceKey: string;
  sourceName: string;
  category: string;
  officialPriority: number;
  sourceUrl: string;
  refreshFrequency: string;
  parserType: string;
  requiresHumanApproval: boolean;
  active: boolean;
  notes: string | null;
  _count?: { snapshots: number };
}

interface ParamReview {
  id: string;
  parameterKey: string;
  oldValue: string | null;
  newValue: string | null;
  detectedAt: string;
  riskLevel: string;
  decision: string;
}

const FORM_DEFAULT = {
  sourceKey: "",
  sourceName: "",
  category: "fiscal" as const,
  officialPriority: 1,
  sourceUrl: "",
  refreshFrequency: "yearly" as const,
  parserType: "manual_review" as const,
  requiresHumanApproval: true,
  active: true,
  notes: "",
};

const CAT_LABEL: Record<string, string> = {
  fiscal: "Federal (SAT, DOF)",
  fiscal_state: "Estatal (SEFIN)",
  labor: "Laboral (INEGI, CONASAMI)",
  dataset: "Dataset (Zenodo)",
  procurement: "Contratación pública",
  research: "Investigación",
  technology: "Tecnología",
};

export default function AdminFuentesVivasPage() {
  const [sources, setSources] = useState<LiveSource[]>([]);
  const [reviews, setReviews] = useState<ParamReview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_DEFAULT });

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const [s, r] = await Promise.all([
      api<{ sources: LiveSource[] }>(`/api/live-sources`),
      api<{ reviews: ParamReview[] }>(`/api/parameter-reviews?status=pending`),
    ]);
    setSources(s.sources);
    setReviews(r.reviews);
  }

  function startEdit(s: LiveSource) {
    setEditingId(s.id);
    setShowForm(true);
    setForm({
      sourceKey: s.sourceKey,
      sourceName: s.sourceName,
      category: s.category as never,
      officialPriority: s.officialPriority,
      sourceUrl: s.sourceUrl,
      refreshFrequency: s.refreshFrequency as never,
      parserType: s.parserType as never,
      requiresHumanApproval: s.requiresHumanApproval,
      active: s.active,
      notes: s.notes ?? "",
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
        await apiPut(`/api/live-sources/${editingId}`, form);
      } else {
        await apiPost(`/api/live-sources`, form);
      }
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Marcar esta fuente como inactiva?")) return;
    await apiDelete(`/api/live-sources/${id}`);
    await refresh();
  }

  async function handleCheck(id: string) {
    setBusyId(id);
    try {
      await apiPost(`/api/live-sources/${id}/check`, {
        notes: "Revisión manual desde panel administrativo",
      });
      alert("Snapshot registrado. Si la fuente reportó cambio, aparecerá en revisiones pendientes.");
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al revisar");
    } finally {
      setBusyId(null);
    }
  }

  async function approveReview(id: string) {
    const approvedBy = prompt("Nombre del aprobador:");
    if (!approvedBy) return;
    await apiPost(`/api/parameter-reviews/${id}/approve`, { approvedBy });
    await refresh();
  }

  async function rejectReview(id: string) {
    const rejectedBy = prompt("Nombre del responsable del rechazo:");
    if (!rejectedBy) return;
    const reason = prompt("Motivo del rechazo:");
    if (!reason) return;
    await apiPost(`/api/parameter-reviews/${id}/reject`, { rejectedBy, reason });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Fuentes vivas" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6" />Fuentes vivas</h1>
          <p className="text-muted-foreground text-sm">{sources.length} fuentes · {reviews.length} cambios pendientes de revisión</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...FORM_DEFAULT }); }}>
            <Plus className="w-4 h-4 mr-2" />Agregar fuente
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editingId ? "Editar fuente" : "Nueva fuente"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Source key</Label>
                  <Input value={form.sourceKey} required onChange={(e) => setForm({ ...form, sourceKey: e.target.value })} placeholder="ej. sat_isr_2027" disabled={!!editingId} />
                </div>
                <div className="col-span-2 grid gap-2">
                  <Label>Nombre</Label>
                  <Input value={form.sourceName} required onChange={(e) => setForm({ ...form, sourceName: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>URL oficial</Label>
                <Input type="url" required value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Categoría</Label>
                  <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as never })}>
                    {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Prioridad oficial (1=alta)</Label>
                  <Input type="number" min={1} max={3} value={form.officialPriority} onChange={(e) => setForm({ ...form, officialPriority: +e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Frecuencia de revisión</Label>
                  <Select value={form.refreshFrequency} onChange={(e) => setForm({ ...form, refreshFrequency: e.target.value as never })}>
                    <option value="manual">Manual</option>
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de parser</Label>
                  <Select value={form.parserType} onChange={(e) => setForm({ ...form, parserType: e.target.value as never })}>
                    <option value="manual_review">Revisión manual</option>
                    <option value="pdf_manual">PDF manual</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="html">HTML</option>
                  </Select>
                </div>
                <div className="grid gap-2 pt-7">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.requiresHumanApproval} onChange={(e) => setForm({ ...form, requiresHumanApproval: e.target.checked })} />
                    Requiere aprobación humana
                  </label>
                </div>
                <div className="grid gap-2 pt-7">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                    Fuente activa
                  </label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Cancelar</Button>
                <Button type="submit"><Save className="w-4 h-4 mr-1" />{editingId ? "Guardar cambios" : "Guardar fuente"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Revisiones pendientes */}
      {reviews.length > 0 && (
        <Card className="border-orange-300 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />Revisiones pendientes ({reviews.length})
            </CardTitle>
            <CardDescription>Cambios detectados que requieren aprobación humana antes de aplicarse al sistema.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parámetro</TableHead>
                  <TableHead>Valor actual</TableHead>
                  <TableHead>Valor nuevo</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Detectado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.parameterKey}</TableCell>
                    <TableCell>{r.oldValue ?? "—"}</TableCell>
                    <TableCell className="font-medium">{r.newValue ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.riskLevel === "critical" ? "destructive" : r.riskLevel === "high" ? "warning" : "outline"}>{r.riskLevel}</Badge></TableCell>
                    <TableCell className="text-xs">{r.detectedAt.split("T")[0]}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => approveReview(r.id)} title="Aprobar">
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectReview(r.id)} title="Rechazar">
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Listado de fuentes */}
      <Card>
        <CardContent className="p-0">
          {sources.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">Aún no hay fuentes registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source key</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead className="text-center">Snapshots</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.sourceKey}</TableCell>
                    <TableCell>
                      <p className="font-medium">{s.sourceName}</p>
                      {s.sourceUrl && (
                        <a href={s.sourceUrl} target="_blank" rel="noopener" className="text-primary hover:underline text-xs flex items-center gap-1">
                          Abrir <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{CAT_LABEL[s.category] ?? s.category}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{s.refreshFrequency}</Badge></TableCell>
                    <TableCell className="text-center">{s._count?.snapshots ?? 0}</TableCell>
                    <TableCell>{s.active ? <Badge variant="success">activa</Badge> : <Badge variant="outline">inactiva</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleCheck(s.id)} disabled={busyId === s.id} title="Revisar fuente ahora">
                          <RefreshCw className={`w-4 h-4 ${busyId === s.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(s)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="Marcar inactiva">
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
