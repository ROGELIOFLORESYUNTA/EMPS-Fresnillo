import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMXN, formatHours, formatWeeks, RISK_LEVELS, DEVELOPMENT_MODES, STATUS_LABELS, PRIORITY_LABELS, SYSTEM_TYPE_LABELS, SCENARIO_LABELS, CONTRACT_LABELS, ROLE_LABELS, LEVEL_LABELS, labelOf } from "@/lib/utils";
import { FileText, Calculator, Users, Layers, GitPullRequest, TrendingUp, Activity, CheckCircle2, Circle, ArrowRight, ClipboardCheck } from "lucide-react";
import { RecalcularButton } from "@/components/recalcular-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ModeScenarioSelector } from "@/components/mode-scenario-selector";
import { InfoTip } from "@/components/info-tip";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; scenario?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const selectedMode = sp.mode ?? "hybrid";
  const selectedScenario = sp.scenario ?? "probable";
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
  // FASE G.I: aislamiento por workspace. Si el proyecto no es template y pertenece
  // a otro workspace, devolver 404 para no exponer datos cruzados.
  if (!project.isTemplate && project.workspaceId) {
    const { getCurrentWorkspaceId } = await import("@/lib/workspace");
    const myWorkspace = await getCurrentWorkspaceId();
    if (project.workspaceId !== myWorkspace) notFound();
  }

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
  // FASE H — Resultado real capturado (sin back-relation en Project, query aparte).
  // Sirve para retroalimentar el modelo y medir precisión (estimado vs real).
  const actualResult = await prisma.projectActualResult.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  const probableEstimate =
    project.estimates.find((e) => e.scenario === "probable") ?? project.estimates[0];
  const estHoursTotal = probableEstimate
    ? Number(probableEstimate.analysisHours) + Number(probableEstimate.designHours) +
      Number(probableEstimate.codingHours) + Number(probableEstimate.reviewHours) +
      Number(probableEstimate.testingHours) + Number(probableEstimate.documentationHours) +
      Number(probableEstimate.deploymentHours) + Number(probableEstimate.trainingHours) +
      Number(probableEstimate.supportHours) + Number(probableEstimate.hardeningHours)
    : 0;
  const estCostTotal = probableEstimate ? Number(probableEstimate.total) : 0;
  const realHours = actualResult?.actualEffortHours != null ? Number(actualResult.actualEffortHours) : null;
  const realCost = actualResult?.actualTotalCostMxn != null ? Number(actualResult.actualTotalCostMxn) : null;
  const mapeHoursReal = realHours && realHours > 0 ? (Math.abs(estHoursTotal - realHours) / realHours) * 100 : null;
  const mapeCostReal = realCost && realCost > 0 ? (Math.abs(estCostTotal - realCost) / realCost) * 100 : null;
  const mostrarResultadoReal = project.status === "en_ejecucion" || project.status === "cerrado" || project.status === "archivado" || !!actualResult;

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

  // Estimación seleccionada por el usuario via searchParams (default: hybrid + probable).
  const selectedEstimate = latestEstimates.find((e) => e.mode === selectedMode && e.scenario === selectedScenario)
    ?? latestEstimates.find((e) => e.mode === "hybrid" && e.scenario === "probable")
    ?? latestEstimates.find((e) => e.scenario === "probable")
    ?? latestEstimates[0];
  const selectedTotal = selectedEstimate?.total ?? null;
  const workingCapitalRequired = project.cashflow[0]?.workingCapitalRequired ?? 0;
  const modeLabels = Object.fromEntries(DEVELOPMENT_MODES.map((m) => [m.value, m.label]));
  const scenarioLabels: Record<string, string> = {
    optimistic: "optimista",
    probable: "probable",
    conservative: "conservador",
  };

  // Análisis comparativo entre modos para detectar el riesgo de cotizar barato y ejecutar caro.
  // (ej. cotizar barato asumiendo bytecoding pero ejecutar en tradicional → quiebra)
  const probableEstimatesByMode = latestEstimates.filter((e) => e.scenario === "probable");
  const probableTotals = probableEstimatesByMode.map((e) => Number(e.total));
  const minProbable = probableTotals.length > 0 ? Math.min(...probableTotals) : 0;
  const maxProbable = probableTotals.length > 0 ? Math.max(...probableTotals) : 0;
  const rangeMultiplier = minProbable > 0 ? maxProbable / minProbable : 1;
  const cheapestMode = probableEstimatesByMode.find((e) => Number(e.total) === minProbable);
  const mostExpensiveMode = probableEstimatesByMode.find((e) => Number(e.total) === maxProbable);

  // Mes donde se materializa el bache de caja (saldo acumulado más bajo)
  const worstAccumulated = project.cashflow.length > 0
    ? project.cashflow.reduce((worst, m) => Number(m.accumulatedFlow) < Number(worst.accumulatedFlow) ? m : worst, project.cashflow[0])
    : null;
  const bacheVsPrecioPct = selectedTotal && Number(workingCapitalRequired) > 0
    ? (Number(workingCapitalRequired) / Number(selectedTotal)) * 100
    : 0;

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
          <p className="text-muted-foreground">Cliente: {project.client} · {project.municipalArea}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{labelOf(STATUS_LABELS, project.status)}</Badge>
            <Badge variant="secondary">Prioridad {labelOf(PRIORITY_LABELS, project.priority).toLowerCase()}</Badge>
            <Badge variant="outline">{labelOf(SYSTEM_TYPE_LABELS, project.systemType)}</Badge>
          </div>
        </div>
      </div>

      {/* Acerca de este proyecto — campos capturados en /projects/new que
          antes no se mostraban (description, targetDate, estimatedBudget, responsable, objective). */}
      {(project.description || project.objective || project.targetDate || project.estimatedBudget || project.responsible || project.notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acerca de este proyecto</CardTitle>
            <CardDescription>Lo que se registró cuando se creó el proyecto. Para cambiarlo, editar el proyecto.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {project.objective && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Objetivo</p>
                <p className="mt-0.5">{project.objective}</p>
              </div>
            )}
            {project.description && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Descripción</p>
                <p className="mt-0.5 whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            {project.responsible && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Responsable</p>
                <p className="mt-0.5">{project.responsible}</p>
              </div>
            )}
            {project.targetDate && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Fecha objetivo</p>
                <p className="mt-0.5">{new Date(project.targetDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            )}
            {project.estimatedBudget != null && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Presupuesto inicial estimado
                  <InfoTip title="¿Por qué muestra esto?">
                    Es el monto que se registró al crear el proyecto, antes de cualquier estimación detallada. Sirve como referencia para comparar contra el "Precio cotizado al cliente" que sale del motor (abajo). Si difieren mucho, hay que entender por qué.
                  </InfoTip>
                </p>
                <p className="mt-0.5 font-mono">{formatMXN(Number(project.estimatedBudget))}</p>
              </div>
            )}
            {project.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Notas</p>
                <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{project.notes}</p>
              </div>
            )}
            <div className="sm:col-span-2 pt-2 mt-1 border-t border-dashed">
              <p className="text-xs text-amber-800">
                <strong>Aún no se captura:</strong> los términos del acuerdo con el cliente (% de anticipo, % de pagos parciales, % de pago final y plazo pactado). Mientras tanto, el flujo de efectivo se calcula con valores típicos. Puedes ajustarlos al correr la estimación.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado real del proyecto (FASE H). Aparece cuando el proyecto está en
          ejecución o cerrado, o si ya hay un resultado capturado. Alimenta la
          validación de la hipótesis (estimado vs real). */}
      {mostrarResultadoReal && (
        <Card className={actualResult ? "border-green-200 bg-green-50/40" : "border-amber-200 bg-amber-50/40"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Resultado real del proyecto
            </CardTitle>
            <CardDescription>
              {actualResult
                ? "Lo que costó y tardó de verdad. Esto retroalimenta el modelo y mide qué tan bien estimó el sistema."
                : "Cuando el proyecto termine, registra aquí las horas y el costo reales. Con esto el sistema mide su propia precisión y alimenta la validación de la hipótesis para tu investigación."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actualResult ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Horas estimadas</p>
                    <p className="mt-0.5 font-mono">{estHoursTotal > 0 ? formatHours(estHoursTotal) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Horas reales</p>
                    <p className="mt-0.5 font-mono">{realHours != null ? formatHours(realHours) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Costo estimado</p>
                    <p className="mt-0.5 font-mono">{estCostTotal > 0 ? formatMXN(estCostTotal) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Costo real</p>
                    <p className="mt-0.5 font-mono">{realCost != null ? formatMXN(realCost) : "—"}</p>
                  </div>
                </div>
                {(mapeHoursReal != null || mapeCostReal != null) && (
                  <div className="flex flex-wrap gap-2">
                    {mapeHoursReal != null && (
                      <Badge variant={mapeHoursReal <= 15 ? "default" : mapeHoursReal <= 30 ? "secondary" : "outline"}>
                        Error en horas: {mapeHoursReal.toFixed(1)}% {mapeHoursReal <= 15 ? "(preciso)" : mapeHoursReal <= 30 ? "(aceptable)" : "(impreciso)"}
                      </Badge>
                    )}
                    {mapeCostReal != null && (
                      <Badge variant={mapeCostReal <= 15 ? "default" : mapeCostReal <= 30 ? "secondary" : "outline"}>
                        Error en costo: {mapeCostReal.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                )}
                {actualResult.mainDeviationReason && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Razón de la desviación:</span> {actualResult.mainDeviationReason}
                  </p>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/projects/${id}/resultado-real`}>Editar resultado real</Link>
                </Button>
              </div>
            ) : (
              <Button asChild>
                <Link href={`/projects/${id}/resultado-real`}>
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Registrar resultado real
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Banner de perspectiva. Esta pantalla muestra TODO desde el lado del proveedor.
          Para ver el proyecto redactado para otra audiencia (cliente o investigador)
          el sistema genera reportes separados. */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">P</div>
        <div className="flex-1 min-w-[260px]">
          <p className="font-medium text-blue-900">Estás viendo este proyecto como <strong>Proveedor de software</strong></p>
          <p className="text-xs text-blue-800">
            Las cifras hablan desde tu lado: lo que cobras, lo que pagas y el dinero que tienes que adelantar antes de que el cliente ({project.client}) te liquide. Los reportes redactan los mismos números para las otras audiencias.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/projects/${id}/reports/municipal`}>Ver versión para Ayuntamiento</Link>
        </Button>
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
                  Continuar a {siguientePaso.label} <ArrowRight className="w-4 h-4 ml-2" />
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

      {/* Selector de modo + escenario */}
      {selectedTotal && (
        <ModeScenarioSelector currentMode={selectedMode} currentScenario={selectedScenario} />
      )}

      {/* Resumen financiero */}
      {selectedTotal && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Precio cotizado al cliente"
            value={formatMXN(Number(selectedTotal))}
            hint={`Modo ${modeLabels[selectedMode] ?? selectedMode} · escenario ${scenarioLabels[selectedScenario] ?? selectedScenario} · v${latestVersion}. Cambia arriba para ver otros modos.`}
            info={{
              title: "¿De dónde sale este precio?",
              body: (
                <>
                  <strong>Costo del equipo</strong> durante los meses reales del modo elegido (sueldo + IMSS + INFONAVIT + ISN/UAZ + prestaciones LFT). Si el proyecto pasa de 6 meses con personal en nómina, suma indemnización LFT por terminación de contrato.
                  <br /><br />
                  Sobre ese costo se aplica el margen objetivo y el IVA 16%. Cambia el modo arriba: el precio sube o baja porque cada modo tarda distinto.
                  <br /><br />
                  Fuente: motor de cálculo, parámetros 2026 (DOF, CONASAMI, IMSS, SEFIN Zacatecas).
                </>
              ),
            }}
          />
          <SummaryCard
            label={worstAccumulated ? `Te van a deber en el mes ${worstAccumulated.monthNumber}` : "Dinero que tendrás que adelantar"}
            value={formatMXN(Number(workingCapitalRequired))}
            hint={
              worstAccumulated
                ? `Ese mes ya pagaste 3 meses al equipo pero el cliente todavía no te terminó de pagar. Equivale al ${bacheVsPrecioPct.toFixed(0)}% del precio total. Te recuperas al cobrar el último pago en el mes ${project.cashflow.length}.`
                : `Antes de cobrar el último pago del cliente, vas a estar adelantando este dinero de tu bolsa para pagar al equipo.`
            }
            info={{
              title: "¿Qué significa esta cifra?",
              body: (
                <>
                  <p><strong>NO es el costo total del proyecto.</strong> Es el peor momento del flujo de caja para el proveedor.</p>
                  <p>Pasa así: el cliente te paga un anticipo al inicio, después algunos pagos parciales, y al final el pago de cierre. Tú pagas al equipo cada mes desde el día uno. En algún mes los pagos del cliente no te alcanzan para cubrir lo que ya gastaste. Ese mes es el peor.</p>
                  <p><strong>Por qué importa:</strong> si no tienes este dinero en banco al arrancar, te quedas sin liquidez a mitad del proyecto y no puedes pagar al equipo, aunque al final del proyecto el cliente te pague todo.</p>
                  <p><strong>Para reducirlo:</strong> pedir más anticipo, fragmentar el contrato en pagos parciales mensuales, reducir tamaño del equipo, o cobrar antes contra entregables.</p>
                  <p className="text-[10px]">Concepto contable: capital de trabajo. Lenguaje empresarial: Konfío y BBVA México (PyMEs).</p>
                </>
              ),
            }}
          />
          {cheapestMode && mostExpensiveMode && cheapestMode.mode !== mostExpensiveMode.mode ? (
            rangeMultiplier > 1.5 ? (
              <Card className="border-orange-300 bg-orange-50/40">
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wide text-orange-800 mb-1 font-semibold flex items-center gap-1">
                    <span>⚠ Riesgo de cotización</span>
                    <InfoTip title="¿Por qué hay riesgo?">
                      <p>Compara los precios del MISMO proyecto en dos modos de desarrollo distintos. El número de arriba es el factor: el modo más caro vale tantas veces el más barato.</p>
                      <p>Si es alto (&gt;1.5×), una mala elección de modo cambia mucho el costo. <strong>Cotizar como bytecoding y ejecutar como tradicional puede llevar al proveedor a quiebra</strong>.</p>
                      <p><strong>Recomendación:</strong> cotiza al cliente con el modo que realmente vas a usar. Si vas a usar bytecoding, presenta evidencia de pruebas de calidad; si vas a usar tradicional, justifícalo.</p>
                    </InfoTip>
                  </p>
                  <p className="text-2xl font-bold text-orange-900">{rangeMultiplier.toFixed(1)}×</p>
                  <p className="text-xs text-orange-900 mt-1 leading-snug">
                    <strong>{modeLabels[mostExpensiveMode.mode]}</strong>: {formatMXN(maxProbable)}<br />
                    <strong>{modeLabels[cheapestMode.mode]}</strong>: {formatMXN(minProbable)}<br />
                    <span className="text-orange-800">El más caro vale {rangeMultiplier.toFixed(1)} veces el más barato.</span>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <SummaryCard
                label="Comparación entre modos"
                value={`${rangeMultiplier.toFixed(1)}× brecha`}
                hint={`${modeLabels[mostExpensiveMode.mode]} (${formatMXN(maxProbable)}) vs ${modeLabels[cheapestMode.mode]} (${formatMXN(minProbable)}). Brecha baja, la elección de modo no es crítica.`}
                info={{
                  title: "Comparación entre modos",
                  body: (
                    <p>Factor entre el precio probable del modo más caro y el más barato. Cuando es bajo (&lt;1.5×) la elección del modo no es crítica para el costo total.</p>
                  ),
                }}
              />
            )
          ) : (
            <SummaryCard
              label="Comparación entre modos"
              value="Solo 1 modo"
              hint="Aún no hay estimaciones en otros modos para comparar. Corre la estimación en otro modo para ver la brecha de costo y decidir mejor."
              info={{
                title: "¿Por qué no hay comparación?",
                body: (
                  <p>Esta tarjeta compara el precio del mismo proyecto bajo dos modos de desarrollo distintos (ej. tradicional vs bytecoding). Solo hay 1 estimación probable registrada hoy, así que no se puede comparar. Genera una estimación adicional en otro modo para ver la diferencia.</p>
                ),
              }}
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
                  <TableHead className="text-right">
                    Prototipo
                    <InfoTip title="¿Qué es el prototipo?">
                      Semanas para tener una PRIMERA versión funcionando que ya se puede enseñar al área usuaria. El resto de las semanas se usa en terminar, probar y endurecer el sistema.
                    </InfoTip>
                  </TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>
                    Riesgo
                    <InfoTip title="¿De dónde sale el riesgo?">
                      Combina 5 factores del proyecto: qué tan complejo es técnicamente, qué tan claros están los requisitos, el riesgo fiscal-laboral del equipo, el riesgo de flujo de efectivo y la probabilidad de cambios. Bajo = todo en orden; Crítico = varios factores altos a la vez. Para bajarlo: aclara los requisitos (claridad de los módulos), estabiliza al equipo y pacta anticipos suficientes.
                    </InfoTip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestEstimates.map((e) => {
                  const totalHours = Number(e.codingHours) + Number(e.reviewHours) + Number(e.testingHours) + Number(e.documentationHours) + Number(e.deploymentHours) + Number(e.trainingHours) + Number(e.supportHours) + Number(e.hardeningHours) + Number(e.analysisHours) + Number(e.designHours);
                  return (
                    <TableRow key={e.id}>
                      <TableCell><Badge variant="outline">{modeLabels[e.mode] ?? e.mode}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{labelOf(SCENARIO_LABELS, e.scenario)}</Badge></TableCell>
                      <TableCell className="text-right">{formatHours(totalHours)}</TableCell>
                      <TableCell className="text-right">{e.weeksTotal ? formatWeeks(Number(e.weeksTotal)) : "—"}</TableCell>
                      <TableCell className="text-right">{e.weeksToPrototype ? formatWeeks(Number(e.weeksToPrototype)) : "—"}</TableCell>
                      <TableCell className="text-right">{formatMXN(Number(e.subtotal))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatMXN(Number(e.vat))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMXN(Number(e.total))}</TableCell>
                      <TableCell><Badge className={RISK_LEVELS[e.riskLevel as keyof typeof RISK_LEVELS]?.bg}>{RISK_LEVELS[e.riskLevel as keyof typeof RISK_LEVELS]?.label ?? e.riskLevel}</Badge></TableCell>
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
              <Layers className="w-4 h-4" />Qué se va a construir ({project.modules.length} módulos)
            </CardTitle>
            <CardDescription className="max-w-3xl mt-1">
              Cada módulo es una pieza del sistema que el proveedor va a entregar. Los números de cada columna NO son costos. Son características técnicas que TÚ capturas y que el motor usa para calcular cuántas horas tomará construir todo.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/projects/${id}/modules`}>Agregar / editar módulos</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {project.modules.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Aún no hay módulos. Agregar al menos uno antes de estimar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center">
                      Complejidad
                      <InfoTip title="Complejidad técnica (1-5)">
                        <p>Qué tan difícil es construir el módulo. <strong>1</strong> = formulario simple, <strong>5</strong> = lógica de negocio compleja con muchas reglas y excepciones.</p>
                        <p>El motor multiplica las horas base por este número. Subir de 3 a 5 puede duplicar el costo del módulo.</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center">
                      Claridad
                      <InfoTip title="Claridad del requisito (1-5)">
                        <p>Qué tan claro es lo que el cliente pidió. <strong>1</strong> = solo una frase suelta, <strong>5</strong> = requisito con criterios de aceptación validados.</p>
                        <p>Si la claridad es baja, el motor agrega tiempo extra porque va a haber idas y vueltas con el cliente.</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center">
                      Criticidad
                      <InfoTip title="Criticidad operativa (1-5)">
                        <p>Qué tan grave es si el módulo falla en producción. <strong>1</strong> = puede esperar al día siguiente, <strong>5</strong> = corte de servicio crítico al ciudadano.</p>
                        <p>A mayor criticidad, el motor agrega más pruebas y revisión para reducir el riesgo de errores.</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center">
                      Pantallas
                      <InfoTip title="Cantidad de pantallas">
                        <p>Cuántas pantallas distintas verá el usuario en este módulo (formularios, listados, dashboards).</p>
                        <p>Cada pantalla suma ~16 horas de trabajo (diseño + frontend + validación + pruebas + accesibilidad).</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center">
                      Reportes
                      <InfoTip title="Cantidad de reportes">
                        <p>Cuántos reportes salen de este módulo (PDF, Excel, tableros).</p>
                        <p>Cada reporte suma ~24 horas (consulta a la base de datos + filtros + formato + permisos).</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center">
                      Integraciones
                      <InfoTip title="Integraciones externas">
                        <p>Cuántos sistemas externos toca este módulo (banco, SAT, padrón, otras dependencias).</p>
                        <p>Cada integración suma ~50 horas porque implica autenticación, contratos de datos, manejo de errores y pruebas con el sistema externo.</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center">
                      Datos sensibles
                      <InfoTip title="¿Maneja datos personales o financieros?">
                        <p>Marcar como sí si el módulo guarda CURP, RFC, datos bancarios, salud o cualquier dato personal del ciudadano.</p>
                        <p>Activa overhead de cumplimiento legal (LGPDPPSO para Ayuntamiento, LFPDPPP para proveedor): aviso de privacidad, derechos ARCO, bitácora.</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center">
                      Historias
                      <InfoTip title="Historias de usuario detalladas">
                        <p>Cuántas historias de usuario tiene este módulo escritas (formato &quot;Como [rol] necesito [acción] para [beneficio]&quot;).</p>
                        <p>No afectan el cálculo directamente, pero son indicador de qué tan documentado está el alcance.</p>
                      </InfoTip>
                    </span>
                  </TableHead>
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
              <Users className="w-4 h-4" />Quién va a trabajar ({project.team.length} {project.team.length === 1 ? "persona" : "personas"})
            </CardTitle>
            <CardDescription className="max-w-3xl mt-1">
              Personas que el proveedor asigna al proyecto. El salario, tipo de contrato y meses asignados se usan para calcular el costo real con IMSS, ISN, prestaciones y posibles indemnizaciones LFT.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/projects/${id}/team`}>Agregar / editar personas</Link>
          </Button>
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
                    <TableCell>{labelOf(ROLE_LABELS, p.role)} <span className="text-muted-foreground">({labelOf(LEVEL_LABELS, p.level)})</span></TableCell>
                    <TableCell className="text-right">{formatMXN(Number(p.monthlySalary))}</TableCell>
                    <TableCell className="text-center">{p.availabilityPercent}%</TableCell>
                    <TableCell className="text-center">{Number(p.monthsAssigned).toFixed(1)}</TableCell>
                    <TableCell><Badge variant="outline">{labelOf(CONTRACT_LABELS, p.contractType)}</Badge></TableCell>
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
                <GitPullRequest className="w-4 h-4" />Solicitudes de cambio ({project.changes.length})
              </CardTitle>
              <CardDescription className="max-w-3xl mt-1">
                Cambios que el cliente pidió a mitad del proyecto. Cada uno se evalúa con la calculadora de impacto para decidir si entra en garantía, si requiere cotización adicional, o si cambia lo pactado en el contrato.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/projects/${id}/changes`}>Ver y evaluar cambios</Link>
            </Button>
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
      {project.cashflow.length > 0 && (() => {
        const incomes = project.cashflow.map((m) => Number(m.income));
        const maxIncome = Math.max(...incomes);
        const firstMaxIdx = incomes.indexOf(maxIncome);
        const lastMaxIdx = incomes.lastIndexOf(maxIncome);
        const worstAccIdx = project.cashflow.reduce((bestIdx, m, idx) => Number(m.accumulatedFlow) < Number(project.cashflow[bestIdx].accumulatedFlow) ? idx : bestIdx, 0);
        const cashflowMonths = project.cashflow.length;
        const intermediatePayments = project.cashflow.filter((m, i) => i !== firstMaxIdx && i !== lastMaxIdx && Number(m.income) > 0).length;
        const totalPayments = project.cashflow.filter((m) => Number(m.income) > 0).length;
        const selectedWeeks = selectedEstimate?.weeksTotal ? Number(selectedEstimate.weeksTotal) : null;
        const selectedMonthsFromWeeks = selectedWeeks ? selectedWeeks / 4.33 : null;
        const cashflowVsEstimateMismatch = selectedMonthsFromWeeks !== null && Math.abs(selectedMonthsFromWeeks - cashflowMonths) > 1.0;
        function conceptoDelMes(idx: number, income: number) {
          if (income === 0) return { label: "Sin cobro", className: "text-muted-foreground", icon: "—" };
          if (idx === firstMaxIdx && idx !== lastMaxIdx) return { label: "Anticipo (cobro)", className: "text-blue-700 font-medium", icon: "↓" };
          if (idx === lastMaxIdx && lastMaxIdx !== firstMaxIdx) return { label: "Pago final (cobro)", className: "text-emerald-700 font-medium", icon: "↓" };
          if (idx === firstMaxIdx && idx === lastMaxIdx) return { label: "Pago único (cobro)", className: "text-emerald-700 font-medium", icon: "↓" };
          return { label: "Pago parcial (cobro)", className: "text-foreground", icon: "↓" };
        }
        return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />Flujo de efectivo · {modeLabels[selectedMode] ?? selectedMode} · escenario {scenarioLabels[selectedScenario] ?? selectedScenario}
              <InfoTip title="¿Por qué este modo y escenario?">
                <p>Este flujo está calculado sobre la última estimación con modo <strong>{modeLabels[selectedMode] ?? selectedMode}</strong> y escenario <strong>{scenarioLabels[selectedScenario] ?? selectedScenario}</strong>.</p>
                <p>El default es <strong>híbrido + probable</strong> porque es la línea base realista: combina capacidades humanas con asistencia generativa, sin asumir productividades extremas que pueden no cumplirse.</p>
                <p>Si cambias el selector arriba, los precios de las tarjetas se ajustan, pero <strong>esta tabla y el bache se mantienen</strong> hasta que recalcules el proyecto en esa otra configuración.</p>
              </InfoTip>
            </CardTitle>
            <CardDescription>
              Cómo entra y sale el dinero del proveedor mes a mes. Los <strong>cobros al cliente</strong> son ingresos (todos en verde con flecha ↓ porque son dinero que ENTRA al proveedor). Las <strong>salidas</strong> son nómina del equipo, impuestos, herramientas y administración.
              <br />
              <span className="block mt-1">
                <strong className="text-foreground">Estructura de pagos de este proyecto:</strong> {totalPayments} cobros en total: 1 anticipo al arrancar, {intermediatePayments} {intermediatePayments === 1 ? "pago parcial intermedio" : "pagos parciales intermedios"} y 1 pago final al cerrar. Distribuidos en <strong>{cashflowMonths} meses</strong>.
                <InfoTip title="¿Por qué está en meses y no en semanas? ¿Por qué pagos parciales mensuales?">
                  <p>El flujo de efectivo se modela en MESES porque los ciclos de nómina, impuestos (IMSS, ISN), facturación y rentas administrativas son mensuales. Las {selectedWeeks ? `${selectedWeeks.toFixed(1)} semanas` : "semanas"} de calendario del modo se convierten a meses dividiendo entre 4.33.</p>
                  <p>Los <strong>pagos parciales</strong> entre el anticipo y el pago final se asumen <strong>mensuales</strong> por defecto del modelo. Esto refleja la práctica común en contratos municipales (estimación mensual contra avance, art. 54 LOPSRM). Si tu contrato real es a 3 pagos totales (anticipo + 1 intermedio + finiquito) o anticipo + finiquito, eso se configura en el wizard de estimación con los porcentajes.</p>
                </InfoTip>
              </span>
              {cashflowVsEstimateMismatch && selectedMonthsFromWeeks !== null && (
                <span className="block mt-2 p-2 rounded border border-amber-300 bg-amber-50 text-amber-900 text-xs">
                  ⚠ <strong>El cashflow no coincide con la duración de este modo:</strong> el modo {modeLabels[selectedMode]} tarda ~{selectedMonthsFromWeeks.toFixed(1)} meses según la estimación, pero esta tabla está calculada para {cashflowMonths} meses. El cashflow se generó una sola vez con la duración del wizard. Para sincronizarlo, recalcula el proyecto eligiendo este modo.
                </span>
              )}
              <br />
              <strong className="text-foreground">Bache de caja máximo: {formatMXN(Number(project.cashflow[0].workingCapitalRequired))}</strong> {worstAccumulated && (
                <>(aparece en el mes <strong>{worstAccumulated.monthNumber}</strong>, marcado abajo). Es el saldo más profundo en negativo: lo que el proveedor debe tener en banco antes de arrancar.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center">
                      Concepto
                      <InfoTip title="¿Cómo se etiqueta cada mes?">
                        <p>Todas las filas con flecha <strong>↓</strong> son <strong>cobros que el proveedor recibe del cliente</strong> (dinero que entra). El sistema mira el monto y asigna:</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li><strong>Anticipo (cobro)</strong>: el primer mes con el cobro más alto. Es el pago inicial al arrancar.</li>
                          <li><strong>Pago final (cobro)</strong>: el último mes con el cobro más alto. Es el pago de cierre cuando se entrega. Aquí lo nombramos "Pago final" en lugar de "Finiquito" porque finiquito en español también significa liquidación al trabajador, y el pago aquí es del CLIENTE al PROVEEDOR.</li>
                          <li><strong>Pago parcial (cobro)</strong>: meses intermedios donde el cliente paga contra avance. Se asume mensual por defecto del modelo (práctica común en contratos municipales). Si tu contrato es a 2 pagos totales, ajusta los % en el wizard.</li>
                          <li><strong>Sin cobro</strong>: meses sin ingreso del cliente. El proveedor solo paga (nómina, impuestos, etc.).</li>
                        </ul>
                        <p>En este proyecto el patrón es {firstMaxIdx === lastMaxIdx ? "un solo pago grande" : `anticipo + ${intermediatePayments} pago${intermediatePayments === 1 ? "" : "s"} parcial${intermediatePayments === 1 ? "" : "es"} + pago final`}, por eso las etiquetas quedan en esa posición.</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Cobro al cliente</TableHead>
                  <TableHead className="text-right">Nómina</TableHead>
                  <TableHead className="text-right">Impuestos</TableHead>
                  <TableHead className="text-right">Herramientas</TableHead>
                  <TableHead className="text-right">Admin</TableHead>
                  <TableHead className="text-right">Saldo del mes</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center">
                      Saldo acumulado
                      <InfoTip title="¿Cómo se acumula?">
                        <p><strong>Saldo acumulado del mes N = Saldo acumulado del mes N-1 + Saldo del mes N.</strong></p>
                        <p>O sea: cada mes arrastra el resultado del anterior. Si en el mes 1 el saldo acumulado quedó en $50,000 y en el mes 2 el saldo del mes fue de $20,000, entonces el acumulado del mes 2 es $70,000 (el sistema ya lo sumó por ti — la columna "Operación" lo escribe explícito para que lo verifiques sin calculadora).</p>
                        <p>Por eso el <strong>bache de caja</strong> es el mínimo de esta columna: el peor momento donde el proveedor lleva más dinero gastado de lo que ha cobrado.</p>
                      </InfoTip>
                    </span>
                  </TableHead>
                  <TableHead className="text-right text-xs">
                    Operación
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Mes 0: punto de partida explícito */}
                <TableRow className="bg-muted/40 text-xs">
                  <TableCell className="font-medium">Mes 0</TableCell>
                  <TableCell className="italic text-muted-foreground">Punto de partida (antes de arrancar)</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">$0</TableCell>
                  <TableCell className="text-right font-mono">$0</TableCell>
                  <TableCell className="text-right text-muted-foreground italic">inicio</TableCell>
                </TableRow>
                {project.cashflow.map((m, idx) => {
                  const concepto = conceptoDelMes(idx, Number(m.income));
                  const isBacheRow = idx === worstAccIdx && Number(m.accumulatedFlow) < 0;
                  const acumAnterior = idx === 0 ? 0 : Number(project.cashflow[idx - 1].accumulatedFlow);
                  const saldoMes = Number(m.netFlow);
                  const acumNuevo = Number(m.accumulatedFlow);
                  const operacion = `${formatMXN(acumAnterior)} ${saldoMes >= 0 ? "+" : "−"} ${formatMXN(Math.abs(saldoMes))} = ${formatMXN(acumNuevo)}`;
                  return (
                  <TableRow key={m.id} className={isBacheRow ? "bg-orange-50" : ""}>
                    <TableCell>Mes {m.monthNumber}</TableCell>
                    <TableCell className={concepto.className}>
                      <span className="inline-flex items-center gap-1">
                        {concepto.icon !== "—" && <span aria-hidden className="text-green-600">{concepto.icon}</span>}
                        <span>{concepto.label}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(m.income) > 0 ? (
                        <span className="text-green-700 font-medium">+{formatMXN(Number(m.income))}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMXN(-Number(m.payrollOutflow))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMXN(-Number(m.taxOutflow))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMXN(-Number(m.toolsOutflow))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatMXN(-Number(m.adminOutflow))}</TableCell>
                    <TableCell className={`text-right font-medium ${saldoMes >= 0 ? "text-green-700" : "text-destructive"}`}>{formatMXN(saldoMes)}</TableCell>
                    <TableCell className={`text-right ${acumNuevo >= 0 ? "" : "text-destructive font-medium"}`}>
                      {formatMXN(acumNuevo)}
                      {isBacheRow && <span className="block text-[10px] text-orange-700 font-bold mt-0.5">← BACHE DE CAJA</span>}
                    </TableCell>
                    <TableCell className="text-right text-[11px] font-mono text-muted-foreground whitespace-nowrap" title="acum mes anterior + saldo de este mes = acum nuevo">
                      {operacion}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
              <p><strong className="text-foreground">Nota:</strong> el saldo acumulado SIEMPRE incluye los meses anteriores. La columna <strong>Operación</strong> muestra la suma explícita (acum mes anterior + saldo de este mes = acum nuevo) para que NO necesites calculadora. Si las cifras no cuadran, hay un bug — repórtalo.</p>
            </div>
          </CardContent>
        </Card>
        );
      })()}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  info,
}: {
  label: string;
  value: string;
  hint?: string;
  info?: { title: string; body: React.ReactNode };
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground uppercase mb-1 tracking-wide flex items-center">
          <span>{label}</span>
          {info && <InfoTip title={info.title}>{info.body}</InfoTip>}
        </p>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
