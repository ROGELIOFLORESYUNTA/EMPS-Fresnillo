"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { formatMXN, CONTRACT_LABELS, CONTRACT_HELP, ROLE_LABELS, LEVEL_LABELS, labelOf } from "@/lib/utils";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, Trash2, Pencil, X, Save } from "lucide-react";

interface TeamItem {
  id: string;
  name: string;
  role: string;
  level: string;
  monthlySalary: string | number;
  availabilityPercent: number;
  monthsAssigned: string | number;
  contractType: string;
  turnoverRisk: number;
  supervisionRequired: number;
}

const FORM_DEFAULT = {
  name: "",
  role: "dev_senior",
  level: "mid",
  monthlySalary: 30000,
  availabilityPercent: 100,
  monthsAssigned: 3,
  contractType: "nomina",
  turnoverRisk: 2,
  supervisionRequired: 2,
};

export default function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [team, setTeam] = useState<TeamItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_DEFAULT });

  useEffect(() => { refresh(); }, [projectId]);

  async function refresh() {
    const data = await api<{ team: TeamItem[] }>(`/api/projects/${projectId}/team`);
    setTeam(data.team);
  }

  function startEdit(p: TeamItem) {
    setEditingId(p.id);
    setShowForm(true);
    setForm({
      name: p.name,
      role: p.role,
      level: p.level,
      monthlySalary: Number(p.monthlySalary),
      availabilityPercent: p.availabilityPercent,
      monthsAssigned: Number(p.monthsAssigned),
      contractType: p.contractType,
      turnoverRisk: p.turnoverRisk,
      supervisionRequired: p.supervisionRequired,
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
        await apiPut(`/api/team/${editingId}`, form);
      } else {
        await apiPost(`/api/projects/${projectId}/team`, form);
      }
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function handleDelete(profileId: string) {
    if (!confirm("¿Eliminar este perfil?")) return;
    await apiDelete(`/api/team/${profileId}`);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: "Proyecto", href: `/projects/${projectId}` },
        { label: "Equipo" },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipo del proyecto</h1>
          <p className="text-muted-foreground text-sm">
            {team.length} perfiles · las personas que el PROVEEDOR asigna. Su salario es lo que el proveedor les paga (su costo), no lo que cobra al cliente.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...FORM_DEFAULT }); }}>
            <Plus className="w-4 h-4 mr-2" />Agregar perfil
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editingId ? "Editar perfil" : "Nuevo perfil"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Nombre / identificador</Label>
                  <Input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Rol</Label>
                  <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="lider_tecnico">Líder técnico</option>
                    <option value="dev_senior">Desarrollador senior</option>
                    <option value="dev_junior">Desarrollador junior</option>
                    <option value="analista">Analista</option>
                    <option value="tester">Probador (tester)</option>
                    <option value="disenador">Diseñador</option>
                    <option value="soporte">Soporte</option>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Nivel de experiencia</Label>
                  <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option value="junior">Junior (aprendiendo)</option>
                    <option value="mid">Medio</option>
                    <option value="senior">Senior (experimentado)</option>
                    <option value="lead">Líder</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Salario mensual (MXN, bruto)</Label>
                  <Input type="number" min={0} value={form.monthlySalary} placeholder="ej. 30000" onChange={(e) => setForm({ ...form, monthlySalary: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">
                    Lo que el proveedor le paga a esta persona al mes, antes de impuestos.
                    {form.monthlySalary > 0 && <> ({formatMXN(form.monthlySalary)})</>}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Disponibilidad %</Label>
                  <Input type="number" min={0} max={100} value={form.availabilityPercent} onChange={(e) => setForm({ ...form, availabilityPercent: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">% de su jornada dedicado a ESTE proyecto. 100 = tiempo completo; 50 = medio tiempo.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Meses asignados</Label>
                  <Input type="number" min={0} step={0.5} value={form.monthsAssigned} onChange={(e) => setForm({ ...form, monthsAssigned: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">Cuántos meses va a trabajar en el proyecto. Acepta medios (2.5).</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Tipo de contrato</Label>
                <Select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
                  <option value="nomina">Nómina</option>
                  <option value="asimilados">Asimilados a salarios</option>
                  <option value="honorarios">Honorarios</option>
                  <option value="resico_pf">RESICO (persona física)</option>
                  <option value="freelance">Freelance</option>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {CONTRACT_HELP[form.contractType]} Este dato cambia el costo real del perfil (cargas patronales).
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Riesgo de que renuncie (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.turnoverRisk} onChange={(e) => setForm({ ...form, turnoverRisk: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">1 = persona estable y comprometida · 5 = muy probable que deje el proyecto a medias. Sube el riesgo de la estimación.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Supervisión que necesita (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.supervisionRequired} onChange={(e) => setForm({ ...form, supervisionRequired: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">1 = trabaja solo sin revisión · 5 = necesita revisión constante de alguien senior (le quita tiempo al líder).</p>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-1" />Cancelar
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-1" />
                  {editingId ? "Guardar cambios" : "Guardar perfil"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {team.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Aún no hay perfiles. Agregar el primero usando el botón superior.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Salario</TableHead>
                  <TableHead className="text-center">Disponibilidad</TableHead>
                  <TableHead className="text-center">Meses</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{labelOf(ROLE_LABELS, p.role)} <span className="text-muted-foreground text-xs">({labelOf(LEVEL_LABELS, p.level)})</span></TableCell>
                    <TableCell className="text-right">{formatMXN(Number(p.monthlySalary))}</TableCell>
                    <TableCell className="text-center">{p.availabilityPercent}%</TableCell>
                    <TableCell className="text-center">{Number(p.monthsAssigned).toFixed(1)}</TableCell>
                    <TableCell><Badge variant="outline">{labelOf(CONTRACT_LABELS, p.contractType)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(p)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Eliminar">
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
