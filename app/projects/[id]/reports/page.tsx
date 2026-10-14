import Link from "next/link";
import { notFound } from "next/navigation";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";
import { getLado } from "@/lib/lado-server";
import { reportesDelIndice } from "@/lib/reportes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Building2, Briefcase, Printer } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";

const ICONOS: Record<string, React.ReactNode> = {
  municipal: <Building2 className="w-6 h-6" />,
  provider: <Briefcase className="w-6 h-6" />,
  cotizacion: <FileText className="w-6 h-6" />,
};

export default async function ReportsHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Dueño y lado: 404 si el proyecto es de otro workspace o del otro lado.
  const { project } = await cargarProyectoConAcceso(id);
  if (!project) notFound();

  // Cada cara ofrece sus reportes: el desarrollador el de viabilidad y la
  // cotización para su cliente; el Ayuntamiento el suyo (lib/reportes.ts).
  const reports = reportesDelIndice(await getLado());

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Mis proyectos", href: "/projects" },
        { label: project.name, href: `/projects/${id}` },
        { label: "Reportes" },
      ]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" />Reportes</h1>
        <p className="text-muted-foreground">{project.name}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.key} className="flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                {ICONOS[r.key] ?? <FileText className="w-6 h-6" />}
              </div>
              <CardTitle className="text-base">{r.title}</CardTitle>
              <CardDescription className="text-xs">Para: {r.audience}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-4 flex-1">{r.descripcion}</p>
              {r.disponible ? (
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/projects/${id}/reports/${r.key}`}>Ver</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/projects/${id}/reports/${r.key}?print=1`}>
                      <Printer className="w-3 h-3 mr-1" />Imprimir
                    </Link>
                  </Button>
                </div>
              ) : (
                <div>
                  <Badge variant="outline">En preparación</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Importante:</strong> los reportes son estimaciones preliminares. La determinación oficial fiscal/laboral
          requiere revisión profesional según régimen, deducciones, prestaciones, SBC, clase de riesgo IMSS y movimientos afiliatorios. Cada reporte
          incluye los parámetros usados al momento del cálculo para auditoría posterior.
        </CardContent>
      </Card>
    </div>
  );
}
