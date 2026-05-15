import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Building2, Briefcase, Printer } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function ReportsHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });
  if (!project) notFound();

  const reports = [
    {
      key: "municipal",
      title: "Reporte para Ayuntamiento",
      description: "Resumen ejecutivo: alcance, tiempos, costos, riesgos, qué NO está incluido, mantenimiento, alertas de cotización baja, checklist de aceptación.",
      icon: <Building2 className="w-6 h-6" />,
      audience: "Ayuntamiento de Fresnillo",
    },
    {
      key: "provider",
      title: "Reporte para Proveedor",
      description: "Costo real del equipo, capital de trabajo, impuestos estimados, margen, precio mínimo sostenible, recomendación de anticipo y mantenimiento.",
      icon: <Briefcase className="w-6 h-6" />,
      audience: "Proveedor de software",
    },
  ];

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

      <div className="grid md:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.key} className="flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                {r.icon}
              </div>
              <CardTitle className="text-base">{r.title}</CardTitle>
              <CardDescription className="text-xs">Para: {r.audience}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-4 flex-1">{r.description}</p>
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Importante:</strong> los reportes son estimaciones preliminares. La determinación oficial fiscal/laboral
          requiere revisión profesional según régimen, deducciones, prestaciones, SBC, clase de riesgo IMSS y movimientos afiliatorios. Cada reporte
          incluye los parámetros usados para auditoría (RNF-03).
        </CardContent>
      </Card>
    </div>
  );
}
