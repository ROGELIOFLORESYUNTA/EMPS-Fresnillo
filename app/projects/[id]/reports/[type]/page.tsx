import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMXN, formatHours, formatWeeks, RISK_LEVELS, DEVELOPMENT_MODES } from "@/lib/utils";
import { ChevronLeft, AlertTriangle, CheckCircle2, Clock, ShieldAlert, Cog, GitBranch, Wrench, CalendarClock, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import {
  computeProviderOpportunityCost,
  computeProviderViabilityRatio,
  computeMunicipalQuebrarRisk,
  computeOnTimeRisk,
  computeMaintenanceMonthly,
  computeChangeRangeByType,
} from "@/lib/engine/reports-insights";

const REPORT_LABELS: Record<string, { title: string; audience: string }> = {
  municipal: { title: "Reporte para Ayuntamiento", audience: "Ayuntamiento de Fresnillo, Zacatecas" },
  provider: { title: "Reporte de viabilidad para proveedor", audience: "Proveedor de software" },
  research: { title: "Reporte académico (validación de investigación)", audience: "Universidad Autónoma de Zacatecas" },
};

export default async function ReportPage({ params }: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await params;
  if (!REPORT_LABELS[type]) notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      modules: { include: { stories: true } },
      team: true,
      estimates: { orderBy: [{ version: "desc" }, { mode: "asc" }, { scenario: "asc" }] },
      changes: { orderBy: { createdAt: "desc" }, include: { assessment: true } },
      cashflow: { orderBy: { monthNumber: "asc" } },
    },
  });
  if (!project) notFound();

  // Tomamos el ultimo registro de cada (mode, scenario) — soporta el caso donde
  // se corrieron varios modos en versiones separadas (cada llamada a runEstimate incrementa version).
  const latestVersion = project.estimates[0]?.version ?? 0;
  const seen = new Set<string>();
  const latest = project.estimates
    .filter((e) => {
      const key = `${e.mode}__${e.scenario}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.mode === b.mode ? a.scenario.localeCompare(b.scenario) : a.mode.localeCompare(b.mode)));
  const probable = latest.find((e) => e.scenario === "probable" && e.mode === "hybrid")
    ?? latest.find((e) => e.scenario === "probable");
  const optimistic = probable ? latest.find((e) => e.scenario === "optimistic" && e.mode === probable.mode) : undefined;
  const conservative = probable ? latest.find((e) => e.scenario === "conservative" && e.mode === probable.mode) : undefined;
  const wcap = Number(project.cashflow[0]?.workingCapitalRequired ?? 0);
  const modeLabels = Object.fromEntries(DEVELOPMENT_MODES.map((m) => [m.value, m.label]));
  const meta = REPORT_LABELS[type];

  // ===== Derivaciones G.H (insights para reportes) =====
  const now = new Date();
  const totalPrice = probable ? Number(probable.total) : 0;
  const subtotalAmount = probable ? Number(probable.subtotal) : 0;
  const directCost = probable ? Number(probable.directCost) : 0;
  const marginAmount = Math.max(0, subtotalAmount - directCost);
  const weeksTotal = probable?.weeksTotal ? Number(probable.weeksTotal) : 0;
  const monthsTotal = weeksTotal / 4.33;
  const weeklyTeamRate = weeksTotal > 0 ? directCost / weeksTotal : 0;

  // Lead technician salary cascade: lider_tecnico → senior/lead → param → fallback
  const leadSalary = (() => {
    const lider = project.team.filter((t) => t.role === "lider_tecnico");
    if (lider.length > 0) return Math.max(...lider.map((p) => Number(p.monthlySalary)));
    const seniors = project.team.filter((t) => t.level === "senior" || t.level === "lead");
    if (seniors.length > 0) return Math.max(...seniors.map((p) => Number(p.monthlySalary)));
    return 50000; // fallback Glassdoor MX 2026 promedio líder técnico
  })();
  const totalMonthsAssigned = project.team.reduce((a, p) => a + Number(p.monthsAssigned), 0);
  const avgMonthsAssigned = project.team.length > 0
    ? totalMonthsAssigned / project.team.length
    : monthsTotal;

  const opportunityCost = computeProviderOpportunityCost(marginAmount, leadSalary, avgMonthsAssigned);
  const viability = computeProviderViabilityRatio(wcap, marginAmount);
  const quebrarRisk = computeMunicipalQuebrarRisk(wcap, totalPrice);
  const onTime = computeOnTimeRisk(weeksTotal, project.targetDate ?? null, now);
  const maintenance = computeMaintenanceMonthly(totalPrice);
  const changeRanges = computeChangeRangeByType(weeklyTeamRate);

  // Explicación de cada modo en lenguaje claro al cliente (distinta de DEVELOPMENT_MODES.description que es semi-técnica)
  const MODE_CLIENT_EXPLANATION: Record<string, string> = {
    traditional: "El proveedor escribirá todo el código manualmente. Es predecible pero más lento. Pídele evidencia de pruebas y revisión.",
    ai_assisted: "El proveedor usará IA como asistente, no como reemplazo. Buena combinación calidad/velocidad.",
    hybrid: "El proveedor mezclará codificación manual con asistencia generativa. Razonable; pídele que diga qué módulos van con cada técnica.",
    bytecoding_prompts: "El proveedor usará IA para generar código rápido y entregarte una versión funcional pronto. Implica que el código debe ser revisado y endurecido antes de producción; pregúntale qué pruebas va a correr.",
    low_code: "El proveedor usará una plataforma visual. Rápido para formularios y catálogos, pero ATENCIÓN al licenciamiento mensual y al riesgo de dependencia de la plataforma. Pídele documentación de cómo migrar si la plataforma sube precio.",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link href={`/projects/${id}/reports`} className="text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 inline" /> Volver
        </Link>
        <PrintButton />
      </div>

      {/* Header del reporte */}
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">{meta.title}</h1>
              <p className="text-muted-foreground">Para: {meta.audience}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Generado: {new Date().toLocaleDateString("es-MX")}</p>
              <p>Estimación v{latestVersion}</p>
            </div>
          </div>
          <hr className="my-3" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><strong>Proyecto:</strong> {project.name}</div>
            <div><strong>Cliente:</strong> {project.client}</div>
            <div><strong>Área:</strong> {project.municipalArea}</div>
            <div><strong>Tipo de sistema:</strong> {project.systemType}</div>
            <div className="col-span-2"><strong>Objetivo:</strong> {project.objective}</div>
          </div>
        </CardContent>
      </Card>

      {/* AYUNTAMIENTO */}
      {type === "municipal" && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Resumen ejecutivo</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {probable ? (
                <>
                  <p>Se construirá <strong>{project.name}</strong> con {project.modules.length} módulos y {project.modules.reduce((a, m) => a + m.stories.length, 0)} historias de usuario.</p>
                  <div className="grid grid-cols-3 gap-3 my-4">
                    <ResumenItem label="Optimista" value={optimistic ? formatMXN(Number(optimistic.total)) : "—"} sub={optimistic ? formatWeeks(Number(optimistic.weeksTotal)) : ""} />
                    <ResumenItem label="Probable" value={probable ? formatMXN(Number(probable.total)) : "—"} sub={probable ? formatWeeks(Number(probable.weeksTotal)) : ""} highlight />
                    <ResumenItem label="Conservador" value={conservative ? formatMXN(Number(conservative.total)) : "—"} sub={conservative ? formatWeeks(Number(conservative.weeksTotal)) : ""} />
                  </div>
                  <p className="text-muted-foreground">Modo recomendado: <strong>{modeLabels[probable.mode] ?? probable.mode}</strong>. Riesgo agregado: <Badge className={RISK_LEVELS[probable.riskLevel as keyof typeof RISK_LEVELS]?.bg}>{probable.riskLevel}</Badge></p>
                </>
              ) : (
                <p className="text-muted-foreground">No hay estimaciones registradas. Generar estimación antes de imprimir el reporte.</p>
              )}
            </CardContent>
          </Card>

          {wcap > 0 && (
            <Card className="border-orange-300">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600" />Señales de alerta de cotización</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>El proveedor requiere capital de trabajo de <strong>{formatMXN(wcap)}</strong> antes de cobrar el primer entregable. Si el proveedor no lo declara, podría dejar el proyecto sin liquidez.</p>
                {project.modules.some((m) => m.sensitiveData) && (
                  <p>Hay módulos con datos personales o sensibles. Antes de firmar, asegurar cláusulas conforme a la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO, aplicable al Ayuntamiento) y a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP, aplicable al proveedor), más plan de seguridad documentado.</p>
                )}
                {probable && Number(probable.margin) < 0.15 && (
                  <p>Margen objetivo del proveedor &lt;15%. Revisar si la cotización cubre nómina, impuestos y mantenimiento.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* G1 — ¿Va a terminar a tiempo? */}
          {probable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  ¿Va a terminar a tiempo?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>El proveedor estima <strong>{formatWeeks(onTime.weeksNeeded)}</strong> (~{monthsTotal.toFixed(1)} meses) para terminar el proyecto.</p>
                {onTime.level === "sin_fecha" && (
                  <p className="text-muted-foreground">No has capturado fecha objetivo en este proyecto. Agrega una (por ejemplo, fin de la administración municipal) para que el sistema te alerte si el plazo aprieta.</p>
                )}
                {onTime.level === "holgado" && onTime.weeksAvailable !== null && (
                  <p className="text-green-700">Margen sobrado: la fecha objetivo da {formatWeeks(onTime.weeksAvailable)}. Si todo sale bien, termina antes.</p>
                )}
                {onTime.level === "apretado" && onTime.weeksAvailable !== null && (
                  <p className="text-amber-700">⚠ La fecha objetivo da {formatWeeks(onTime.weeksAvailable)}. Apretado pero alcanzable si NO hay cambios. Cualquier modificación al alcance puede atrasarlo.</p>
                )}
                {onTime.level === "alto_riesgo" && (
                  <p className="text-red-700"><strong>⚠ ALTO RIESGO de no terminar a tiempo.</strong> {onTime.weeksAvailable !== null ? `Solo hay ${formatWeeks(onTime.weeksAvailable)} hasta la fecha objetivo y se necesitan ${formatWeeks(onTime.weeksNeeded)}.` : ""} Negocia recortar alcance o mover fecha ANTES de firmar.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* G2 — ¿El proveedor va a aguantar? */}
          {probable && wcap > 0 && (
            <Card className={quebrarRisk.level === "alto" ? "border-red-300" : quebrarRisk.level === "medio" ? "border-amber-300" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className={`w-4 h-4 ${quebrarRisk.level === "alto" ? "text-red-600" : quebrarRisk.level === "medio" ? "text-amber-600" : "text-green-600"}`} />
                  ¿El proveedor va a aguantar?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>El proveedor va a financiar <strong>{formatMXN(wcap)}</strong> ({(quebrarRisk.ratio * 100).toFixed(0)}% del precio total) de su bolsa antes de cobrar todo.</p>
                {quebrarRisk.level === "bajo" && (
                  <p className="text-green-700">Riesgo bajo. Es manejable si declara que tiene ese capital. Pídele constancia bancaria o estados financieros.</p>
                )}
                {quebrarRisk.level === "medio" && (
                  <p className="text-amber-700">Riesgo medio. Pídele que demuestre capacidad de soportarlo. Si no, va a presionar para que le adelantes más o va a entregar tarde.</p>
                )}
                {quebrarRisk.level === "alto" && (
                  <p className="text-red-700"><strong>⚠ Riesgo alto de que se quede sin caja a media obra</strong> y deje el proyecto inconcluso. NEGOCIA anticipo mayor o pagos por entregable más frecuentes ANTES de firmar.</p>
                )}
                <p className="text-xs text-muted-foreground italic mt-3">Esta sección busca proteger la inversión pública, no descalificar al proveedor. Comparte el reporte con él para que ajuste su propuesta.</p>
              </CardContent>
            </Card>
          )}

          {/* G3 — ¿Qué método va a usar? */}
          {probable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cog className="w-4 h-4 text-blue-600" />
                  ¿Qué método va a usar el proveedor?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>El proveedor cotizó con el modo <strong>{modeLabels[probable.mode] ?? probable.mode}</strong>.</p>
                <p className="text-muted-foreground">{MODE_CLIENT_EXPLANATION[probable.mode] ?? "Modo no documentado en lenguaje cliente."}</p>
              </CardContent>
            </Card>
          )}

          {/* G4 — Si pides cambios, esto cuesta aparte */}
          {weeklyTeamRate > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-orange-600" />
                  Si pides cambios, esto cuesta aparte
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="border-l-4 border-orange-300 bg-orange-50/40 pl-3 py-2 text-orange-900">
                  Pedir &ldquo;una modificación pequeña&rdquo; sin cotizarla es la causa principal por la que los proveedores abandonan el proyecto a mitad. Al firmar el contrato, asegúrate de que el procedimiento de cambios esté escrito y que sepas cuánto cuesta cada categoría.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de cambio</TableHead>
                      <TableHead className="text-right">Costo mínimo</TableHead>
                      <TableHead className="text-right">Costo máximo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeRanges.map((r) => (
                      <TableRow key={r.type}>
                        <TableCell>
                          <p className="font-medium">{r.etiqueta}</p>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </TableCell>
                        <TableCell className="text-right">{formatMXN(r.minCost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMXN(r.maxCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* G5 — Mantenimiento mensual estimado */}
          {totalPrice > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Mantenimiento mensual estimado
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Después de entregar, mantener el sistema funcionando cuesta aprox. <strong>{formatMXN(maintenance.monthlyAmount)} al mes</strong> (~{formatMXN(maintenance.annualAmount)} al año, equivalente al 2% del precio total).</p>
                <p className="text-amber-800">Si NO se contempla en el contrato, lo más probable es que el proveedor desaparezca tras la entrega y nadie pueda modificar el sistema. <strong>Incluye una cláusula de mantenimiento mínima al firmar.</strong></p>
                <p className="text-xs text-muted-foreground italic">Heurística PMBOK 7 / ISBSG: 15-30% del costo del proyecto por año en mantenimiento.</p>
              </CardContent>
            </Card>
          )}

          {/* G6 — ¿Termina antes del cambio de gobierno? */}
          {probable && project.targetDate && (
            <Card className={onTime.daysOverDeadline && onTime.daysOverDeadline > 0 ? "border-red-300" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className={`w-4 h-4 ${onTime.daysOverDeadline && onTime.daysOverDeadline > 0 ? "text-red-600" : "text-green-600"}`} />
                  ¿Termina antes de la fecha objetivo?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Estimado de entrega: <strong>{onTime.estimatedEndDate.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</strong>.</p>
                <p>Fecha objetivo capturada: <strong>{project.targetDate.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</strong>.</p>
                {onTime.daysOverDeadline !== null && onTime.daysOverDeadline < 0 && (
                  <p className="text-green-700">Margen de <strong>{Math.abs(onTime.daysOverDeadline)} días</strong> antes de la fecha límite. El proveedor entrega a tiempo si todo sale bien.</p>
                )}
                {onTime.daysOverDeadline !== null && onTime.daysOverDeadline === 0 && (
                  <p className="text-amber-700">Estimado de entrega coincide con tu fecha objetivo. Cero margen para imprevistos.</p>
                )}
                {onTime.daysOverDeadline !== null && onTime.daysOverDeadline > 0 && (
                  <p className="text-red-700">
                    <strong>⚠ Estimado de entrega posterior a tu fecha objetivo por {onTime.daysOverDeadline} días.</strong> Si esta fecha es porque termina la administración, prácticamente no vas a alcanzar a cumplir la promesa de campaña con este alcance. Recorta alcance o ajusta plazo antes de firmar.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Alcance estimado por módulo</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Módulo</TableHead><TableHead>Tipo</TableHead><TableHead className="text-center">Pantallas</TableHead><TableHead className="text-center">Reportes</TableHead><TableHead>Datos sensibles</TableHead></TableRow></TableHeader>
                <TableBody>
                  {project.modules.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="outline">{m.type}</Badge></TableCell>
                      <TableCell className="text-center">{m.screensCount}</TableCell>
                      <TableCell className="text-center">{m.reportsCount}</TableCell>
                      <TableCell>{m.sensitiveData ? <Badge variant="warning">Sí</Badge> : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Qué NO está incluido en la primera versión</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Nómina oficial timbrada</li>
                <li>Declaraciones fiscales reales (SAT)</li>
                <li>Integración directa con SAT, IMSS o bancos</li>
                <li>Firma electrónica</li>
                <li>Gestión completa de contratos públicos</li>
                <li>Sustitución de asesoría contable, fiscal o legal</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" />Checklist Ayuntamiento</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <ul className="list-disc pl-6 space-y-1">
                <li>Alcance escrito por módulos: ✅ {project.modules.length} módulos</li>
                <li>Criterios de aceptación: {project.modules.reduce((a, m) => a + m.stories.filter((s) => s.acceptanceCriteria).length, 0)} historias con criterios</li>
                <li>Mantenimiento posterior: a definir en contrato</li>
                <li>Forma de pago no obliga al proveedor a financiar todo: capital requerido {formatMXN(wcap)}</li>
                <li>Plan de respaldo y documentación: incluido en alcance</li>
                <li>Pruebas y capacitación: incluido en alcance</li>
                <li>Seguridad y privacidad: {project.modules.some((m) => m.sensitiveData) ? "datos sensibles detectados, requiere análisis adicional" : "no se detectaron datos sensibles"}</li>
              </ul>
            </CardContent>
          </Card>

          {project.changes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cambios solicitados durante el proyecto</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Solicitudes de cambio registradas por el cliente. Si alguna requiere nueva línea base, aparece marcada.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solicitud</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Días</TableHead>
                      <TableHead className="text-right">Costo extra</TableHead>
                      <TableHead>Decisión</TableHead>
                      <TableHead>¿Requiere aprobación?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.changes.map((c) => (
                      <TableRow key={c.id} className={c.assessment?.requiresNewBaseline ? "bg-orange-50" : ""}>
                        <TableCell className="max-w-md">
                          <p className="truncate" title={c.clientOriginalText ?? c.description}>{c.clientOriginalText ?? c.description}</p>
                          {c.assessment?.requiresNewBaseline && (
                            <p className="text-xs text-orange-700 font-medium mt-0.5">← Esta versión cambia el alcance original</p>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline">{c.assessment?.finalType ?? c.assessment?.suggestedType ?? c.type}</Badge></TableCell>
                        <TableCell className="text-right">{c.assessment?.calendarImpactDays ?? (c.timeImpactHours ? Math.ceil(Number(c.timeImpactHours) / 8) : "—")}</TableCell>
                        <TableCell className="text-right">{c.assessment?.estimatedCost ? formatMXN(Number(c.assessment.estimatedCost)) : c.costImpact ? formatMXN(Number(c.costImpact)) : "Sin costo extra"}</TableCell>
                        <TableCell><Badge variant={c.decision === "aceptado" || c.decision === "incluido" ? "success" : c.decision === "rechazado" ? "destructive" : "outline"}>{c.decision}</Badge></TableCell>
                        <TableCell>{c.assessment?.requiresFormalApproval ? <Badge variant="outline" className="text-orange-700 border-orange-300">Sí</Badge> : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* PROVEEDOR */}
      {type === "provider" && probable && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Costo real del equipo</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Perfil</TableHead><TableHead>Rol</TableHead><TableHead className="text-right">Salario</TableHead><TableHead className="text-center">Disp.</TableHead><TableHead className="text-center">Meses</TableHead></TableRow></TableHeader>
                <TableBody>
                  {project.team.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.role} ({p.level})</TableCell>
                      <TableCell className="text-right">{formatMXN(Number(p.monthlySalary))}</TableCell>
                      <TableCell className="text-center">{p.availabilityPercent}%</TableCell>
                      <TableCell className="text-center">{Number(p.monthsAssigned).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Resumen financiero</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <ResumenItem label="Costo directo" value={formatMXN(Number(probable.directCost))} />
                <ResumenItem label="Subtotal con margen" value={formatMXN(Number(probable.subtotal))} />
                <ResumenItem label="IVA trasladado" value={formatMXN(Number(probable.vat))} />
                <ResumenItem label="Total facturable" value={formatMXN(Number(probable.total))} highlight />
                <ResumenItem label="ISR estimado" value={formatMXN(Number(probable.isrEstimated))} />
                <ResumenItem label="Margen aplicado" value={`${(Number(probable.margin) * 100).toFixed(1)}%`} />
                <ResumenItem label="Capital de trabajo requerido" value={formatMXN(wcap)} />
                <ResumenItem label="Riesgo agregado" value={probable.riskLevel} />
              </div>
            </CardContent>
          </Card>

          {/* H1 — ¿Realmente estás ganando? Costo de oportunidad */}
          <Card className={opportunityCost.level === "perdiendo_mucho" ? "border-red-300" : opportunityCost.level === "perdiendo_poco" ? "border-amber-300" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {opportunityCost.level === "ganas_claro" || opportunityCost.level === "empate" ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                ¿Realmente estás ganando? Costo de oportunidad
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                Margen mensual equivalente: <strong>{formatMXN(opportunityCost.marginMonthly)}</strong>
                {" "}vs líder técnico asalariado: <strong>{formatMXN(opportunityCost.marketMonthly)}</strong>.
              </p>
              {opportunityCost.level === "ganas_claro" && (
                <p className="text-green-700">Estás ganando aprox. <strong>{formatMXN(-opportunityCost.deficit)}</strong> más al mes que un empleo asalariado. El proyecto vale la pena.</p>
              )}
              {opportunityCost.level === "empate" && (
                <p className="text-amber-700">Estás trabajando para mantenerte; no estás capitalizando significativamente sobre un empleo equivalente.</p>
              )}
              {opportunityCost.level === "perdiendo_poco" && (
                <p className="text-orange-700">⚠ Estás dejando aprox. <strong>{formatMXN(opportunityCost.deficit)}</strong> al mes en la mesa. Hubieras ganado más como empleado.</p>
              )}
              {opportunityCost.level === "perdiendo_mucho" && (
                <p className="text-red-700"><strong>⚠ Estás dejando aprox. {formatMXN(opportunityCost.deficit)} al mes en la mesa.</strong> Considera subir precio, recortar alcance, o reducir meses asignados antes de firmar.</p>
              )}
              <p className="text-xs text-muted-foreground italic mt-3">Este cálculo no incluye valor estratégico, aprendizaje ni relaciones — es señal financiera pura. Sueldo de referencia: max(salarios de team con rol líder técnico o nivel senior/lead); fallback $50,000 MXN (Glassdoor MX 2026).</p>
            </CardContent>
          </Card>

          {/* H2 — ¿Cuándo cobras vs cuándo gastas? */}
          {project.cashflow.length > 0 && (() => {
            const cashflowSorted = [...project.cashflow].sort((a, b) => a.monthNumber - b.monthNumber);
            const maxAbs = Math.max(
              ...cashflowSorted.map((m) => Math.abs(Number(m.income))),
              ...cashflowSorted.map((m) => Math.abs(Number(m.payrollOutflow) + Number(m.taxOutflow) + Number(m.toolsOutflow) + Number(m.adminOutflow))),
              1,
            );
            const worstMonth = cashflowSorted.reduce((worst, m) => Number(m.accumulatedFlow) < Number(worst.accumulatedFlow) ? m : worst, cashflowSorted[0]);
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    ¿Cuándo cobras vs cuándo gastas?
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="space-y-2">
                    {cashflowSorted.map((m) => {
                      const ingreso = Number(m.income);
                      const egreso = Number(m.payrollOutflow) + Number(m.taxOutflow) + Number(m.toolsOutflow) + Number(m.adminOutflow);
                      const acc = Number(m.accumulatedFlow);
                      const isWorst = m.monthNumber === worstMonth.monthNumber && acc < 0;
                      return (
                        <div key={m.id} className={`text-xs border rounded-md p-2 ${isWorst ? "bg-orange-50 border-orange-300" : ""}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">Mes {m.monthNumber}</span>
                            <span className={acc >= 0 ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                              Acumulado: {formatMXN(acc)}{isWorst && " ← peor mes"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 items-center">
                            <div>
                              <div className="text-[10px] text-muted-foreground">↓ Cobro</div>
                              <div className="h-3 bg-muted rounded overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${(ingreso / maxAbs) * 100}%` }} />
                              </div>
                              <div className="text-[10px] text-green-700">{formatMXN(ingreso)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground">↑ Gasto</div>
                              <div className="h-3 bg-muted rounded overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: `${(egreso / maxAbs) * 100}%` }} />
                              </div>
                              <div className="text-[10px] text-red-700">{formatMXN(egreso)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {worstMonth && Number(worstMonth.accumulatedFlow) < 0 && (
                    <p>En el <strong>mes {worstMonth.monthNumber}</strong> tienes el peor saldo: <strong>{formatMXN(Number(worstMonth.accumulatedFlow))}</strong>. Es el punto donde más capital de tu bolsa estás poniendo. A partir del siguiente cobro empiezas a recuperar.</p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* H3 — ¿Aguantas este proyecto? */}
          <Card className={viability.level === "rojo" ? "border-red-300" : viability.level === "apretado" ? "border-amber-300" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${viability.level === "rojo" ? "text-red-600" : viability.level === "apretado" ? "text-amber-600" : "text-green-600"}`} />
                ¿Aguantas este proyecto?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Bache de caja: <strong>{formatMXN(wcap)}</strong> · Margen: <strong>{formatMXN(marginAmount)}</strong>.</p>
              {viability.level === "comodo" && (
                <p className="text-green-700">El bache es {(viability.ratio * 100).toFixed(0)}% de tu margen — el proyecto se aguanta financieramente.</p>
              )}
              {viability.level === "apretado" && (
                <p className="text-amber-700">⚠ Estás financiando del 50% al 100% de tu propio margen — vas a sentir presión de caja a la mitad. Negocia anticipo mayor o pagos por entregable más frecuentes.</p>
              )}
              {viability.level === "rojo" && (
                <p className="text-red-700"><strong>⚠⚠ Estás poniendo MÁS dinero del que vas a ganar.</strong> Si el cliente retrasa un solo pago, quiebras. RENEGOCIA estructura de pago antes de firmar.</p>
              )}
            </CardContent>
          </Card>

          {/* H4 — Si surgen cambios, esto sale aproximadamente */}
          {weeklyTeamRate > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-orange-600" />
                  Si surgen cambios, esto sale aproximadamente
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-muted-foreground">Tabla rápida para cotizar cuando el cliente te pida &ldquo;una modificación pequeña&rdquo;. Si aceptas cambios sin cobrar, eso descuenta directamente de tu margen.</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Máximo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeRanges.map((r) => (
                      <TableRow key={r.type}>
                        <TableCell><span className="font-medium">{r.etiqueta}</span></TableCell>
                        <TableCell className="text-right">{formatMXN(r.minCost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMXN(r.maxCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground italic">Basado en tu tarifa horaria equivalente ({formatMXN(weeklyTeamRate / 40)}/h, perfiles típicos pequeño/mediano). Para un cambio real, captura el cambio en /changes y obtén la cotización exacta con el motor v7.</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Recomendación de forma de pago</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              {wcap > 100000 ? (
                <p className="text-orange-700"><strong>⚠ Capital de trabajo alto:</strong> negociar anticipo de al menos 30% para reducir necesidad de financiamiento propio.</p>
              ) : (
                <p>Esquema 30/40/30 (anticipo / entregables / pago final) es viable con el flujo proyectado.</p>
              )}
              <p className="text-muted-foreground">El cálculo es preliminar y requiere revisión profesional contable/fiscal antes de firmar.</p>
            </CardContent>
          </Card>

          {project.changes.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cambios y su impacto financiero</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Costo facturable adicional al contrato base, calculado con el motor v7 (incluye IMSS, ISN y contingencia PMBOK 7).
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Horas probables</TableHead>
                        <TableHead className="text-right">Mano de obra</TableHead>
                        <TableHead className="text-right">IMSS+ISN+admin</TableHead>
                        <TableHead className="text-right">Contingencia</TableHead>
                        <TableHead className="text-right">Subtotal antes IVA</TableHead>
                        <TableHead className="text-right">Total facturable</TableHead>
                        <TableHead className="text-right">Mant. mensual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.changes
                        .filter((c) => c.assessment?.financialBreakdownJson)
                        .map((c) => {
                          const fb = c.assessment?.financialBreakdownJson ? JSON.parse(c.assessment.financialBreakdownJson) as { laborCost: number; imssEstimated: number; isnEstimated: number; adminOverhead: number; contingencyAmount: number; subtotalBeforeVat: number; totalInvoice: number; maintenanceMonthlyImpact: number } : null;
                          if (!fb) return null;
                          return (
                            <TableRow key={c.id}>
                              <TableCell><Badge variant="outline">{c.assessment?.finalType ?? c.assessment?.suggestedType ?? c.type}</Badge></TableCell>
                              <TableCell className="text-right">{c.assessment?.probableHours ? Number(c.assessment.probableHours).toFixed(1) : "—"}</TableCell>
                              <TableCell className="text-right">{formatMXN(fb.laborCost)}</TableCell>
                              <TableCell className="text-right">{formatMXN(fb.imssEstimated + fb.isnEstimated + fb.adminOverhead)}</TableCell>
                              <TableCell className="text-right">{formatMXN(fb.contingencyAmount)}</TableCell>
                              <TableCell className="text-right">{formatMXN(fb.subtotalBeforeVat)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMXN(fb.totalInvoice)}</TableCell>
                              <TableCell className="text-right">{formatMXN(fb.maintenanceMonthlyImpact)}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {project.changes.some((c) => c.decision === "incluido" && Number(c.costImpact ?? 0) === 0) && (
                <Card className="border-orange-300">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600" />Cambios absorbidos sin costo</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      El proveedor decidió incluir estos cambios sin cobro adicional. Si el motor activó un guardrail, aparece la razón.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {project.changes
                      .filter((c) => c.decision === "incluido" && Number(c.costImpact ?? 0) === 0)
                      .map((c) => (
                        <div key={c.id} className="border-l-2 border-orange-300 pl-2 py-1">
                          <p className="font-medium">{c.clientOriginalText ?? c.description}</p>
                          {c.assessment?.freeChangeGuardrailReason && (
                            <p className="text-xs text-orange-800 mt-1">Guardrail: {c.assessment.freeChangeGuardrailReason}</p>
                          )}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ACADÉMICO */}
      {type === "research" && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Variables capturadas</CardTitle></CardHeader>
            <CardContent className="text-sm grid grid-cols-2 gap-3">
              <p><strong>Módulos:</strong> {project.modules.length}</p>
              <p><strong>Historias de usuario:</strong> {project.modules.reduce((a, m) => a + m.stories.length, 0)}</p>
              <p><strong>Equipo:</strong> {project.team.length} perfiles</p>
              <p><strong>Cambios registrados:</strong> {project.changes.length}</p>
              <p><strong>Datos sensibles:</strong> {project.modules.some((m) => m.sensitiveData) ? "Sí" : "No"}</p>
              <p><strong>Integraciones totales:</strong> {project.modules.reduce((a, m) => a + m.integrationsCount, 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Escenarios comparados (5 modos × 3 escenarios)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Modo</TableHead><TableHead>Escenario</TableHead><TableHead className="text-right">Horas</TableHead><TableHead className="text-right">Sem. total</TableHead><TableHead className="text-right">Sem. prototipo</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {latest.map((e) => {
                    const totalHours = Number(e.codingHours) + Number(e.reviewHours) + Number(e.testingHours) + Number(e.documentationHours) + Number(e.deploymentHours) + Number(e.trainingHours) + Number(e.supportHours) + Number(e.hardeningHours) + Number(e.analysisHours) + Number(e.designHours);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>{modeLabels[e.mode] ?? e.mode}</TableCell>
                        <TableCell><Badge variant="outline">{e.scenario}</Badge></TableCell>
                        <TableCell className="text-right">{formatHours(totalHours)}</TableCell>
                        <TableCell className="text-right">{e.weeksTotal ? formatWeeks(Number(e.weeksTotal)) : "—"}</TableCell>
                        <TableCell className="text-right">{e.weeksToPrototype ? formatWeeks(Number(e.weeksToPrototype)) : "—"}</TableCell>
                        <TableCell className="text-right">{formatMXN(Number(e.total))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Diferencias entre modos</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Para evidenciar la hipótesis del addendum 25, el sistema separa por fases (no aplica un solo multiplicador). Esto permite visualizar que <strong>bytecoding suma 1.10× horas-persona</strong> pero entrega prototipo <strong>3.5× más rápido</strong> que tradicional.</p>
              <p className="text-muted-foreground">Hipótesis ajustada: la estimación temprana mejora cuando se integran requerimientos, cambios, modo de desarrollo, equipo, obligaciones fiscales-laborales, flujo de efectivo y mantenimiento en una misma base de datos y un mismo cálculo.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Evidencia para validar/ajustar la hipótesis</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <ul className="list-disc pl-6 space-y-1">
                <li>Reporte generado: ✅</li>
                <li>Versión de estimación: v{latestVersion}</li>
                <li>Cambios registrados: {project.changes.length} ({project.changes.filter((c) => c.assessment).length} con evaluación de impacto v7)</li>
                <li>Comparación de escenarios: {latest.length} estimaciones</li>
                <li>Parámetros snapshot: ✅ (cada estimación guarda copia de los parámetros usados para auditoría)</li>
                <li>Resultado real pendiente de capturar al cierre del proyecto</li>
              </ul>
            </CardContent>
          </Card>

          {project.changes.filter((c) => c.assessment).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cambios capturados — evidencia para el artículo</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Tabla completa con factores aplicados y fuentes de parámetros. Cada cambio guarda su fórmula con los parámetros vigentes al momento del cálculo.
                </p>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                      <TableHead className="text-right">F.clar.</TableHead>
                      <TableHead className="text-right">F.fase</TableHead>
                      <TableHead className="text-right">F.modo</TableHead>
                      <TableHead className="text-right">F.riesgo</TableHead>
                      <TableHead className="text-right">Contg.</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Riesgo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.changes
                      .filter((c) => c.assessment)
                      .map((c) => {
                        const a = c.assessment!;
                        return (
                          <TableRow key={c.id}>
                            <TableCell><Badge variant="outline" className="text-[10px]">{a.suggestedType}</Badge></TableCell>
                            <TableCell className="text-xs">{a.currentPhase}</TableCell>
                            <TableCell className="text-xs">{a.developmentMode}</TableCell>
                            <TableCell className="text-right text-xs">{Number(a.artifactPoints).toFixed(0)}</TableCell>
                            <TableCell className="text-right text-xs">{Number(a.clarityFactor).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-xs">{Number(a.phaseFactor).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-xs">{Number(a.modeFactor).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-xs">{Number(a.riskFactor).toFixed(3)}</TableCell>
                            <TableCell className="text-right text-xs">{(Number(a.contingencyRate) * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-right text-xs">{Number(a.probableHours).toFixed(1)}</TableCell>
                            <TableCell className="text-right text-xs">{formatMXN(Number(a.estimatedCost))}</TableCell>
                            <TableCell><Badge className={RISK_LEVELS[a.riskLevel as keyof typeof RISK_LEVELS]?.bg} variant="outline">{a.riskLevel}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
                <div className="p-3 text-xs text-muted-foreground border-t flex flex-wrap items-center gap-3 no-print">
                  <span>Exportar evidencia:</span>
                  <a href={`/api/changes/export?format=json&projectId=${id}`} download className="text-primary hover:underline">JSON</a>
                  <a href={`/api/changes/export?format=csv&projectId=${id}`} download className="text-primary hover:underline">CSV</a>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Footer */}
      <Card className="bg-muted/30 no-print">
        <CardContent className="py-4 text-xs text-muted-foreground">
          Reporte generado automáticamente por EMPS Fresnillo. Los cálculos son estimaciones preliminares.
          La determinación oficial fiscal/laboral requiere revisión profesional.
          Versión {latestVersion} · {new Date().toISOString().split("T")[0]}
        </CardContent>
      </Card>
    </div>
  );
}

function ResumenItem({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-md border ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}>
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
