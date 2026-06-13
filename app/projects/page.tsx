import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatMXN, RISK_LEVELS } from "@/lib/utils";
import { Plus } from "lucide-react";
import { peekWorkspace } from "@/lib/workspace";

export default async function ProjectsPage() {
  // Lectura: no crear workspace solo por listar proyectos.
  const workspace = await peekWorkspace();
  // FASE G.I — mismo alcance que la API y la página de detalle (evita listar
  // proyectos de otros visitantes que después dan 404 al abrirse).
  const projects = await prisma.project.findMany({
    where: workspace
      ? { OR: [{ workspaceId: workspace.id }, { isTemplate: true }, { workspaceId: null }] }
      : { OR: [{ isTemplate: true }, { workspaceId: null }] },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { modules: true, estimates: true, changes: true } },
      estimates: {
        where: { scenario: "probable" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proyectos</h1>
          <p className="text-muted-foreground text-sm">{projects.length} proyectos registrados</p>
        </div>
        <Button asChild>
          <Link href="/projects/new"><Plus className="w-4 h-4 mr-2" />Nuevo proyecto</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Cliente / Área</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Módulos</TableHead>
                <TableHead className="text-center">Estimaciones</TableHead>
                <TableHead className="text-center">Cambios</TableHead>
                <TableHead className="text-right">Total estimado</TableHead>
                <TableHead>Riesgo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => {
                const e = p.estimates[0];
                return (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/projects/${p.id}`} className="block">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.systemType}</div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>{p.client}</div>
                      <div className="text-xs text-muted-foreground">{p.municipalArea}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                    <TableCell className="text-center">{p._count.modules}</TableCell>
                    <TableCell className="text-center">{p._count.estimates}</TableCell>
                    <TableCell className="text-center">{p._count.changes}</TableCell>
                    <TableCell className="text-right">
                      {e ? formatMXN(Number(e.total)) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {e ? (
                        <Badge className={RISK_LEVELS[e.riskLevel as keyof typeof RISK_LEVELS]?.bg}>
                          {e.riskLevel}
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay proyectos. Crea el primero usando el botón superior.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
