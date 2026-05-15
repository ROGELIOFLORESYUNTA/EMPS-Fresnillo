import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GraduationCap, FileText } from "lucide-react";

export const metadata = {
  title: "Reportes académicos - Investigación",
};

export default async function ReportesAcademicosPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { modules: true, estimates: true } },
    },
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Reportes académicos" },
      ]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6" />
          Reportes académicos
        </h1>
        <p className="text-muted-foreground max-w-3xl mt-1">
          Selecciona un proyecto y abre su reporte en versión académica. Cada reporte trae las variables capturadas, los 5 modos × 3 escenarios comparados, y la evidencia para validar la hipótesis del artículo. Esta vista no se muestra al operador del Ayuntamiento.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="mb-3">Aún no hay proyectos para reportar.</p>
            <Button asChild><Link href="/projects/new">Crear el primer proyecto</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium line-clamp-1">{p.name}</h3>
                  <Badge variant="outline" className="shrink-0 text-xs">{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{p.client}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {p._count.modules} módulos · {p._count.estimates} estimaciones
                </p>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/projects/${p.id}/reports/research`}>
                    <GraduationCap className="w-3 h-3 mr-1" />
                    Ver reporte académico
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
