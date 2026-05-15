import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMXN, formatHours, formatWeeks, RISK_LEVELS, DEVELOPMENT_MODES } from "@/lib/utils";
import { ChevronLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PrintButton } from "@/components/print-button";

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
      changes: { orderBy: { createdAt: "desc" } },
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
                <li>Cambios registrados: {project.changes.length}</li>
                <li>Comparación de escenarios: {latest.length} estimaciones</li>
                <li>Parámetros snapshot: ✅ (cada estimación guarda copia de los parámetros usados para auditoría)</li>
                <li>Resultado real pendiente de capturar al cierre del proyecto</li>
              </ul>
            </CardContent>
          </Card>
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
