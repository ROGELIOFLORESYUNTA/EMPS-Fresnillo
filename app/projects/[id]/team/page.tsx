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
import { periciaDelEquipo, PERICIA_ETIQUETAS } from "@/lib/engine/herramientas";
import { FACTOR_DIAS_MES, redondear2, salarioDiarioDesde } from "@/lib/engine/pago";
import { BarraDePasos } from "@/components/barra-de-pasos";
import type { Lado } from "@/lib/lado";
import { Plus, Trash2, Pencil, X, Save, AlertTriangle } from "lucide-react";

interface TeamItem {
  id: string;
  name: string;
  role: string;
  level: string;
  monthlySalary: string | number;
  payBasis: string | null;
  dailyRate: string | number | null;
  availabilityPercent: number;
  monthsAssigned: string | number;
  weeksAssigned: string | number | null;
  isOwner: boolean;
  contractType: string;
  turnoverRisk: number;
  supervisionRequired: number;
  aiSkill: number;
  aiToolUsdMonthly: string | number | null;
}

type BasePago = "mensual" | "diario";

const FORM_DEFAULT = {
  name: "",
  role: "dev_senior",
  level: "mid",
  payBasis: "mensual" as BasePago,
  monthlySalary: 30000,
  dailyRate: 1000,
  availabilityPercent: 100,
  monthsAssigned: 3,
  weeksAssigned: "" as number | "",
  isOwner: false,
  contractType: "nomina",
  turnoverRisk: 2,
  supervisionRequired: 2,
  aiSkill: 3,
  aiToolUsdMonthly: null as number | null,
};

type FormEquipo = typeof FORM_DEFAULT;

/** Las tres maneras de trabajar que se eligen arriba. */
type ModoDeEquipo = "solo" | "mas_personas" | "equipo";

const PILDORAS: { id: ModoDeEquipo; etiqueta: string }[] = [
  { id: "solo", etiqueta: "Yo solo" },
  { id: "mas_personas", etiqueta: "Yo más personas contratadas" },
  { id: "equipo", etiqueta: "Equipo" },
];

const TEXTO_DE_MODO: Record<ModoDeEquipo | "vacio", string> = {
  vacio: "Elige cómo vas a trabajar y armamos el equipo contigo.",
  solo: "Eres la única persona. Tu tiempo cuenta con el contrato Propio: lo que vale tu tiempo, sin IMSS ni impuesto sobre nómina.",
  mas_personas: "Tú y las personas que contratas. Tu tiempo cuenta como Propio y a cada persona contratada, según su contrato.",
  equipo: "Un equipo. Captura a cada persona con su pago y su contrato.",
};

/** Cómo está armado el equipo, a partir de quién lo integra. */
function modoDelEquipo(team: Pick<TeamItem, "isOwner">[]): ModoDeEquipo | null {
  if (team.length === 0) return null;
  const hayDueno = team.some((p) => p.isOwner);
  if (hayDueno && team.length === 1) return "solo";
  if (hayDueno) return "mas_personas";
  return "equipo";
}

const CONTRATOS_BASE = [
  { v: "nomina", t: "Nómina" },
  { v: "asimilados", t: "Asimilados a salarios" },
  { v: "honorarios", t: "Honorarios" },
  { v: "resico_pf", t: "RESICO (persona física)" },
  { v: "freelance", t: "Freelance" },
] as const;

const aNumero = (v: string | number | null | undefined): number => (v === null || v === undefined ? 0 : Number(v));

export default function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [team, setTeam] = useState<TeamItem[]>([]);
  const [avisos, setAvisos] = useState<Record<string, string>>({});
  const [avisoAlGuardar, setAvisoAlGuardar] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormEquipo>({ ...FORM_DEFAULT });
  // Quién mira: la cara del sitio decide si se ofrecen "¿Quién lo hace?" y "Soy yo".
  const [yo, setYo] = useState<{ lado: Lado | null; nombre: string | null }>({ lado: null, nombre: null });
  const [pildoraElegida, setPildoraElegida] = useState<ModoDeEquipo | null>(null);
  const [nota, setNota] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => { refresh(); }, [projectId]);
  useEffect(() => {
    api<{ lado?: Lado; workspace?: { displayName: string | null } | null }>("/api/workspace/me")
      .then((r) => setYo({ lado: r.lado ?? null, nombre: r.workspace?.displayName ?? null }))
      .catch(() => {});
  }, []);

  const esDesarrollador = yo.lado === "desarrollador";
  const modoActual = team.length > 0 ? modoDelEquipo(team) : pildoraElegida;

  async function refresh() {
    const data = await api<{ team: TeamItem[]; avisos?: Record<string, string> }>(`/api/projects/${projectId}/team`);
    setTeam(data.team);
    setAvisos(data.avisos ?? {});
  }

  function formDe(p: TeamItem): FormEquipo {
    const mensual = aNumero(p.monthlySalary);
    return {
      name: p.name,
      role: p.role,
      level: p.level,
      payBasis: p.payBasis === "diario" ? "diario" : "mensual",
      monthlySalary: mensual,
      dailyRate: p.dailyRate != null ? aNumero(p.dailyRate) : redondear2(salarioDiarioDesde(mensual)),
      availabilityPercent: p.availabilityPercent,
      monthsAssigned: aNumero(p.monthsAssigned),
      weeksAssigned: p.weeksAssigned != null ? aNumero(p.weeksAssigned) : "",
      isOwner: !!p.isOwner,
      contractType: p.contractType,
      turnoverRisk: p.turnoverRisk,
      supervisionRequired: p.supervisionRequired,
      aiSkill: p.aiSkill ?? 3,
      aiToolUsdMonthly: p.aiToolUsdMonthly != null ? aNumero(p.aiToolUsdMonthly) : null,
    };
  }

  function startEdit(p: TeamItem) {
    setEditingId(p.id);
    setShowForm(true);
    setForm(formDe(p));
    setError(null);
  }

  function startAdd(sobre: Partial<FormEquipo> = {}) {
    setEditingId(null);
    setShowForm(true);
    setForm({ ...FORM_DEFAULT, ...sobre });
    setError(null);
  }

  function cancelEdit() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...FORM_DEFAULT });
    setError(null);
  }

  /** Lo que se manda al servidor. El sueldo mensual de quien cobra por día es el pago por día por 30.4. */
  function cuerpoDe(f: FormEquipo) {
    const semanas = f.weeksAssigned === "" || Number(f.weeksAssigned) <= 0 ? null : Number(f.weeksAssigned);
    return {
      name: f.name,
      role: f.role,
      level: f.level,
      monthlySalary: f.payBasis === "diario" ? redondear2(f.dailyRate * FACTOR_DIAS_MES) : f.monthlySalary,
      payBasis: f.payBasis,
      dailyRate: f.payBasis === "diario" ? f.dailyRate : null,
      availabilityPercent: f.availabilityPercent,
      monthsAssigned: f.monthsAssigned,
      weeksAssigned: semanas,
      isOwner: f.isOwner,
      contractType: f.contractType,
      turnoverRisk: f.turnoverRisk,
      supervisionRequired: f.supervisionRequired,
      aiSkill: f.aiSkill,
      aiToolUsdMonthly: f.aiToolUsdMonthly,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const respuesta = editingId
        ? await apiPut<{ avisoSalarioMinimo?: string | null }>(`/api/team/${editingId}`, cuerpoDe(form))
        : await apiPost<{ avisoSalarioMinimo?: string | null }>(`/api/projects/${projectId}/team`, cuerpoDe(form));
      setAvisoAlGuardar(respuesta.avisoSalarioMinimo ? `${form.name}: ${respuesta.avisoSalarioMinimo}` : null);
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

  /** Crea a la persona que cotiza: contrato Propio, 75 % de su tiempo y marcada como "yo". */
  async function crearPerfilPropio(): Promise<TeamItem | null> {
    setCreando(true);
    setError(null);
    try {
      const r = await apiPost<{ profile: TeamItem; avisoSalarioMinimo?: string | null }>(`/api/projects/${projectId}/team`, {
        ...cuerpoDe({
          ...FORM_DEFAULT,
          name: yo.nombre?.trim() || "Yo",
          role: "dev_senior",
          level: "senior",
          contractType: "propio",
          availabilityPercent: 75,
          isOwner: true,
          turnoverRisk: 1,
          supervisionRequired: 1,
        }),
      });
      setAvisoAlGuardar(r.avisoSalarioMinimo ? `${r.profile.name}: ${r.avisoSalarioMinimo}` : null);
      await refresh();
      return r.profile;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear tu perfil");
      return null;
    } finally {
      setCreando(false);
    }
  }

  async function elegirPildora(modo: ModoDeEquipo) {
    setPildoraElegida(modo);
    setNota(null);
    if (modo === "solo") {
      if (team.length === 0) {
        const creado = await crearPerfilPropio();
        if (creado) {
          startEdit(creado);
          setNota("Ya quedaste en el equipo. Ajusta lo que vale tu tiempo al mes y las semanas que le dedicas.");
        }
      } else {
        setNota("Para trabajar solo, deja a una sola persona en el equipo y márcala con «Soy yo».");
      }
      return;
    }
    if (modo === "mas_personas") {
      // Tú ya cuentas: se crea tu perfil si el equipo está vacío y luego se agrega a la primera persona contratada.
      if (team.length === 0) {
        const creado = await crearPerfilPropio();
        if (!creado) return;
      }
      startAdd({ contractType: "honorarios", availabilityPercent: 100 });
      setNota("Agrega a la persona que contratas con el contrato que tenga.");
      return;
    }
    startAdd({ contractType: "nomina" });
    setNota("Agrega a cada persona del equipo con su pago y su contrato.");
  }

  const hayDuenoYa = team.some((p) => p.isOwner && p.id !== editingId);
  const opcionesDeContrato = [
    ...CONTRATOS_BASE,
    ...(esDesarrollador || form.contractType === "propio" ? [{ v: "propio", t: "Propio: lo que vale tu tiempo" } as const] : []),
  ];
  const etiquetaDePago = form.contractType === "propio" ? "Lo que vale tu tiempo" : "Sueldo";
  const mensualDelForm = form.payBasis === "diario" ? redondear2(form.dailyRate * FACTOR_DIAS_MES) : form.monthlySalary;

  const hayMasDeUnPerfilAbajoDelMinimo = Object.keys(avisos).length > 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: "Proyecto", href: `/projects/${projectId}` },
        { label: "Equipo" },
      ]} />
      <BarraDePasos projectId={projectId} actual={3} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipo del proyecto</h1>
          <p className="text-muted-foreground text-sm">
            {team.length} persona(s) · las que {esDesarrollador ? "hacen el trabajo" : "el proveedor pone a trabajar"}. Su pago es lo que{" "}
            {esDesarrollador ? "te cuesta cada una" : "el proveedor les paga (su costo)"}, no lo que cobra al cliente.
            {esDesarrollador
              ? " Tu cliente nunca ve esta pantalla."
              : " Si eres del Ayuntamiento y no conoces al equipo, deja uno típico (un desarrollador con experiencia) o pide al proveedor su lista y captúrala aquí."}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => startAdd()}>
            <Plus className="w-4 h-4 mr-2" />Agregar perfil
          </Button>
        )}
      </div>

      {/* ¿Quién lo hace? Solo en la cara del desarrollador. */}
      {esDesarrollador && (
        <section aria-labelledby="quien-lo-hace" className="rounded-lg border bg-card p-5">
          <h2 id="quien-lo-hace" className="text-seccion text-tinta">¿Quién lo hace?</h2>
          <div role="radiogroup" aria-labelledby="quien-lo-hace" className="mt-3 flex flex-wrap gap-2">
            {PILDORAS.map((p) => {
              const activa = modoActual === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  disabled={creando}
                  onClick={() => void elegirPildora(p.id)}
                  className={`min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    activa ? "border-marino bg-marino text-white" : "border-border bg-lienzo text-tinta hover:bg-papel"
                  }`}
                >
                  {p.etiqueta}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-tinta-suave">{TEXTO_DE_MODO[modoActual ?? "vacio"]}</p>
          {nota && <p className="mt-1 text-sm font-medium text-tinta">{nota}</p>}
        </section>
      )}

      {avisoAlGuardar && (
        <p role="status" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{avisoAlGuardar}</span>
        </p>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editingId ? "Editar perfil" : "Nuevo perfil"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Nombre / identificador</Label>
                  <Input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Puesto</Label>
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
                  <Label id="base-de-pago">Cómo se le paga</Label>
                  <div role="radiogroup" aria-labelledby="base-de-pago" className="inline-flex h-10 w-fit self-start overflow-hidden rounded-md border">
                    {([["mensual", "Mensual"], ["diario", "Diario"]] as const).map(([v, t]) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={form.payBasis === v}
                        onClick={() => setForm({ ...form, payBasis: v })}
                        className={`min-h-10 px-4 text-sm font-medium transition-colors ${
                          form.payBasis === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {form.payBasis === "mensual" ? (
                  <div className="grid gap-2">
                    <Label>{etiquetaDePago} mensual (pesos, antes de impuestos)</Label>
                    <Input type="number" min={0} value={form.monthlySalary} placeholder="ej. 30000" onChange={(e) => setForm({ ...form, monthlySalary: +e.target.value })} />
                    <p className="text-xs text-muted-foreground">
                      {form.contractType === "propio"
                        ? "Lo que te pagarías a ti mismo al mes por este trabajo."
                        : "Lo que el proveedor le paga a esta persona al mes, antes de impuestos."}
                      {form.monthlySalary > 0 && <> Son {formatMXN(salarioDiarioDesde(form.monthlySalary))} por día (el mensual entre {FACTOR_DIAS_MES}).</>}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label>{etiquetaDePago} por día (pesos, antes de impuestos)</Label>
                    <Input type="number" min={0} step="any" value={form.dailyRate} placeholder="ej. 1000" onChange={(e) => setForm({ ...form, dailyRate: +e.target.value })} />
                    <p className="text-xs text-muted-foreground">
                      {form.dailyRate > 0
                        ? <>{formatMXN(form.dailyRate)} por {FACTOR_DIAS_MES} días son <strong>{formatMXN(mensualDelForm)}</strong> al mes. El sistema calcula con el mensual.</>
                        : <>El pago por día se multiplica por {FACTOR_DIAS_MES} para sacar el mensual con el que calcula el sistema.</>}
                    </p>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Qué parte de su tiempo dedica al proyecto (%)</Label>
                  <Input type="number" min={0} max={100} value={form.availabilityPercent} onChange={(e) => setForm({ ...form, availabilityPercent: +e.target.value })} />
                  <p className="text-xs text-muted-foreground">
                    % de su jornada dedicado a ESTE proyecto. 100 = tiempo completo; 50 = medio tiempo.
                    {(form.isOwner || form.contractType === "propio") &&
                      " Para quien cotiza su propio tiempo se parte de 75 %: cerca de un tercio de las horas de quien trabaja por su cuenta no se cobra (juntas, propuestas y esperas; OIT, 2025)."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Semanas que participa (opcional)</Label>
                  <Input
                    type="number"
                    min={1}
                    step="any"
                    value={form.weeksAssigned}
                    placeholder="Vacío = todo el proyecto"
                    onChange={(e) => setForm({ ...form, weeksAssigned: e.target.value === "" ? "" : +e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si entra solo unas semanas, el sistema le cuenta solo esas semanas en el precio y en el flujo de efectivo. Vacío es que participa de principio a fin.
                  </p>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Tipo de contrato</Label>
                  <Select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
                    {opcionesDeContrato.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {CONTRACT_HELP[form.contractType]}
                    {form.contractType !== "propio" && " Nómina carga IMSS, INFONAVIT y prestaciones; asimilados solo impuesto sobre nómina; honorarios, RESICO y freelance cuestan lo pactado."}
                  </p>
                </div>
              </div>

              {esDesarrollador && (
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.isOwner}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isOwner: e.target.checked,
                        // Quien cotiza y hace el trabajo cuenta con el contrato Propio, no con nómina.
                        contractType: e.target.checked && form.contractType === "nomina" ? "propio" : form.contractType,
                      })
                    }
                  />
                  <span>
                    <strong>Soy yo</strong>: soy quien cotiza y cobra su propio tiempo.
                    {form.isOwner && hayDuenoYa && <span className="block text-xs text-muted-foreground">Ya hay otra persona marcada como tú: al guardar, la marca pasa a este perfil.</span>}
                  </span>
                </label>
              )}

              <div className="grid gap-2">
                <Label>¿Qué tan probable es que deje el proyecto a medias? (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.turnoverRisk} onChange={(e) => setForm({ ...form, turnoverRisk: +e.target.value })} />
                <p className="text-xs text-muted-foreground">1 = persona estable · 5 = muy probable que se vaya. Entra al factor de riesgo de la estimación: 1 no agrega nada, 5 agrega hasta 30% de horas.</p>
              </div>
              <div className="grid gap-2">
                <Label>¿Qué tanto usa la IA para programar? (1-5)</Label>
                <Select value={String(form.aiSkill)} onChange={(e) => setForm({ ...form, aiSkill: +e.target.value })}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} · {PERICIA_ETIQUETAS[n]}</option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Solo cuenta en las formas de hacerlo con IA (con ayuda de IA, híbrido, casi todo con IA). Los ahorros de la IA están calibrados para el nivel 4;
                  con menos pericia se acredita solo una parte (1: 35 %, 2: 65 %, 3: 85 %) y con 5 un poco más (115 %). Un modelo muy potente en manos de quien no sabe darle instrucciones no ahorra tiempo.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Herramientas de IA que ya paga esta persona (USD al mes, opcional)</Label>
                <Input type="number" min={0} step={1} value={form.aiToolUsdMonthly ?? ""} placeholder="vacío = el nivel elegido en Calcular" onChange={(e) => setForm({ ...form, aiToolUsdMonthly: e.target.value === "" ? null : +e.target.value })} />
                <p className="text-xs text-muted-foreground">
                  En la vida real cada quien trae su plan. Si lo dejas vacío, este asiento cobra el nivel del proyecto (básico, típico o máximo). Si escribes un monto, ese es el que se cobra en todas las formas de hacerlo con IA (0 si no usa ninguna).
                </p>
              </div>
              {/* "Supervision que necesita" se dejo de pedir: el motor nunca lo leyo. Sigue en el esquema. */}
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

      {!showForm && error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {team.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Aún no hay perfiles. {esDesarrollador ? "Elige arriba quién lo hace o agrega el primero con el botón superior." : "Agregar el primero usando el botón superior."}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-center">Disponibilidad</TableHead>
                  <TableHead className="text-center">Semanas</TableHead>
                  <TableHead className="text-center">Usa IA (1-5)</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.isOwner && !/^\s*(yo|tú|tu)\b/i.test(p.name) && <Badge variant="secondary" className="ml-2">Yo</Badge>}
                    </TableCell>
                    <TableCell>{labelOf(ROLE_LABELS, p.role)} <span className="text-muted-foreground text-xs">({labelOf(LEVEL_LABELS, p.level)})</span></TableCell>
                    <TableCell className="text-right">
                      {p.payBasis === "diario" && p.dailyRate != null ? (
                        <>
                          {formatMXN(aNumero(p.dailyRate))} <span className="text-muted-foreground text-xs">por día</span>
                          <span className="block text-[11px] text-muted-foreground">{formatMXN(aNumero(p.monthlySalary))} al mes</span>
                        </>
                      ) : (
                        <>
                          {formatMXN(aNumero(p.monthlySalary))} <span className="text-muted-foreground text-xs">al mes</span>
                        </>
                      )}
                      {avisos[p.id] && (
                        <span className="mt-1 flex items-start justify-end gap-1 text-[11px] text-amber-800">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="max-w-[16rem] text-right">{avisos[p.id]}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{p.availabilityPercent}%</TableCell>
                    <TableCell className="text-center">{p.weeksAssigned != null ? aNumero(p.weeksAssigned).toLocaleString("es-MX", { maximumFractionDigits: 1 }) : <span className="text-muted-foreground text-xs">Todo el proyecto</span>}</TableCell>
                    <TableCell className="text-center">{p.aiSkill ?? 3}{p.aiToolUsdMonthly != null ? <span className="block text-[10px] text-muted-foreground">plan propio {Number(p.aiToolUsdMonthly)} USD</span> : null}</TableCell>
                    <TableCell><Badge variant="outline">{labelOf(CONTRACT_LABELS, p.contractType)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(p)} title="Editar" aria-label={`Editar a ${p.name}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Eliminar" aria-label={`Eliminar a ${p.name}`}>
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
      {hayMasDeUnPerfilAbajoDelMinimo && (
        <p className="text-xs text-muted-foreground">
          El aviso de salario mínimo no impide calcular: es para que lo sepas. El salario mínimo general se toma de los valores de Fuentes.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm">
          <strong>{team.length} persona(s)</strong> · {formatMXN(team.reduce((a, t) => a + aNumero(t.monthlySalary), 0))} al mes en sueldos y pagos; las cuotas del IMSS, INFONAVIT e impuesto sobre nómina se suman al calcular, solo a quien está en nómina.
          {team.length > 0 && <> · Pericia con la IA: <strong>{periciaDelEquipo(team).promedio} de 5</strong> (promedio de los puestos técnicos).</>}
        </p>
        {team.length > 0 ? (
          <Button asChild><Link href={`/projects/${projectId}/estimate`}>Continuar: calcular</Link></Button>
        ) : (
          <p className="text-xs text-muted-foreground">Agrega al menos a una persona para continuar.</p>
        )}
      </div>
    </div>
  );
}
