import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEVELOPMENT_MODES, SYSTEM_TYPE_LABELS, labelOf } from "@/lib/utils";
import { recomendacionDelProyecto } from "@/lib/recomendacion-proyecto";
import type { RecommendationRole } from "@/lib/engine/recommendation";
import { rolDeLado } from "@/lib/lado";
import { getLado } from "@/lib/lado-server";
import { COPIA } from "@/lib/lado-copy";
import { VEREDICTO_ETIQUETA } from "@/lib/engine/aptitud";
import type { PasoDeCalculo } from "@/lib/engine/explicacion";
import { computeOnTimeRisk, computeMunicipalQuebrarRisk, computeProviderViabilityRatio, computeMaintenanceMonthly, computeChangeRangeByType, factorHorasCambio } from "@/lib/engine/reports-insights";
import { loadChangeImpactParameters } from "@/lib/parameters";
import { TresRespuestas } from "@/components/tres-respuestas";
import { ExplicacionDelNumero } from "@/components/explicacion-del-numero";
import { TarjetasDeOpcion, PorQueImportaLaForma, type TarjetaDeOpcion } from "@/components/tarjetas-de-opcion";
import { PreguntasDelPatron } from "@/components/preguntas-del-patron";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const ESCENARIO: Record<string, string> = { optimistic: "optimista", probable: "probable", conservative: "conservador" };

/**
 * Vista de solo lectura del resultado, para quien recibe el enlace sin tener
 * cuenta: las cuatro respuestas, las tres opciones, de dónde sale el número y
 * las preguntas del patrón. Mismas funciones que la pantalla del proyecto.
 */
export default async function ResultadoCompartidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mode?: string; scenario?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  if (!token || token.length < 8) notFound();
  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      modules: { orderBy: { createdAt: "asc" } },
      team: true,
      estimates: { orderBy: [{ version: "desc" }, { mode: "asc" }, { scenario: "asc" }] },
      cashflow: { orderBy: { monthNumber: "asc" }, take: 1 },
    },
  });
  if (!project) notFound();

  const decision = await prisma.projectDecision.findFirst({
    where: { projectId: project.id, supersededAt: null },
    orderBy: { createdAt: "desc" },
  });
  // El rol para la recomendación lo implica el lado del host, igual que en la
  // pantalla del proyecto (ya no se pregunta ni se lee del dueño).
  const lado = await getLado();
  const role: RecommendationRole = rolDeLado(lado);

  const vistos = new Set<string>();
  const latest = project.estimates.filter((e) => {
    const k = `${e.mode}__${e.scenario}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  const modeLabels = Object.fromEntries(DEVELOPMENT_MODES.map((m) => [m.value, m.label]));
  const capitalRequerido = Number(project.cashflow[0]?.workingCapitalRequired ?? 0);

  const { recomendacion, aptitud } = recomendacionDelProyecto({
    role,
    project: {
      priority: project.priority,
      targetDate: project.targetDate,
      estimatedBudget: project.estimatedBudget !== null ? Number(project.estimatedBudget) : null,
      systemType: project.systemType,
    },
    modules: project.modules.map((m) => ({
      complexity: m.complexity, clarity: m.clarity, criticality: m.criticality, screensCount: m.screensCount,
      reportsCount: m.reportsCount, catalogsCount: m.catalogsCount, integrationsCount: m.integrationsCount, sensitiveData: m.sensitiveData,
    })),
    estimates: latest.map((e) => ({
      mode: e.mode, scenario: e.scenario, total: Number(e.total),
      weeksTotal: e.weeksTotal !== null ? Number(e.weeksTotal) : null,
      weeksToPrototype: e.weeksToPrototype !== null ? Number(e.weeksToPrototype) : null,
      riskScore: Number(e.riskScore), riskLevel: e.riskLevel, margin: Number(e.margin),
    })),
    team: project.team.map((t) => ({ role: t.role, availabilityPercent: t.availabilityPercent, aiSkill: t.aiSkill })),
    workingCapitalRequired: capitalRequerido,
  });

  const selectedMode = sp.mode ?? decision?.mode ?? recomendacion?.best.mode ?? "hybrid";
  const selectedScenario = sp.scenario ?? decision?.scenario ?? recomendacion?.best.scenario ?? "probable";
  const sel = latest.find((e) => e.mode === selectedMode && e.scenario === selectedScenario)
    ?? latest.find((e) => e.scenario === "probable")
    ?? latest[0];

  const total = sel ? Number(sel.total) : null;
  const semanas = sel?.weeksTotal != null ? Number(sel.weeksTotal) : null;
  const costoDirecto = sel ? Number(sel.directCost) : 0;
  const onTime = computeOnTimeRisk(semanas ?? 0, project.targetDate ?? null, new Date());
  let pasos: PasoDeCalculo[] = [];
  try {
    pasos = sel?.explanationJson ? (JSON.parse(sel.explanationJson) as PasoDeCalculo[]) : [];
  } catch {
    pasos = [];
  }

  let factorHorasCambios = 1;
  let licencias: { usuarios: number; usdPorUsuario: number; mensualMXN: number; supuestos: boolean } | null = null;
  try {
    const snap = sel ? (JSON.parse(sel.inputsSnapshot) as { herramientas?: { usuariosFinales: number; usdPorUsuarioFinal: number; mensualUsuariosFinalesMXN: number; usuariosFinalesSupuestos: boolean }; pericia?: { factor?: number; aplica?: boolean } }) : null;
    const parametrosCambios = await loadChangeImpactParameters(undefined, undefined, project.workspaceId ?? null);
    const modo = sel?.mode as keyof typeof parametrosCambios.modeFactor | undefined;
    factorHorasCambios = factorHorasCambio(modo ? parametrosCambios.modeFactor[modo] ?? 1 : 1, snap?.pericia?.aplica ? snap.pericia.factor ?? 1 : 1);
    if (sel?.mode === "low_code" && snap?.herramientas && snap.herramientas.mensualUsuariosFinalesMXN > 0) {
      licencias = { usuarios: snap.herramientas.usuariosFinales, usdPorUsuario: snap.herramientas.usdPorUsuarioFinal, mensualMXN: snap.herramientas.mensualUsuariosFinalesMXN, supuestos: snap.herramientas.usuariosFinalesSupuestos };
    }
  } catch {
    licencias = null;
  }

  const buscar = (mode?: string | null, scenario?: string | null) =>
    mode && scenario ? latest.find((e) => e.mode === mode && e.scenario === scenario) ?? null : null;
  const tarjeta = (titulo: string, e: (typeof latest)[number] | null, porque: string): TarjetaDeOpcion => ({
    titulo,
    modoLabel: e ? modeLabels[e.mode] ?? e.mode : "",
    escenarioLabel: e ? ESCENARIO[e.scenario] ?? e.scenario : "",
    total: e ? Number(e.total) : null,
    semanas: e?.weeksTotal != null ? Number(e.weeksTotal) : null,
    riskLevel: e?.riskLevel ?? null,
    veredicto: e ? VEREDICTO_ETIQUETA[aptitud[e.mode]?.veredicto ?? "apto"] : null,
    porque,
    href: e ? `/r/${token}?mode=${e.mode}&scenario=${e.scenario}` : `/r/${token}`,
    activa: !!e && e.mode === selectedMode && e.scenario === selectedScenario,
  });
  const tarjetas: TarjetaDeOpcion[] = [
    tarjeta("Recomendada", buscar(recomendacion?.best.mode, recomendacion?.best.scenario), recomendacion?.reasons[0] ?? "Sin recomendación todavía."),
    tarjeta("La elegida", buscar(decision?.mode, decision?.scenario), decision ? (decision.note || `Elegida el ${decision.createdAt.toLocaleDateString("es-MX")}.`) : "Todavía no se elige una opción."),
    tarjeta("La más segura", buscar(decision?.mode ?? recomendacion?.best.mode ?? selectedMode, "conservative"), "La misma forma de hacerlo con margen por si hay tropiezos: es lo más que podría llegar a costar."),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-md border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        Vista compartida de solo lectura. Quien la compartió puede quitar el enlace cuando quiera. Generada por {COPIA[lado].marca} el {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}.
      </div>

      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-muted-foreground">Cliente: {project.client} · {project.municipalArea}</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="outline">{labelOf(SYSTEM_TYPE_LABELS, project.systemType)}</Badge>
          <Badge variant="secondary">{project.modules.length} pieza(s) · {project.team.length} persona(s)</Badge>
        </div>
        {project.objective && <p className="text-sm mt-2 max-w-3xl">{project.objective}</p>}
      </div>

      {sel && total != null ? (
        <>
          <TresRespuestas
            total={total}
            semanas={semanas}
            presupuesto={project.estimatedBudget != null ? Number(project.estimatedBudget) : null}
            onTime={onTime}
            modoLabel={modeLabels[sel.mode] ?? sel.mode}
            escenarioLabel={ESCENARIO[sel.scenario] ?? sel.scenario}
            decision={decision ? {
              modoLabel: modeLabels[decision.mode] ?? decision.mode,
              escenarioLabel: ESCENARIO[decision.scenario] ?? decision.scenario,
              fecha: decision.createdAt,
              por: decision.decidedByName,
            } : null}
            esLaElegida={!!decision && decision.mode === selectedMode && decision.scenario === selectedScenario}
            esRecomendada={!!recomendacion && recomendacion.best.mode === selectedMode && recomendacion.best.scenario === selectedScenario}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Las opciones</CardTitle>
              <CardDescription>Toca una para ver su cifra y de dónde sale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TarjetasDeOpcion tarjetas={tarjetas} />
              <PorQueImportaLaForma />
            </CardContent>
          </Card>

          <ExplicacionDelNumero pasos={pasos} modoLabel={modeLabels[sel.mode] ?? sel.mode} escenarioLabel={ESCENARIO[sel.scenario] ?? sel.scenario} />

          <PreguntasDelPatron
            onTime={onTime}
            capitalRequerido={capitalRequerido}
            quebrar={computeMunicipalQuebrarRisk(capitalRequerido, total)}
            viabilidad={computeProviderViabilityRatio(capitalRequerido, Math.max(0, Number(sel.subtotal) - costoDirecto))}
            mantenimiento={computeMaintenanceMonthly(total)}
            rangosCambio={computeChangeRangeByType(semanas && semanas > 0 ? costoDirecto / semanas : 0, 40, factorHorasCambios)}
            ajusteHorasCambios={{ factor: factorHorasCambios, modoLabel: (modeLabels[sel.mode] ?? sel.mode).toLowerCase() }}
            esProveedor={role === "proveedor"}
            licenciasUsuarioFinal={licencias}
          />
        </>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">Este proyecto todavía no tiene una estimación calculada.</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Qué se va a construir</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid sm:grid-cols-2 gap-1 text-sm">
            {project.modules.map((m) => (
              <li key={m.id}>
                {m.name}
                <span className="text-muted-foreground"> · {m.screensCount} pantalla(s){m.integrationsCount > 0 ? `, ${m.integrationsCount} conexión(es)` : ""}{m.sensitiveData ? ", datos personales" : ""}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
