import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Download, Users, Database, AlertTriangle } from "lucide-react";
import { formatMXN } from "@/lib/utils";

export const metadata = {
  title: "Panel del investigador (datos agregados)",
};

export default async function AdminDatosPage() {
  if (!(await isAdmin())) redirect("/admin-login");

  // ===== Carga agregada =====
  const [
    workspaces,
    projects,
    estimates,
    changes,
    overrides,
    activityLog,
    totalWorkspaces,
  ] = await Promise.all([
    prisma.workspace.findMany({
      orderBy: { lastSeenAt: "desc" },
      include: {
        _count: { select: { projects: true, overrides: true, activityLog: true } },
      },
    }),
    prisma.project.findMany({
      where: { isTemplate: false },
      select: { id: true, workspaceId: true, name: true, clientType: true, status: true, createdAt: true },
    }),
    prisma.estimate.findMany({
      select: { id: true, projectId: true, mode: true, scenario: true, total: true, weeksTotal: true, riskLevel: true, createdAt: true },
    }),
    prisma.changeRequest.findMany({
      select: { id: true, projectId: true, type: true, decision: true, createdAt: true },
    }),
    prisma.workspaceParameterOverride.groupBy({
      by: ["parameterKey"],
      _count: { workspaceId: true },
      orderBy: { _count: { workspaceId: "desc" } },
      take: 15,
    }),
    prisma.workspaceActivityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.workspace.count(),
  ]);

  // Distribuciones
  const modeCount = new Map<string, number>();
  for (const e of estimates) modeCount.set(e.mode, (modeCount.get(e.mode) ?? 0) + 1);
  const changeTypeCount = new Map<string, number>();
  for (const c of changes) changeTypeCount.set(c.type, (changeTypeCount.get(c.type) ?? 0) + 1);
  const changeDecisionCount = new Map<string, number>();
  for (const c of changes) changeDecisionCount.set(c.decision, (changeDecisionCount.get(c.decision) ?? 0) + 1);

  const projectsByWorkspace = new Map<string, number>();
  for (const p of projects) {
    if (!p.workspaceId) continue;
    projectsByWorkspace.set(p.workspaceId, (projectsByWorkspace.get(p.workspaceId) ?? 0) + 1);
  }

  // Agregados por modo × escenario
  const pivot: Record<string, { sum: number; count: number }> = {};
  for (const e of estimates) {
    const key = `${e.mode}|${e.scenario}`;
    if (!pivot[key]) pivot[key] = { sum: 0, count: 0 };
    pivot[key].sum += Number(e.total);
    pivot[key].count += 1;
  }
  const pivotRows = Object.entries(pivot)
    .map(([k, v]) => ({ key: k, avg: v.sum / v.count, count: v.count }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const maxModeCount = Math.max(1, ...Array.from(modeCount.values()));
  const maxChangeTypeCount = Math.max(1, ...Array.from(changeTypeCount.values()));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Panel del investigador" },
      ]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Panel del investigador
          </h1>
          <p className="text-muted-foreground max-w-3xl mt-1">
            Datos agregados de todos los workspaces para análisis científico. Cada visitante del sitio tiene su propio workspace identificado por cookie anónima, así que esta vista no expone PII pero sí muestra el patrón de uso.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/api/admin/export?format=csv" download>
              <Download className="w-4 h-4 mr-2" />Descargar CSV completo
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin-login?logout=1">Salir</Link>
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Workspaces totales" value={String(totalWorkspaces)} icon={<Users className="w-4 h-4" />} />
        <Stat label="Proyectos (sin templates)" value={String(projects.length)} icon={<Database className="w-4 h-4" />} />
        <Stat label="Estimaciones corridas" value={String(estimates.length)} icon={<Activity className="w-4 h-4" />} />
        <Stat label="Cambios capturados" value={String(changes.length)} icon={<Activity className="w-4 h-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspaces activos</CardTitle>
          <CardDescription>Listado de cada visitante con su actividad asociada.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {workspaces.length === 0 ? (
            <p className="p-6 text-sm text-center text-muted-foreground">Aún no hay workspaces.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID (anónimo)</TableHead>
                  <TableHead>Nombre opcional</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead className="text-right">Proyectos</TableHead>
                  <TableHead className="text-right">Parámetros editados</TableHead>
                  <TableHead className="text-right">Eventos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.id.slice(0, 14)}...</TableCell>
                    <TableCell>{w.displayName ?? <span className="text-muted-foreground italic">sin nombre</span>}</TableCell>
                    <TableCell className="text-xs">{w.createdAt.toLocaleDateString("es-MX")}</TableCell>
                    <TableCell className="text-xs">{w.lastSeenAt.toLocaleDateString("es-MX")}</TableCell>
                    <TableCell className="text-right">{w._count.projects}</TableCell>
                    <TableCell className="text-right">{w._count.overrides}</TableCell>
                    <TableCell className="text-right">{w._count.activityLog}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modos de desarrollo elegidos</CardTitle>
            <CardDescription>Cuántas estimaciones se corrieron en cada modo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {Array.from(modeCount.entries()).sort((a, b) => b[1] - a[1]).map(([mode, count]) => (
                <div key={mode} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono">{mode}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(count / maxModeCount) * 100}%` }} />
                  </div>
                </div>
              ))}
              {modeCount.size === 0 && <p className="text-muted-foreground">Sin datos.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipos de cambio solicitados</CardTitle>
            <CardDescription>Distribución por tipo en todos los workspaces.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {Array.from(changeTypeCount.entries()).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono">{type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${(count / maxChangeTypeCount) * 100}%` }} />
                  </div>
                </div>
              ))}
              {changeTypeCount.size === 0 && <p className="text-muted-foreground">Sin datos.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            Parámetros más editados
          </CardTitle>
          <CardDescription>
            Si muchos workspaces editan la misma clave, el valor default probablemente no calibra bien.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {overrides.length === 0 ? (
            <p className="p-6 text-sm text-center text-muted-foreground">Nadie ha editado parámetros aún.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parámetro</TableHead>
                  <TableHead className="text-right">Workspaces que lo editaron</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((o) => (
                  <TableRow key={o.parameterKey}>
                    <TableCell className="font-mono text-xs">{o.parameterKey}</TableCell>
                    <TableCell className="text-right font-medium">{o._count.workspaceId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promedios por modo × escenario</CardTitle>
          <CardDescription>Útil para detectar si un escenario está sistemáticamente sub o sobre estimado.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pivotRows.length === 0 ? (
            <p className="p-6 text-sm text-center text-muted-foreground">Sin estimaciones todavía.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modo × Escenario</TableHead>
                  <TableHead className="text-right">Precio promedio</TableHead>
                  <TableHead className="text-right">Estimaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pivotRows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="font-mono text-xs">{r.key}</TableCell>
                    <TableCell className="text-right">{formatMXN(r.avg)}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 50 eventos</CardTitle>
          <CardDescription>Bitácora cronológica de acciones por workspace.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Fecha</TableHead>
                <TableHead className="w-40">Workspace</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLog.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{a.createdAt.toLocaleString("es-MX")}</TableCell>
                  <TableCell className="font-mono text-xs">{a.workspaceId.slice(0, 14)}...</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{a.eventType}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md truncate">{a.payloadJson ?? "—"}</TableCell>
                </TableRow>
              ))}
              {activityLog.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground p-4">Sin eventos registrados.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase text-muted-foreground tracking-wide">{label}</p>
          <div className="text-primary">{icon}</div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
