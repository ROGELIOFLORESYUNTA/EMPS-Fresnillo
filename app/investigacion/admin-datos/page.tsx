import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { tiempoPrimeraCifra } from "@/lib/tiempo-primera-cifra";
import { DEVELOPMENT_MODES } from "@/lib/utils";
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
    eventosDeTiempo,
    decisiones,
    piloto,
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
    prisma.workspaceActivityLog.findMany({
      where: { eventType: { in: ["project_created", "estimate_run", "option_chosen", "cotizacion_rapida"] } },
      select: { eventType: true, payloadJson: true, createdAt: true, workspaceId: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectDecision.findMany({ select: { projectId: true, mode: true } }),
    prisma.pilotoRespuesta.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  // ===== Por lado de la mesa: Ayuntamiento contra proveedor =====
  const ROL_LADO: Record<string, string> = { operador_municipal: "Ayuntamiento", proveedor: "Proveedor", investigador: "Investigador", explorando: "Explorando", otro: "Otro" };
  const ladoDe = (rol: string | null | undefined) => (rol && ROL_LADO[rol]) || "Sin rol";
  const rolPorWorkspace = new Map(workspaces.map((w) => [w.id, w.role]));
  const workspacePorProyecto = new Map(projects.map((pr) => [pr.id, pr.workspaceId]));
  const lados: Record<string, { proyectos: number; cotizaciones: number; decisiones: number; modos: Map<string, number> }> = {};
  const lado = (rol: string | null | undefined) => {
    const k = ladoDe(rol);
    return (lados[k] ??= { proyectos: 0, cotizaciones: 0, decisiones: 0, modos: new Map() });
  };
  for (const pr of projects) lado(pr.workspaceId ? rolPorWorkspace.get(pr.workspaceId) : null).proyectos += 1;
  for (const ev of eventosDeTiempo) if (ev.eventType === "cotizacion_rapida") lado(rolPorWorkspace.get(ev.workspaceId)).cotizaciones += 1;
  for (const d of decisiones) {
    const l = lado(rolPorWorkspace.get(workspacePorProyecto.get(d.projectId) ?? ""));
    l.decisiones += 1;
    l.modos.set(d.mode, (l.modos.get(d.mode) ?? 0) + 1);
  }
  const filasLado = Object.entries(lados)
    .map(([nombre, v]) => {
      const masElegido = [...v.modos.entries()].sort((a, b) => b[1] - a[1])[0];
      return { nombre, ...v, masElegido: masElegido ? `${DEVELOPMENT_MODES.find((m) => m.value === masElegido[0])?.label ?? masElegido[0]} (${masElegido[1]})` : "sin decisiones" };
    })
    .sort((a, b) => b.proyectos - a.proyectos);

  // ===== Encuesta del piloto, por lado =====
  const mediana = (xs: number[]) => {
    if (xs.length === 0) return null;
    const v = [...xs].sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  };
  const pilotoPorLado: Record<string, { n: number; cred: number[]; desv: number[]; formas: Map<string, number> }> = {};
  for (const r of piloto) {
    const k = ladoDe(r.rol);
    const g = (pilotoPorLado[k] ??= { n: 0, cred: [], desv: [], formas: new Map() });
    g.n += 1;
    g.cred.push(r.credibilidad);
    if (r.cifraEsperada != null && r.totalMostrado != null && Number(r.totalMostrado) > 0) {
      g.desv.push(((Number(r.cifraEsperada) - Number(r.totalMostrado)) / Number(r.totalMostrado)) * 100);
    }
    if (r.formaQueUsaria) g.formas.set(r.formaQueUsaria, (g.formas.get(r.formaQueUsaria) ?? 0) + 1);
  }
  const filasPiloto = Object.entries(pilotoPorLado).map(([nombre, g]) => {
    const forma = [...g.formas.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      nombre,
      n: g.n,
      credibilidad: (g.cred.reduce((a, b) => a + b, 0) / g.cred.length).toFixed(1),
      desviacion: mediana(g.desv),
      forma: forma ? `${DEVELOPMENT_MODES.find((m) => m.value === forma[0])?.label ?? (forma[0] === "no_se" ? "No sabe" : forma[0])} (${forma[1]})` : "sin dato",
    };
  });
  const tiempo = tiempoPrimeraCifra(eventosDeTiempo);
  const min = (v: number | null) => (v == null ? "sin datos" : v < 1 ? `${Math.round(v * 60)} s` : v < 120 ? `${v.toFixed(1)} min` : `${(v / 60).toFixed(1)} h`);

  // Distribuciones
  const modeCount = new Map<string, number>();
  for (const e of estimates) modeCount.set(e.mode, (modeCount.get(e.mode) ?? 0) + 1);
  const changeTypeCount = new Map<string, number>();
  for (const c of changes) changeTypeCount.set(c.type, (changeTypeCount.get(c.type) ?? 0) + 1);
  const changeDecisionCount = new Map<string, number>();
  for (const c of changes) changeDecisionCount.set(c.decision, (changeDecisionCount.get(c.decision) ?? 0) + 1);

  // Solo mostramos workspaces con actividad real: un visitante que solo abrió
  // la página (sin nombre, 0 proyectos, 0 parámetros, 0 eventos) no representa
  // a nadie y ensucia el panel. Se cuentan aparte como "sesiones vacías".
  const workspacesConActividad = workspaces.filter(
    (w) => !!w.displayName || w._count.projects > 0 || w._count.overrides > 0 || w._count.activityLog > 0,
  );
  const sesionesVacias = workspaces.length - workspacesConActividad.length;

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
        <Stat label="Usuarios con actividad" value={String(workspacesConActividad.length)} icon={<Users className="w-4 h-4" />} />
        <Stat label="Proyectos (sin templates)" value={String(projects.length)} icon={<Database className="w-4 h-4" />} />
        <Stat label="Estimaciones corridas" value={String(estimates.length)} icon={<Activity className="w-4 h-4" />} />
        <Stat label="Cambios capturados" value={String(changes.length)} icon={<Activity className="w-4 h-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tiempo de la primera cifra</CardTitle>
          <CardDescription>
            Cuánto tarda una persona en pasar de crear el proyecto a tener un número, y cuántas se quedan a medio camino. Sale de la bitácora
            (project_created, estimate_run, option_chosen, cotizacion_rapida); mediana, no promedio, para que un caso raro no la mueva.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <Stat label="De crear a la primera cifra" value={min(tiempo.medianaMinutosACifra)} icon={<Activity className="w-4 h-4" />} />
          <Stat label="De crear a elegir opción" value={min(tiempo.medianaMinutosAEleccion)} icon={<Activity className="w-4 h-4" />} />
          <Stat label="Crean y nunca estiman" value={`${tiempo.sinCifra} de ${tiempo.proyectosCreados}`} icon={<Activity className="w-4 h-4" />} />
          <Stat label="Estiman y nunca eligen" value={`${tiempo.conCifraSinEleccion} de ${tiempo.conCifra}`} icon={<Activity className="w-4 h-4" />} />
          <div className="sm:col-span-2 lg:col-span-4 grid sm:grid-cols-2 gap-3 pt-2 border-t">
            <p>
              <strong>Cotizar en un minuto:</strong> {tiempo.rapida.proyectos} proyecto(s); mediana {min(tiempo.rapida.medianaMinutosACifra)} a la cifra
              {tiempo.rapida.medianaSegundosEnLlenar != null && <>, {Math.round(tiempo.rapida.medianaSegundosEnLlenar)} s llenando el formulario</>}.
            </p>
            <p>
              <strong>Flujo completo:</strong> {tiempo.completo.proyectos} proyecto(s); mediana {min(tiempo.completo.medianaMinutosACifra)} a la cifra.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por lado de la mesa</CardTitle>
          <CardDescription>Lo mismo, separado por quién lo usa: el Ayuntamiento que cuida el presupuesto y el proveedor que cuida su utilidad. Sale del rol que cada visitante declaró.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lado</TableHead>
                <TableHead className="text-right">Proyectos</TableHead>
                <TableHead className="text-right">Cotizaciones rápidas</TableHead>
                <TableHead className="text-right">Decisiones</TableHead>
                <TableHead>Forma de hacerlo más elegida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasLado.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">Sin datos todavía.</TableCell></TableRow>
              ) : filasLado.map((f) => (
                <TableRow key={f.nombre}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell className="text-right">{f.proyectos}</TableCell>
                  <TableCell className="text-right">{f.cotizaciones}</TableCell>
                  <TableCell className="text-right">{f.decisiones}</TableCell>
                  <TableCell className="text-xs">{f.masElegido}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encuesta del piloto</CardTitle>
          <CardDescription>
            Cuatro preguntas al pie del resultado: qué tan creíble les pareció la cifra (1 a 5), cuánto esperaban antes de verla, qué forma de hacerlo usarían y qué faltó.
            La desviación es la mediana de (lo que esperaban menos lo calculado) entre lo calculado: negativa quiere decir que esperaban pagar o cobrar menos de lo que salió.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lado</TableHead>
                <TableHead className="text-right">Respuestas</TableHead>
                <TableHead className="text-right">Credibilidad promedio</TableHead>
                <TableHead className="text-right">Desviación de lo esperado</TableHead>
                <TableHead>Forma que usarían</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasPiloto.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">Sin respuestas todavía. La encuesta aparece al pie de cada resultado.</TableCell></TableRow>
              ) : filasPiloto.map((f) => (
                <TableRow key={f.nombre}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell className="text-right">{f.n}</TableCell>
                  <TableCell className="text-right">{f.credibilidad} de 5</TableCell>
                  <TableCell className="text-right">{f.desviacion == null ? "sin cifra" : `${f.desviacion > 0 ? "+" : ""}${f.desviacion.toFixed(0)} %`}</TableCell>
                  <TableCell className="text-xs">{f.forma}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {piloto.some((r) => r.comentario) && (
            <div className="px-4 py-3 border-t text-xs space-y-1">
              <p className="font-medium">Últimos comentarios</p>
              {piloto.filter((r) => r.comentario).slice(0, 8).map((r) => (
                <p key={r.id} className="text-muted-foreground"><span className="font-medium text-foreground">{ladoDe(r.rol)}:</span> {r.comentario}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios con actividad</CardTitle>
          <CardDescription>
            Solo se listan los visitantes que crearon algo o se identificaron.
            {sesionesVacias > 0 && (
              <> Se ocultaron <strong>{sesionesVacias}</strong> sesiones vacías (navegadores que solo abrieron la página sin hacer nada).</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {workspacesConActividad.length === 0 ? (
            <p className="p-6 text-sm text-center text-muted-foreground">Aún no hay usuarios con actividad.</p>
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
                {workspacesConActividad.map((w) => (
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
