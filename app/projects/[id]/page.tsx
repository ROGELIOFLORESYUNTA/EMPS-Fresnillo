import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMXN, formatHours, formatWeeks, RISK_LEVELS, STATUS_LABELS, PRIORITY_LABELS, SYSTEM_TYPE_LABELS, SCENARIO_LABELS, CONTRACT_LABELS, ROLE_LABELS, LEVEL_LABELS, labelOf } from "@/lib/utils";
import { FileText, Calculator, Users, Layers, GitPullRequest, TrendingDown, CheckCircle2, Circle, ArrowRight, ClipboardCheck } from "lucide-react";
import { RecalcularButton } from "@/components/recalcular-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { InfoTip } from "@/components/info-tip";
import { RecommendationCard } from "@/components/recommendation-card";
import { DecisionSection, type DecisionTimelineItem } from "@/components/decision-section";
import { ElegirOpcionButton } from "@/components/elegir-opcion-button";
import type { RecommendationRole } from "@/lib/engine/recommendation";
import { recomendacionDelProyecto } from "@/lib/recomendacion-proyecto";
import { peekWorkspace } from "@/lib/workspace";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";
import { ladoDelProyecto, rolDeLado } from "@/lib/lado";
import { getLado } from "@/lib/lado-server";
import { TresRespuestas } from "@/components/tres-respuestas";
import { CompartirEnlace } from "@/components/compartir-enlace";
import { ExplicacionDelNumero } from "@/components/explicacion-del-numero";
import { PorQueImportaLaForma } from "@/components/tarjetas-de-opcion";
import { GraficaComposicion } from "@/components/grafica-composicion";
import { GraficaFormas } from "@/components/grafica-formas";
import { GraficaFlujo } from "@/components/grafica-flujo";
import { composicionDelPrecio, filasDeFormas, titularDeFormas, modeloDeFlujo, fraseDelBache } from "@/lib/graficas";
import { NOMBRE_DE_FORMA } from "@/lib/formas";
import { PreguntasDelPatron } from "@/components/preguntas-del-patron";
import { EncuestaPiloto } from "@/components/encuesta-piloto";
import { computeOnTimeRisk, computeMunicipalQuebrarRisk, computeProviderViabilityRatio, computeMaintenanceMonthly, computeChangeRangeByType, factorHorasCambio } from "@/lib/engine/reports-insights";
import { loadChangeImpactParameters } from "@/lib/parameters";
import { NIVEL_ETIQUETA, type NivelHerramienta } from "@/lib/engine/herramientas";
import type { PasoDeCalculo } from "@/lib/engine/explicacion";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; scenario?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  // Dueño y lado: 404 si el proyecto es de otro workspace o del otro lado.
  const acceso = await cargarProyectoConAcceso(id);
  if (!acceso.project) notFound();
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
  // Workspace del visitante (para sus ajustes de parámetros). peekWorkspace NO
  // crea fila: solo navegar no ensucia la BD.
  const visitorWorkspace = await peekWorkspace();
  // Rol para personalizar la recomendación: lo implica el lado del host, ya no
  // se pregunta (desarrollador es proveedor; ayuntamiento, operador municipal).
  const lado = await getLado();
  const visitorRole: RecommendationRole = rolDeLado(lado);

  // Tomar último (mode, scenario) único - soporta múltiples versiones por modo.
  // Orden lógico: modos de más lento a más rápido, escenarios optimista->probable->conservador.
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
  // FASE H - Resultado real capturado (sin back-relation en Project, query aparte).
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

  const workingCapitalRequired = project.cashflow[0]?.workingCapitalRequired ?? 0;
  // Nombres llanos (A mano, Con IA...); el técnico queda en el atributo title de las gráficas.
  const modeLabels = NOMBRE_DE_FORMA;
  const scenarioLabels: Record<string, string> = {
    optimistic: "optimista",
    probable: "probable",
    conservative: "conservador",
  };

  // ===== Recomendación "¿cuál opción te conviene?" según el rol del visitante =====
  // Una sola recomendación para todo el sistema (pantalla y reportes): mismas
  // estimaciones, misma aptitud por modo para ESTE proyecto, misma brecha.
  const { recomendacion: recommendation, aptitud } = recomendacionDelProyecto({
    role: visitorRole,
    project: {
      priority: project.priority,
      targetDate: project.targetDate,
      estimatedBudget: project.estimatedBudget !== null ? Number(project.estimatedBudget) : null,
      systemType: project.systemType,
    },
    modules: project.modules.map((m) => ({
      complexity: m.complexity,
      clarity: m.clarity,
      criticality: m.criticality,
      screensCount: m.screensCount,
      reportsCount: m.reportsCount,
      catalogsCount: m.catalogsCount,
      integrationsCount: m.integrationsCount,
      sensitiveData: m.sensitiveData,
    })),
    estimates: latestEstimates.map((e) => ({
      mode: e.mode,
      scenario: e.scenario,
      total: Number(e.total),
      weeksTotal: e.weeksTotal !== null ? Number(e.weeksTotal) : null,
      weeksToPrototype: e.weeksToPrototype !== null ? Number(e.weeksToPrototype) : null,
      riskScore: Number(e.riskScore),
      riskLevel: e.riskLevel,
      margin: Number(e.margin),
    })),
    team: project.team.map((t) => ({ role: t.role, availabilityPercent: t.availabilityPercent, aiSkill: t.aiSkill })),
    workingCapitalRequired: Number(workingCapitalRequired),
  });
  const brecha = recommendation?.brecha ?? null;

  // ===== Decisión activa + cronología de lo que pasó después =====
  const allDecisions = await prisma.projectDecision.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  const activeDecision = allDecisions.find((d) => d.supersededAt === null) ?? null;
  const supersededCount = allDecisions.filter((d) => d.supersededAt !== null).length;

  // Opción que manda en la pantalla: la elegida; si no hay, la recomendada; si
  // no, híbrido probable. El selector la cambia (?mode=&scenario=) y con ella
  // se mueven las cuatro respuestas de arriba y la cadena de cálculo.
  const selectedMode = sp.mode ?? activeDecision?.mode ?? recommendation?.best.mode ?? "hybrid";
  const selectedScenario = sp.scenario ?? activeDecision?.scenario ?? recommendation?.best.scenario ?? "probable";
  const selectedEstimate = latestEstimates.find((e) => e.mode === selectedMode && e.scenario === selectedScenario)
    ?? latestEstimates.find((e) => e.mode === "hybrid" && e.scenario === "probable")
    ?? latestEstimates.find((e) => e.scenario === "probable")
    ?? latestEstimates[0];
  const selectedTotal = selectedEstimate?.total ?? null;

  let decisionTimeline: DecisionTimelineItem[] = [];
  let decisionCurrentTotal: number | null = null;
  if (activeDecision) {
    const sameOptionNow = latestEstimates.find(
      (e) => e.mode === activeDecision.mode && e.scenario === activeDecision.scenario,
    );
    decisionCurrentTotal = sameOptionNow ? Number(sameOptionNow.total) : null;

    if (project.workspaceId) {
      const events = await prisma.workspaceActivityLog.findMany({
        where: {
          workspaceId: project.workspaceId,
          createdAt: { gt: activeDecision.createdAt },
          eventType: {
            in: [
              "project_recalculated",
              "estimate_run",
              "parameter_overridden",
              "parameter_override_removed",
              "change_request_created",
              "change_decided",
              "module_updated",
              "module_created",
              "team_updated",
            ],
          },
        },
        orderBy: { createdAt: "asc" },
        take: 60,
      });
      const changesById = new Map(project.changes.map((c) => [c.id, c]));
      for (const ev of events) {
        let payload: Record<string, unknown> = {};
        try {
          payload = ev.payloadJson ? JSON.parse(ev.payloadJson) : {};
        } catch {
          // payload ilegible: se omite el detalle
        }
        const isParamEvent = ev.eventType === "parameter_overridden" || ev.eventType === "parameter_override_removed";
        // Los eventos de parámetros son globales del workspace (no traen proyecto);
        // el resto solo cuenta si es de ESTE proyecto.
        if (!isParamEvent && payload.projectId !== id) continue;

        let text: string | null = null;
        switch (ev.eventType) {
          case "project_recalculated":
            text = "Se recalculó el proyecto con los parámetros vigentes (nueva versión de la estimación).";
            break;
          case "estimate_run":
            text = `Se corrió una nueva estimación (${modeLabels[String(payload.mode)] ?? payload.mode}).`;
            break;
          case "parameter_overridden":
            text = `Se editó el parámetro ${String(payload.parameterKey ?? "")} (afecta los próximos recálculos, no las cifras ya guardadas).`;
            break;
          case "parameter_override_removed":
            text = `Se restauró el parámetro ${String(payload.parameterKey ?? "")} a su valor oficial.`;
            break;
          case "change_request_created": {
            const cr = payload.changeRequestId ? changesById.get(String(payload.changeRequestId)) : undefined;
            const desc = cr?.description ? `: "${cr.description.slice(0, 80)}${cr.description.length > 80 ? "..." : ""}"` : "";
            text = `Se registró una solicitud de cambio${desc}.`;
            break;
          }
          case "change_decided":
            text = `Se decidió una solicitud de cambio (${String(payload.decision ?? "")}).`;
            break;
          case "module_updated":
            text = `Se editó el módulo "${String(payload.name ?? "")}" (cambia el esfuerzo en el próximo recálculo).`;
            break;
          case "module_created":
            text = `Se agregó el módulo "${String(payload.name ?? payload.type ?? "")}".`;
            break;
          case "team_updated":
            text = `Se editó al equipo ("${String(payload.name ?? "")}"), cambia el costo en el próximo recálculo.`;
            break;
        }
        if (text) decisionTimeline.push({ date: ev.createdAt, text });
      }
      decisionTimeline = decisionTimeline.slice(0, 20);
    }
  }

  // Mes donde se materializa el bache de caja (saldo acumulado más bajo)
  const worstAccumulated = project.cashflow.length > 0
    ? project.cashflow.reduce((worst, m) => Number(m.accumulatedFlow) < Number(worst.accumulatedFlow) ? m : worst, project.cashflow[0])
    : null;
  const bacheVsPrecioPct = selectedTotal && Number(workingCapitalRequired) > 0
    ? (Number(workingCapitalRequired) / Number(selectedTotal)) * 100
    : 0;

  // ===== Lo que la pantalla contesta primero: cuánto, cuándo, si alcanza, qué se eligió =====
  const totalSel = selectedTotal != null ? Number(selectedTotal) : null;
  const semanasSel = selectedEstimate?.weeksTotal != null ? Number(selectedEstimate.weeksTotal) : null;
  const costoDirectoSel = selectedEstimate ? Number(selectedEstimate.directCost) : 0;
  const utilidadSel = selectedEstimate ? Math.max(0, Number(selectedEstimate.subtotal) - costoDirectoSel) : 0;
  const capitalRequerido = Number(workingCapitalRequired);
  const onTime = computeOnTimeRisk(semanasSel ?? 0, project.targetDate ?? null, new Date());
  const quebrar = computeMunicipalQuebrarRisk(capitalRequerido, totalSel ?? 0);
  const viabilidad = computeProviderViabilityRatio(capitalRequerido, utilidadSel);
  const mantenimiento = computeMaintenanceMonthly(totalSel ?? 0);
  const esLaElegida = !!activeDecision && activeDecision.mode === selectedMode && activeDecision.scenario === selectedScenario;
  const esLaRecomendada = !!recommendation && recommendation.best.mode === selectedMode && recommendation.best.scenario === selectedScenario;
  let pasosExplicacion: PasoDeCalculo[] = [];
  try {
    pasosExplicacion = selectedEstimate?.explanationJson ? (JSON.parse(selectedEstimate.explanationJson) as PasoDeCalculo[]) : [];
  } catch {
    pasosExplicacion = [];
  }

  // Herramientas de IA, pericia y costos fijos de cada estimación: quedan en su snapshot.
  interface SnapshotEstimacion {
    herramientas?: { asientos: number; usdPorAsiento: number; sobreconsumo: number; tipoCambio: number; mensualMXN: number; descripcion: string; usuariosFinales: number; usuariosFinalesSupuestos: boolean; usdPorUsuarioFinal: number; mensualUsuariosFinalesMXN: number; nivel?: NivelHerramienta; asientosAlNivel?: number; asientosConPlanPropio?: number; usdPlanesPropios?: number };
    pericia?: { promedio: number; conDato: boolean; factor: number; aplica: boolean; efectivo?: { effort_efficiency: number } };
    otrosCostosMensuales?: { herramientas: number; administracion: number };
  }
  const leerSnapshot = (e: { inputsSnapshot: string } | null | undefined): SnapshotEstimacion | null => {
    if (!e) return null;
    try {
      return JSON.parse(e.inputsSnapshot) as SnapshotEstimacion;
    } catch {
      return null;
    }
  };
  const snapSel = leerSnapshot(selectedEstimate);
  const herramientasSel = snapSel?.herramientas ?? null;
  const periciaSel = snapSel?.pericia ?? null;
  // Los cambios chicos tambien se abaratan con la IA: la MISMA regla que la
  // calculadora de cambios (CHANGE_MODE_FACTOR por forma de hacerlo, con las
  // ediciones del workspace), moderada por la pericia del equipo.
  const parametrosCambios = await loadChangeImpactParameters(undefined, undefined, visitorWorkspace?.id ?? null);
  const factorHorasCambios = factorHorasCambio(
    parametrosCambios.modeFactor[selectedMode as keyof typeof parametrosCambios.modeFactor] ?? 1,
    periciaSel?.aplica ? periciaSel.factor : 1,
  );
  const rangosCambio = computeChangeRangeByType(semanasSel && semanasSel > 0 ? costoDirectoSel / semanasSel : 0, 40, factorHorasCambios);
  const licenciasSel = selectedMode === "low_code" && herramientasSel && herramientasSel.mensualUsuariosFinalesMXN > 0
    ? { usuarios: herramientasSel.usuariosFinales, usdPorUsuario: herramientasSel.usdPorUsuarioFinal, mensualMXN: herramientasSel.mensualUsuariosFinalesMXN, supuestos: herramientasSel.usuariosFinalesSupuestos }
    : null;

  // El detalle de "de dónde sale este precio": lo comparten la respuesta de arriba y la tarjeta del resumen.
  const infoPrecio = (
    <>
                  <strong>Costo del proyecto</strong> durante los meses reales de la forma de hacerlo elegida: el equipo con sus cargas (sueldo + IMSS + INFONAVIT + ISN/UAZ + prestaciones LFT), las herramientas de IA de esa forma de hacerlo, otras herramientas y administración. Si el proyecto pasa de 6 meses con personal en nómina, suma indemnización LFT por terminación de contrato.
                  <br /><br />
                  Sobre ese costo se aplica el margen objetivo y el IVA 16%. Cambia la forma de hacerlo arriba: el precio sube o baja porque cada forma tarda distinto.
                  <br /><br />
                  Fuente: motor de cálculo, parámetros 2026 (DOF, CONASAMI, IMSS, SEFIN Zacatecas).
    </>
  );

  // ===== Lo que dibujan las gráficas y las frases de arriba =====
  // La opción que se ve de verdad: si la pedida en la dirección no tiene
  // estimación, la pantalla cae a otra y las gráficas deben seguirla.
  const modoVisto = selectedEstimate?.mode ?? selectedMode;
  const escenarioVisto = selectedEstimate?.scenario ?? selectedScenario;
  const soloTuTiempo = project.team.length > 0 && project.team.every((t) => t.contractType === "propio");
  // "No aplica: cliente privado" y "Por definir" no dicen nada: no se muestran.
  const mostrarArea = !/^(no aplica|por definir)/i.test(project.municipalArea.trim());
  const hrefReporte = `/projects/${id}/reports/${visitorRole === "proveedor" ? "provider" : "municipal"}`;

  const composicion = selectedEstimate
    ? composicionDelPrecio(
        {
          directCost: selectedEstimate.directCost,
          indirectCost: selectedEstimate.indirectCost,
          subtotal: selectedEstimate.subtotal,
          vat: selectedEstimate.vat,
          total: selectedEstimate.total,
          margin: selectedEstimate.margin,
          explanationJson: selectedEstimate.explanationJson,
          inputsSnapshot: selectedEstimate.inputsSnapshot,
        },
        { lado, soloTuTiempo },
      )
    : null;

  const datosFormas = filasDeFormas({
    estimaciones: latestEstimates.map((e) => ({
      mode: e.mode,
      scenario: e.scenario,
      total: Number(e.total),
      weeksTotal: e.weeksTotal !== null ? Number(e.weeksTotal) : null,
    })),
    aptitud,
    modoSeleccionado: modoVisto,
    escenario: escenarioVisto,
    modoRecomendado: recommendation?.best.mode ?? null,
  });
  const totalDeLaForma = (scenario: string) => {
    const e = latestEstimates.find((x) => x.mode === modoVisto && x.scenario === scenario);
    return e ? Number(e.total) : null;
  };
  const rangoDeLaForma = { optimista: totalDeLaForma("optimistic"), conservador: totalDeLaForma("conservative") };

  const modeloFlujo = modeloDeFlujo(project.cashflow, totalSel);
  const fraseFlujo = modeloFlujo ? fraseDelBache(modeloFlujo, lado) : "";


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

  const bloqueProgreso = (
      <Card className="shadow-none">
        <details open={!tieneEstimacion}>
          <summary className="cursor-pointer list-none"><CardHeader>
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
        </CardHeader></summary>
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
      </details>
      </Card>
  );

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: project.name },
      ]} />

      {project.isTemplate && (
        <div className="border-l-4 border-marino pl-4">
          <p className="text-base font-semibold text-tinta">Esto es un ejemplo, para que veas cómo funciona</p>
          {lado === "ayuntamiento" && (
            <p className="mt-0.5 text-base text-tinta-suave">
              Es un proyecto municipal ya capturado, con cifras calculadas de verdad. Recórrelo completo: los módulos, el equipo, la comparación de opciones, el flujo de efectivo y los reportes. No es tuyo y no aparece en tus proyectos.
            </p>
          )}
          <Link href="/projects/new" className="inline-flex min-h-11 items-center text-base font-semibold text-accion underline underline-offset-4">
            Crear el mío
          </Link>
        </div>
      )}

      {/* Encabezado: el nombre, para quién es y en qué va */}
      <header>
        <h1 className="text-titulo text-tinta">{project.name}</h1>
        <p className="mt-2 text-base text-tinta-suave">
          Cliente: {project.client}{mostrarArea ? ` · ${project.municipalArea}` : ""}
        </p>
        <p className="mt-1 text-sm text-tinta-suave">
          {labelOf(STATUS_LABELS, project.status)} · Prioridad {labelOf(PRIORITY_LABELS, project.priority).toLowerCase()} · {labelOf(SYSTEM_TYPE_LABELS, project.systemType)}
        </p>
      </header>

      {/* Sin estimación todavía: lo primero es seguir los pasos */}
      {!tieneEstimacion && bloqueProgreso}

      {/* 1. Las cuatro respuestas: cuánto, cuándo, si alcanza y qué se eligió */}
      {selectedEstimate && totalSel != null && (
        <TresRespuestas
          total={totalSel}
          semanas={semanasSel}
          presupuesto={project.estimatedBudget != null ? Number(project.estimatedBudget) : null}
          onTime={onTime}
          modoLabel={modeLabels[selectedEstimate.mode] ?? selectedEstimate.mode}
          escenarioLabel={scenarioLabels[selectedEstimate.scenario] ?? selectedEstimate.scenario}
          margen={Number(selectedEstimate.margin)}
          rango={rangoDeLaForma}
          perspectiva={lado}
          soloTuTiempo={soloTuTiempo}
          incluyeIA={composicion?.segmentos.some((s) => s.clave === "ia") ?? false}
          decision={activeDecision ? {
            modoLabel: modeLabels[activeDecision.mode] ?? activeDecision.mode,
            escenarioLabel: scenarioLabels[activeDecision.scenario] ?? activeDecision.scenario,
            fecha: activeDecision.createdAt,
            por: activeDecision.decidedByName,
          } : null}
          esLaElegida={esLaElegida}
          esRecomendada={esLaRecomendada}
          infoPrecio={infoPrecio}
        />
      )}

      {/* Vino de Cotizar en un minuto: la cifra sale de valores típicos; invitar a afinar */}
      {project.notes?.startsWith("Creado con Cotizar en un minuto") && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-marino pl-4">
          <div className="max-w-2xl">
            <p className="text-base font-semibold text-tinta">Esta cifra sale de valores típicos</p>
            <p className="text-base text-tinta-suave">
              Cada parte se tomó de tamaño mediano y el equipo es {soloTuTiempo ? "tu tiempo, sin cargas de nómina" : "una persona a sueldo"}. Afina los módulos y el equipo, vuelve a calcular, y el número será el tuyo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${id}/modules`} className="inline-flex min-h-11 items-center rounded-lg bg-marino px-5 text-base font-semibold text-white transition-colors hover:bg-marino/90">Afinar módulos</Link>
            <Link href={`/projects/${id}/team`} className="inline-flex min-h-11 items-center rounded-lg border border-marino px-5 text-base font-semibold text-marino transition-colors hover:bg-papel">Afinar equipo</Link>
          </div>
        </div>
      )}

      {/* 2. De qué se compone el precio */}
      {composicion && (
        <GraficaComposicion segmentos={composicion.segmentos} total={composicion.total} titular={composicion.titular} />
      )}

      {/* 3. Las cinco formas de hacerlo, con su rango */}
      {latestEstimates.length > 0 && (
        <div className="space-y-3">
          <GraficaFormas
            datos={datosFormas}
            titular={titularDeFormas(datosFormas)}
            ayuda="Cada barra va de lo optimista a lo conservador y el punto oscuro es el escenario que ves. Toca una forma para ver sus cifras arriba."
            escenario={escenarioVisto}
            hrefBase={`/projects/${id}`}
          />
          <details className="rounded-lg border bg-lienzo">
              <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-tinta">Ver las 15 combinaciones en una tabla (versión {latestVersion})</summary>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma de hacerlo</TableHead>
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
            </details>
          <details className="rounded-lg border bg-lienzo">
            <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-tinta">Por qué la forma de hacerlo importa tanto</summary>
            <div className="px-4 pb-4"><PorQueImportaLaForma /></div>
          </details>
        </div>
      )}

      {/* 4. La recomendación, en dos renglones */}
      {recommendation && (
        <RecommendationCard
          projectId={id}
          recommendation={recommendation}
          selectedMode={modoVisto}
          selectedScenario={escenarioVisto}
        />
      )}

      {/* 5. Qué sigue: llevar el reporte, compartir o decidir */}
      {tieneEstimacion && (
        <section aria-label="Qué sigue" className="flex flex-wrap items-start gap-3">
          <Link
            href={hrefReporte}
            className="inline-flex min-h-11 items-center rounded-lg bg-marino px-5 text-base font-semibold text-white transition-colors hover:bg-marino/90"
          >
            Ver el reporte para llevar
          </Link>
          {!project.isTemplate && (
            <div className="[&_button]:h-11 [&_button]:px-5 [&_button]:text-base [&_button]:font-semibold">
              <CompartirEnlace projectId={id} token={project.shareToken} />
            </div>
          )}
          {!project.isTemplate && selectedEstimate && (
            <ElegirOpcionButton
              projectId={id}
              mode={selectedEstimate.mode}
              scenario={selectedEstimate.scenario}
              modeLabel={modeLabels[selectedEstimate.mode] ?? selectedEstimate.mode}
              scenarioLabel={scenarioLabels[selectedEstimate.scenario] ?? selectedEstimate.scenario}
              recommendedMode={recommendation?.best.mode}
              recommendedScenario={recommendation?.best.scenario}
              variant="actual"
            />
          )}
        </section>
      )}

      {/* 6. La pregunta de credibilidad: un toque. Las otras tres, plegadas. */}
      {selectedEstimate && totalSel != null && (
        <EncuestaPiloto projectId={id} totalMostrado={totalSel} modoLabel={modeLabels[selectedEstimate.mode] ?? selectedEstimate.mode} />
      )}

      {/* 7. Dinero que adelantas, mes a mes */}
      {modeloFlujo && (() => {
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
          if (income === 0) return { label: "Sin cobro", className: "text-muted-foreground", esCobro: false };
          if (idx === firstMaxIdx && idx !== lastMaxIdx) return { label: "Anticipo (cobro)", className: "text-blue-700 font-medium", esCobro: true };
          if (idx === lastMaxIdx && lastMaxIdx !== firstMaxIdx) return { label: "Pago final (cobro)", className: "text-emerald-700 font-medium", esCobro: true };
          if (idx === firstMaxIdx && idx === lastMaxIdx) return { label: "Pago único (cobro)", className: "text-emerald-700 font-medium", esCobro: true };
          return { label: "Pago parcial (cobro)", className: "text-foreground", esCobro: true };
        }
        return (
          <section aria-labelledby="flujo-titulo" className="rounded-xl border bg-lienzo p-5 sm:p-7">
            <h2 id="flujo-titulo" className="text-seccion text-tinta">
              {lado === "desarrollador" ? "El dinero que adelantas, mes a mes" : "El dinero que adelanta el proveedor, mes a mes"}
            </h2>
            <p className="mt-1 text-base text-tinta-suave">
              {modeLabels[selectedMode] ?? selectedMode}, escenario {scenarioLabels[selectedScenario] ?? selectedScenario}. Los cobros al cliente suben, los gastos bajan y la línea es lo que llevas acumulado.
            </p>
            {cashflowVsEstimateMismatch && selectedMonthsFromWeeks !== null && (
              <div className="mt-4 border-l-4 border-amber-600 pl-4 text-base text-amber-950">
                <strong>El flujo no coincide con la duración de esta forma de hacerlo:</strong> tarda unos {selectedMonthsFromWeeks.toFixed(1)} meses según la estimación, pero el flujo está calculado para {cashflowMonths}. Recalcula el proyecto eligiendo esta forma de hacerlo para sincronizarlo.
              </div>
            )}
            <div className="mt-5">
              <GraficaFlujo modelo={modeloFlujo} frase={fraseFlujo} />
            </div>
            <details className="mt-6 rounded-lg border">
              <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-tinta">Ver la tabla mes a mes y cómo se calcula</summary>
              <div className="space-y-2 px-4 pb-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-1 font-semibold text-foreground">
                  Flujo de efectivo · {modeLabels[selectedMode] ?? selectedMode} · escenario {scenarioLabels[selectedScenario] ?? selectedScenario}
                  <InfoTip title="¿Por qué esta forma de hacerlo y este escenario?">
                <p>Este flujo está calculado sobre la última estimación con la forma de hacerlo <strong>{modeLabels[selectedMode] ?? selectedMode}</strong> y escenario <strong>{scenarioLabels[selectedScenario] ?? selectedScenario}</strong>.</p>
                <p>El default es <strong>híbrido + probable</strong> porque es la línea base realista: combina capacidades humanas con asistencia generativa, sin asumir productividades extremas que pueden no cumplirse.</p>
                <p>Si cambias el selector arriba, los precios de las tarjetas se ajustan, pero <strong>esta tabla y el bache se mantienen</strong> hasta que recalcules el proyecto en esa otra configuración.</p>
              </InfoTip>
                </div>
                <div className="space-y-2">Cómo entra y sale el dinero del proveedor mes a mes. Los <strong>cobros al cliente</strong> son ingresos (todos en verde porque son dinero que ENTRA al proveedor). Las <strong>salidas</strong> son nómina del equipo, impuestos, herramientas y administración.
              
              <span className="block mt-1">
                <strong className="text-foreground">Estructura de pagos de este proyecto:</strong> {totalPayments} cobros en total: 1 anticipo al arrancar, {intermediatePayments} {intermediatePayments === 1 ? "pago parcial intermedio" : "pagos parciales intermedios"} y 1 pago final al cerrar. Distribuidos en <strong>{cashflowMonths} meses</strong>.
                <InfoTip title="¿Por qué está en meses y no en semanas? ¿Por qué pagos parciales mensuales?">
                  <p>El flujo de efectivo se modela en MESES porque los ciclos de nómina, impuestos (IMSS, ISN), facturación y rentas administrativas son mensuales. Las {selectedWeeks ? `${selectedWeeks.toFixed(1)} semanas` : "semanas"} de calendario de la forma de hacerlo se convierten a meses dividiendo entre 4.33.</p>
                  <p>Los <strong>pagos parciales</strong> entre el anticipo y el pago final se asumen <strong>mensuales</strong> por defecto del modelo. Esto refleja la práctica común en contratos municipales (estimación mensual contra avance, art. 54 LOPSRM). Si tu contrato real es a 3 pagos totales (anticipo + 1 intermedio + finiquito) o anticipo + finiquito, eso se configura en el wizard de estimación con los porcentajes.</p>
                </InfoTip>
              </span>
              
              <strong className="text-foreground">Bache de caja máximo: {formatMXN(Number(project.cashflow[0].workingCapitalRequired))}</strong> {worstAccumulated && (
                <>(aparece en el mes <strong>{worstAccumulated.monthNumber}</strong>, marcado abajo). Es el saldo más profundo en negativo: lo que el proveedor debe tener en banco antes de arrancar.</>
              )}</div>
              </div>
                          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center">
                      Concepto
                      <InfoTip title="¿Cómo se etiqueta cada mes?">
                        <p>Todas las filas marcadas en verde son <strong>cobros que el proveedor recibe del cliente</strong> (dinero que entra). El sistema mira el monto y asigna:</p>
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
                        <p>O sea: cada mes arrastra el resultado del anterior. Si en el mes 1 el saldo acumulado quedó en $50,000 y en el mes 2 el saldo del mes fue de $20,000, entonces el acumulado del mes 2 es $70,000 (el sistema ya lo sumó por ti; la columna "Operación" lo escribe explícito para que lo verifiques sin calculadora).</p>
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
                        {concepto.esCobro && <TrendingDown aria-hidden className="w-3.5 h-3.5 text-green-600" />}
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
                      {isBacheRow && <span className="block text-[10px] text-orange-700 font-bold mt-0.5">AQUÍ ESTÁ EL BACHE DE CAJA</span>}
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
              <p><strong className="text-foreground">Nota:</strong> el saldo acumulado SIEMPRE incluye los meses anteriores. La columna <strong>Operación</strong> muestra la suma explícita (acum mes anterior + saldo de este mes = acum nuevo) para que NO necesites calculadora. Si las cifras no cuadran, hay un error, repórtalo.</p>
            </div>
            </details>
          </section>
        );
      })()}

      {/* Todo lo demás, plegado como siempre */}
      <section aria-labelledby="mas-detalle" className="space-y-4">
        <h2 id="mas-detalle" className="text-seccion text-tinta">Más detalle</h2>

        {/* La cadena de cálculo, cerrada, con su resumen a la vista */}
        {selectedEstimate && (
          <ExplicacionDelNumero
            pasos={pasosExplicacion}
            modoLabel={modeLabels[selectedEstimate.mode] ?? selectedEstimate.mode}
            escenarioLabel={scenarioLabels[selectedEstimate.scenario] ?? selectedEstimate.scenario}
            resumen={composicion?.resumen}
          />
        )}

        {/* Tu decisión y lo que pasó después */}
      {activeDecision && (
        <DecisionSection
          decision={{
            mode: activeDecision.mode,
            scenario: activeDecision.scenario,
            versionAtDecision: activeDecision.versionAtDecision,
            totalAtDecision: Number(activeDecision.totalAtDecision),
            weeksAtDecision: activeDecision.weeksAtDecision !== null ? Number(activeDecision.weeksAtDecision) : null,
            riskLevelAtDecision: activeDecision.riskLevelAtDecision,
            recommendedMode: activeDecision.recommendedMode,
            recommendedScenario: activeDecision.recommendedScenario,
            followedRecommendation: activeDecision.followedRecommendation,
            decidedByName: activeDecision.decidedByName,
            note: activeDecision.note,
            createdAt: activeDecision.createdAt,
          }}
          currentTotal={decisionCurrentTotal}
          latestVersion={latestVersion}
          timeline={decisionTimeline}
          supersededCount={supersededCount}
        />
      )}

        {selectedTotal && (
          <details className="rounded-lg border bg-lienzo">
            <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-tinta">Más cifras del resumen: herramientas de IA, dinero que adelantas y cambios</summary>
            <div className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <SummaryCard
            label="Precio cotizado al cliente"
            value={formatMXN(Number(selectedTotal))}
            hint={`Forma de hacerlo: ${modeLabels[selectedMode] ?? selectedMode} · escenario ${scenarioLabels[selectedScenario] ?? selectedScenario} · v${latestVersion}. Cambia arriba para ver otras formas de hacerlo.`}
            info={{
              title: "¿De dónde sale este precio?",
              body: infoPrecio,
            }}
          />
          <SummaryCard
            label="Herramientas de IA, al mes"
            value={herramientasSel ? formatMXN(herramientasSel.mensualMXN) : "Sin dato"}
            hint={
              !herramientasSel
                ? "Esta estimación se guardó antes de que se cobraran las herramientas. Vuelve a calcular."
                : herramientasSel.mensualMXN > 0
                  ? `Por persona, no por equipo: ${herramientasSel.asientosAlNivel ?? herramientasSel.asientos} asiento(s) al nivel ${NIVEL_ETIQUETA[herramientasSel.nivel ?? "tipico"]} × ${herramientasSel.usdPorAsiento} USD${(herramientasSel.asientosConPlanPropio ?? 0) > 0 ? ` más ${herramientasSel.asientosConPlanPropio} con plan propio (${herramientasSel.usdPlanesPropios} USD)` : ""}${herramientasSel.sobreconsumo > 0 ? ` + ${Math.round(herramientasSel.sobreconsumo * 100)}% de sobreconsumo` : ""}, a ${herramientasSel.tipoCambio} por dólar. Ya está dentro del precio; el nivel se cambia en Calcular.${licenciasSel ? ` Después de entregar: ${licenciasSel.usuarios} usuario(s) × ${licenciasSel.usdPorUsuario} USD = ${formatMXN(licenciasSel.mensualMXN)} al mes en licencias, aparte.` : ""}`
                  : "Esta forma de hacerlo no usa herramientas de IA."
            }
            info={{
              title: "¿Qué herramientas y por qué se cobran?",
              body: (
                <>
                  Cada forma de hacerlo lleva una canasta típica de herramientas por persona técnica (precios de lista consultados el 9 de septiembre de 2026, ver Fuentes)
                  {herramientasSel?.descripcion ? <>: {herramientasSel.descripcion}</> : null}. Se cobran sin IVA porque es acreditable.
                  <br /><br />
                  {periciaSel && periciaSel.aplica
                    ? <>Pericia del equipo con la IA: <strong>{periciaSel.promedio} de 5</strong>{periciaSel.conDato ? "" : " (no capturada; se asume 3)"}. Se acredita el {Math.round(periciaSel.factor * 100)}% del ahorro nominal de esta forma de hacerlo: un modelo potente en manos de quien no sabe darle instrucciones no ahorra tiempo.</>
                    : <>La pericia del equipo con la IA no cambia esta forma de hacerlo.</>}
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
          {brecha ? (
            <SummaryCard
              label="La forma de hacerlo es lo que más pesa"
              value={formatMXN(brecha.diferencia)}
              hint={`De diferencia entre hacerlo ${(modeLabels[brecha.modoCaro] ?? brecha.modoCaro).toLowerCase()} (${formatMXN(brecha.maximo)}) y ${(modeLabels[brecha.modoBarato] ?? brecha.modoBarato).toLowerCase()} (${formatMXN(brecha.minimo)}), escenario ${scenarioLabels[brecha.escenario] ?? brecha.escenario}. Pide que te digan con cuál te están cotizando.`}
              info={{
                title: "¿Por qué tanta diferencia?",
                body: (
                  <>
                    <p>Es el mismo proyecto, con el mismo equipo. Lo único que cambia es la forma de hacerlo: cuánto trabajo se hace a mano, con ayuda de la IA o con herramientas de armado.</p>
                    <p>Por eso la decisión que más pesa no es el precio, sino con qué forma de hacerlo te están cotizando y si esa forma sirve para tu proyecto. Arriba, en &quot;¿Cuál opción te conviene?&quot;, se dice cuáles sirven para este caso y cuáles no.</p>
                  </>
                ),
              }}
            />
          ) : (
            <SummaryCard
              label="La forma de hacerlo es lo que más pesa"
              value="Solo 1 forma"
              hint="Aún no hay estimaciones en otras formas de hacerlo para comparar. Corre la estimación comparando las 5."
              info={{
                title: "¿Por qué no hay comparación?",
                body: (
                  <p>Esta tarjeta compara el precio del mismo proyecto bajo distintas formas de hacerlo. Hoy solo hay una, así que no hay nada que comparar.</p>
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
            </div>
          </details>
        )}

        {selectedEstimate && totalSel != null && (
          <details className="rounded-lg border bg-lienzo">
            <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-tinta">Más preguntas: tiempo, mantenimiento y qué pasa si piden cambios</summary>
            <div className="p-3">
              <PreguntasDelPatron
          onTime={onTime}
          capitalRequerido={capitalRequerido}
          quebrar={quebrar}
          viabilidad={viabilidad}
          mantenimiento={mantenimiento}
          rangosCambio={rangosCambio}
          esProveedor={visitorRole === "proveedor"}
          licenciasUsuarioFinal={licenciasSel}
          ajusteHorasCambios={{ factor: factorHorasCambios, modoLabel: (modeLabels[selectedMode] ?? selectedMode).toLowerCase() }}
        />
            </div>
          </details>
        )}

        {/* Acerca de este proyecto - campos capturados en /projects/new que
          antes no se mostraban (description, targetDate, estimatedBudget, responsable, objective). */}
      {(project.description || project.objective || project.targetDate || project.estimatedBudget || project.responsible || project.notes) && (
        <Card className="shadow-none">
          <details>
          <summary className="cursor-pointer list-none"><CardHeader>
            <CardTitle className="text-base">Acerca de este proyecto</CardTitle>
            <CardDescription>Objetivo, descripción, responsable y notas. Haz clic para verlos; para cambiarlos, editar el proyecto.</CardDescription>
          </CardHeader></summary>
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
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Presupuesto inicial estimado
                  <InfoTip title="¿Por qué muestra esto?">
                    Es el monto que se registró al crear el proyecto, antes de cualquier estimación detallada. Sirve como referencia para comparar contra el "Precio cotizado al cliente" que sale del motor (abajo). Si difieren mucho, hay que entender por qué.
                  </InfoTip>
                </div>
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
        </details>
        </Card>
      )}

        {/* Resultado real del proyecto (FASE H). Aparece cuando el proyecto está en
          ejecución o cerrado, o si ya hay un resultado capturado. Alimenta la
          validación de la hipótesis (estimado vs real). */}
      {mostrarResultadoReal && (
        <Card className={`shadow-none ${actualResult ? "border-green-200 bg-green-50/40" : "border-amber-200 bg-amber-50/40"}`}>
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

        {tieneEstimacion && bloqueProgreso}

        {/* Módulos */}
      <Card className="shadow-none">
        <details>
          <summary className="cursor-pointer list-none"><CardHeader className="flex flex-row items-center justify-between">
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
        </CardHeader></summary>
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
      </details>
      </Card>

        {/* Equipo */}
      <Card className="shadow-none">
        <details>
          <summary className="cursor-pointer list-none"><CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />Quién va a trabajar ({project.team.length} {project.team.length === 1 ? "persona" : "personas"})
            </CardTitle>
            <CardDescription className="max-w-3xl mt-1">
              Personas que el proveedor asigna al proyecto. El sueldo, el tipo de contrato y la disponibilidad de cada persona se usan para calcular el costo real (IMSS, impuesto sobre nómina, prestaciones y, si aplica, liquidación) y las horas por semana con que se divide el trabajo.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/projects/${id}/team`}>Agregar / editar personas</Link>
          </Button>
        </CardHeader></summary>
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
      </details>
      </Card>

        {/* Cambios */}
      {project.changes.length > 0 && (
        <Card className="shadow-none">
          <details>
          <summary className="cursor-pointer list-none"><CardHeader className="flex flex-row items-center justify-between">
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
          </CardHeader></summary>
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
        </details>
        </Card>
      )}

        {/* Seguir afinando */}
        {tieneEstimacion && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" asChild><Link href={`/projects/${id}/modules`}><Layers className="w-4 h-4 mr-2" />Módulos</Link></Button>
            <Button variant="outline" asChild><Link href={`/projects/${id}/team`}><Users className="w-4 h-4 mr-2" />Equipo</Link></Button>
            <Button variant="outline" asChild><Link href={`/projects/${id}/changes`}><GitPullRequest className="w-4 h-4 mr-2" />Cambios</Link></Button>
            <Button variant="outline" asChild><Link href={`/projects/${id}/estimate`}><Calculator className="w-4 h-4 mr-2" />Recalcular</Link></Button>
            <Button variant="outline" asChild><Link href={`/projects/${id}/reports`}><FileText className="w-4 h-4 mr-2" />Todos los reportes</Link></Button>
            <RecalcularButton projectId={id} />
          </div>
        )}
      </section>
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
        <div className="text-xs text-muted-foreground uppercase mb-1 tracking-wide flex items-center">
          <span>{label}</span>
          {info && <InfoTip title={info.title}>{info.body}</InfoTip>}
        </div>
        <p className="text-[clamp(1rem,1.6vw,1.5rem)] font-bold leading-tight tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
