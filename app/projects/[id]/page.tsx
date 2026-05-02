import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMXN, formatHours, formatWeeks, RISK_LEVELS, DEVELOPMENT_MODES } from "@/lib/utils";
import { FileText, Calculator, Users, Layers, GitPullRequest, TrendingUp, Activity, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { RecalcularButton } from "@/components/recalcular-button";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      modules: { include: { stories: true }, orderBy: { createdAt: "asc" } },
      team: { orderBy: { createdAt: "asc" } },
      estimates: { orderBy: [{ version: "desc" }, { mode: "asc" }, { scenario: "asc" }] },
      changes: { orderBy: { createdAt: "desc" } },
      cashflow: { orderBy: { monthNumber: "asc" } },
    },
  });
  if (!project) notFound();

  // Tomar último (mode, scenario) único — soporta múltiples versiones por modo.
  // Orden lógico: modos de más lento a más rápido, escenarios optimista→probable→conservador.
  const MODE_ORDER: Record<string, number> = {
    traditional: 0,
    ai_assisted: 1,
    hybrid: 2,
    bytecoding_prompts: 3,
    low_code: 4,
  };
  const SCENARIO_ORDER: Record<string, number> = {
    optimistic: 0,
    probable: 1,
    conservative: 2,
  };
  const latestVersion = project.estimates[0]?.version ?? 0;
  const seen = new Set<string>();
  const latestEstimates = project.estimates
    .filter((e) => {
      const key = `${e.mode}__${e.scenario}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const dm = (MODE_ORDER[a.mode] ?? 99) - (MODE_ORDER[b.mode] ?? 99);
      if (dm !== 0) return dm;
      return (SCENARIO_ORDER[a.scenario] ?? 99) - (SCENARIO_ORDER[b.scenario] ?? 99);
    });

  const probableHybrid = latestEstimates.find((e) => e.mode === "hybrid" && e.scenario === "probable");
  const probableTotal = probableHybrid?.total ?? latestEstimates.find((e) => e.scenario === "probable")?.total ?? null;
  const workingCapitalRequired = project.cashflow[0]?.workingCapitalRequired ?? 0;
  const modeLabels = Object.fromEntries(DEVELOPMENT_MODES.map((m) => [m.value, m.label]));

  // Análisis de RANGO entre modos para detectar riesgo de cotización
  // (ej. cotizar barato asumiendo bytecoding pero ejecutar en tradicional → quiebra)
  const probableEstimatesByMode = latestEstimates.filter((e) => e.scenario === "probable");
  const probableTotals = probableEstimatesByMode.map((e) => Number(e.total));
  const minProbable = probableTotals.length > 0 ? Math.min(...probableTotals) : 0;
  const maxProbable = probableTotals.length > 0 ? Math.max(...probableTotals) : 0;
  const rangeMultiplier = minProbable > 0 ? maxProbable / minProbable : 1;
  const cheapestMode = probableEstimatesByMode.find((e) => Number(e.total) === minProbable);
  const mostExpensiveMode = probableEstimatesByMode.find((e) => Number(e.total) === maxProbable);

  // Checklist de progreso
  const tieneDatos = !!project.name && !!project.objective;
  const tieneModulos = project.modules.length > 0;
  const tieneEquipo = project.team.length > 0;
  const tieneEstimacion = project.estimates.length > 0;
  const tieneFlujo = project.cashflow.length > 0;
  const pasos = [
    { n: 1, label: "Datos generales", done: tieneDatos, href: `/projects/${id}` },
    { n: 2, label: "Capturar módulos", done: tieneModulos, href: `/projects/${id}/modules` },
    { n: 3, label: "Capturar equipo", done: tieneEquipo, href: `/projects/${id}/team` },
    { n: 4, label: "Calcular estimación", done: tieneEstimacion, href: `/projects/${id}/estimate` },
    { n: 5, label: "Generar reportes", done: tieneEstimacion && tieneFlujo, href: `/projects/${id}/reports` },
  ];
  const pasosCompletos = pasos.filter((p) => p.done).length;
  const siguientePaso = pasos.find((p) => !p.done);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: project.name },
      ]} />

      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.client} · {project.municipalArea}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{project.status}</Badge>
            <Badge variant="secondary">{project.priority}</Badge>
            <Badge variant="outline">{project.systemType}</Badge>
          </div>
        </div>
      </div>

      {/* Checklist de progreso */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Progreso del proyecto</CardTitle>
              <CardDescription>{pasosCompletos} de {pasos.length} pasos completados</CardDescription>
            </div>
            {siguientePaso && (
              <Button asChild>
                <Link href={siguientePaso.href}>
                  Continuar — {siguientePaso.label} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de progreso */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(pasosCompletos / pasos.length) * 100}%` }}
            />
          </div>

          <ol className="grid sm:grid-cols-5 gap-2">
            {pasos.map((p) => (
              <li key={p.n}>
                <Link
                  href={p.href}
                  className={`block p-3 rounded-md border text-sm transition-colors ${
                    p.done
                      ? "bg-green-50 border-green-200 hover:bg-green-100"
                      : "bg-card hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {p.done ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">Paso {p.n}</span>
                  </div>
                  <p className="font-medium">{p.label}</p>
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Resumen financiero */}
      {probableTotal && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Precio cotizado al cliente"
            value={formatMXN(Number(probableTotal))}
            hint={`Asume modo híbrido · escenario probable · v${latestVersion}. Otros modos abajo.`}
          />
          <SummaryCard
            label="Dinero que necesita el proveedor al inicio"
            value={formatMXN(Number(workingCapitalRequired))}
            hint={`Para pagar a ${project.team.length} persona(s) del equipo durante los meses que pasan entre cada cobro al cliente. Detalle abajo en "Flujo de efectivo".`}
          />
          {rangeMultiplier > 1.5 && cheapestMode && mostExpensiveMode ? (
            <Card className="border-orange-300 bg-orange-50/40">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-orange-800 mb-1 font-semibold flex items-center gap-1">
                  ⚠ Riesgo de cotización
                </p>
                <p className="text-2xl font-bold text-orange-900">{rangeMultiplier.toFixed(1)}× rango</p>
                <p className="text-xs text-orange-800 mt-1">
                  Si cotizas {formatMXN(minProbable)} ({modeLabels[cheapestMode.mode]}) pero ejecutas en {modeLabels[mostExpensiveMode.mode]}, cuesta {formatMXN(maxProbable)}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <SummaryCard
              label="Diferencia entre modos"
              value={`${rangeMultiplier.toFixed(1)}× rango`}
              hint={`Variación moderada entre ${formatMXN(minProbable)} y ${formatMXN(maxProbable)}`}
            />
          )}
          <SummaryCard
            label="Cambios solicitados"
            value={String(project.changes.filter((c) => c.decision === "pendiente").length)}
            hint={`pendientes · de ${project.changes.length} totales`}
          />
        </div>
      )}

      {/* Acciones rápidas */}
      {tieneEstimacion && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link href={`/projects/${id}/modules`}><Layers className="w-4 h-4 mr-2" />Módulos</Link></Button>
          <Button variant="outline" asChild><Link href={`/projects/${id}/team`}><Users className="w-4 h-4 mr-2" />Equipo</Link></Button>
          <Button variant="outline" asChild><Link href={`/projects/${id}/changes`}><GitPullRequest className="w-4 h-4 mr-2" />Cambios</Link></Button>
          <Button variant="outline" asChild><Link href={`/projects/${id}/estimate`}><Calculator className="w-4 h-4 mr-2" />Recalcular</Link></Button>
          <Button asChild><Link href={`/projects/${id}/reports`}><FileText className="w-4 h-4 mr-2" />Ver reportes</Link></Button>
          <RecalcularButton projectId={id} />
        </div>
      )}

      {/* Comparador de modos */}
      {latestEstimates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Comparador de modos · Versión {latestVersion}
            </CardTitle>
            <CardDescription>Última estimación. Compara escenarios optimista, probable y conservador.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modo</TableHead>
                  <TableHead>Escenario</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Semanas</TableHead>
                  <TableHead className="text-right">Prototipo</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Riesgo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestEstimates.map((e) => {
                  const totalHours = Number(e.codingHours) + Number(e.reviewHours) + Number(e.testingHours) + Number(e.documentationHours) + Number(e.deploymentHours) + Number(e.trainingHours) + Number(e.supportHours) + Number(e.hardeningHours) + Number(e.analysisHours) + Number(e.designHours);
                  return (
                    <TableRow key={e.id}>
                      <TableCell><Badge variant="outline">{modeLabels[e.mode] ?? e.mode}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{e.scenario}</Badge></TableCell>
                      <TableCell className="text-right">{formatHours(totalHours)}</TableCell>
                      <TableCell className="text-right">{e.weeksTotal ? formatWeeks(Number(e.weeksTotal)) : "—"}</TableCell>
                      <TableCell className="text-right">{e.weeksToPrototype ? formatWeeks(Number(e.weeksToPrototype)) : "—"}</TableCell>
                      <TableCell className="text-right">{formatMXN(Number(e.subtotal))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatMXN(Number(e.vat))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMXN(Number(e.total))}</TableCell>
                      <TableCell><Badge className={RISK_LEVELS[e.riskLevel as keyof typeof RISK_LEVELS]?.bg}>{e.riskLevel}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Módulos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4" />Módulos ({project.modules.length})
            </CardTitle>
            <CardDescription>Descomposición funcional del alcance.</CardDescription>
          </div>
          <Button size="sm" variant="outline" asChild><Link href={`/projects/${id}/modules`}>Gestionar</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          {project.modules.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Aún no hay módulos. Agregar al menos uno antes de estimar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-center">Complejidad</TableHead>
                  <TableHead className="text-center">Claridad</TableHead>
                  <TableHead className="text-center">Criticidad</TableHead>
                  <TableHead className="text-center">Pantallas</TableHead>
                  <TableHead className="text-center">Reportes</TableHead>
                  <TableHead className="text-center">Integraciones</TableHead>
                  <TableHead>Datos sensibles</TableHead>
                  <TableHead className="text-center">Historias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.modules.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.type}</div>
                    </TableCell>
                    <TableCell className="text-center">{m.complexity}/5</TableCell>
                    <TableCell className="text-center">{m.clarity}/5</TableCell>
                    <TableCell className="text-center">{m.criticality}/5</TableCell>
                    <TableCell className="text-center">{m.screensCount}</TableCell>
                    <TableCell className="text-center">{m.reportsCount}</TableCell>
                    <TableCell className="text-center">{m.integrationsCount}</TableCell>
                    <TableCell>{m.sensitiveData ? <Badge variant="warning">Sí</Badge> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
                    <TableCell className="text-center">{m.stories.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Equipo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />Equipo ({project.team.length})
            </CardTitle>
          </div>
          <Button size="sm" variant="outline" asChild><Link href={`/projects/${id}/team`}>Gestionar</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          {project.team.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Aún no hay perfiles. Agregar al equipo antes de estimar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Rol / Nivel</TableHead>
                  <TableHead className="text-right">Salario mensual</TableHead>
                  <TableHead className="text-center">Disponibilidad</TableHead>
                  <TableHead className="text-center">Meses</TableHead>
                  <TableHead>Contrato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.team.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.role} <span className="text-muted-foreground">({p.level})</span></TableCell>
                    <TableCell className="text-right">{formatMXN(Number(p.monthlySalary))}</TableCell>
                    <TableCell className="text-center">{p.availabilityPercent}%</TableCell>
                    <TableCell className="text-center">{Number(p.monthsAssigned).toFixed(1)}</TableCell>
                    <TableCell><Badge variant="outline">{p.contractType}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cambios */}
      {project.changes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <GitPullRequest className="w-4 h-4" />Cambios ({project.changes.length})
              </CardTitle>
            </div>
            <Button size="sm" variant="outline" asChild><Link href={`/projects/${id}/changes`}>Gestionar</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Impacto horas</TableHead>
                  <TableHead className="text-right">Impacto costo</TableHead>
                  <TableHead>Decisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.changes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                    <TableCell>{c.requesterName}</TableCell>
                    <TableCell className="max-w-md truncate" title={c.description}>{c.description}</TableCell>
                    <TableCell className="text-right">{c.timeImpactHours ? Number(c.timeImpactHours).toFixed(0) : "—"}</TableCell>
                    <TableCell className="text-right">{c.costImpact ? formatMXN(Number(c.costImpact)) : "—"}</TableCell>
                    <TableCell><Badge variant={c.decision === "aceptado" ? "success" : c.decision === "rechazado" ? "destructive" : "outline"}>{c.decision}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Flujo de efectivo */}
      {project.cashflow.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />Flujo de efectivo del proyecto (modo híbrido · escenario probable)
            </CardTitle>
            <CardDescription>
              Mes a mes: lo que entra del cliente vs lo que sale en nómina/impuestos/herramientas/admin.
              <br />
              <strong className="text-foreground">Capital de trabajo requerido: {formatMXN(Number(project.cashflow[0].workingCapitalRequired))}</strong> — es el saldo MÁS NEGATIVO acumulado, o sea, cuánto dinero debe tener el proveedor antes de empezar para no quebrarse.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead className="text-right">Nómina</TableHead>
                  <TableHead className="text-right">Impuestos</TableHead>
                  <TableHead className="text-right">Herramientas</TableHead>
                  <TableHead className="text-right">Admin</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.cashflow.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>Mes {m.monthNumber}</TableCell>
                    <TableCell className="text-right text-green-700">{formatMXN(Number(m.income))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMXN(-Number(m.payrollOutflow))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMXN(-Number(m.taxOutflow))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMXN(-Number(m.toolsOutflow))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMXN(-Number(m.adminOutflow))}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(m.netFlow) >= 0 ? "text-green-700" : "text-destructive"}`}>{formatMXN(Number(m.netFlow))}</TableCell>
                    <TableCell className={`text-right ${Number(m.accumulatedFlow) >= 0 ? "" : "text-destructive font-medium"}`}>{formatMXN(Number(m.accumulatedFlow))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground uppercase mb-1 tracking-wide">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
