import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileText, Users, Layers, Calculator, BarChart3, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";

export default async function HowItWorksPage() {
  const demoProject = await prisma.project.findFirst({
    where: { name: "Demo Sistema CRUD interno" },
    select: { id: true },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <Badge variant="outline" className="mb-3">Tutorial</Badge>
        <h1 className="text-3xl font-bold mb-3">Tutorial del sistema</h1>
        <p className="text-muted-foreground">
          Sistema para estimar proyectos de software municipales antes de cotizarlos. Flujo en 6 pasos descritos a continuación.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Problema que resuelve
        </h2>
        <Card>
          <CardContent className="py-5">
            <p className="mb-3 text-sm">
              Una cotización de software puede verse económica al inicio, y costar mucho más durante la ejecución por factores no estimados:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-destructive shrink-0">·</span> Cambios de alcance solicitados por el área usuaria.</li>
              <li className="flex items-start gap-2"><span className="text-destructive shrink-0">·</span> Mantenimiento posterior no contemplado.</li>
              <li className="flex items-start gap-2"><span className="text-destructive shrink-0">·</span> Nómina, prestaciones, IMSS, INFONAVIT e ISN no incluidos en el costo del proveedor.</li>
              <li className="flex items-start gap-2"><span className="text-destructive shrink-0">·</span> Flujo de efectivo: el proveedor debe poder pagar antes de cobrar.</li>
              <li className="flex items-start gap-2"><span className="text-destructive shrink-0">·</span> Diferencias entre modos de desarrollo (manual, asistido, bytecoding, low-code).</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          Flujo del sistema
        </h2>

        <div className="space-y-3">
          <Step n={1} icon={<FileText className="w-5 h-5" />} title="Crear el proyecto" time="1 min"
            description="Datos generales: nombre, área usuaria, tipo de sistema, prioridad."
            example='Ejemplo: "Sistema de trámites para Atención Ciudadana"' />
          <Step n={2} icon={<Layers className="w-5 h-5" />} title="Capturar módulos" time="3-5 min"
            description="Cada módulo lleva complejidad (1-5), claridad del requerimiento (1-5), criticidad y si maneja datos sensibles."
            example='Ejemplo: "Catálogo de trámites · Alta de solicitudes · Reporte mensual"' />
          <Step n={3} icon={<Users className="w-5 h-5" />} title="Definir equipo" time="2 min"
            description="Roles, salarios mensuales, disponibilidad, meses asignados, tipo de contratación."
            example='Ejemplo: "Líder técnico senior $45,000/mes 3 meses + Dev mid $28,000/mes 3 meses"' />
          <Step n={4} icon={<Calculator className="w-5 h-5" />} title="Configurar la estimación" time="1 min"
            description="Margen objetivo, capacidad semanal del equipo, supuestos de pago (anticipo, pagos por entregable, pago final)."
            example='Ejemplo: "Margen 20% · 80h/sem · 30/40/30 en 3 meses"' />
          <Step n={5} icon={<BarChart3 className="w-5 h-5" />} title="Cálculo automático" time="instantáneo"
            description="5 modos × 3 escenarios = 15 estimaciones simultáneas con costos, semanas, tiempo a prototipo y nivel de riesgo."
            example="Resultado: comparador completo + flujo de efectivo + capital de trabajo requerido." />
          <Step n={6} icon={<Wrench className="w-5 h-5" />} title="Generar reportes" time="instantáneo"
            description="Tres reportes distintos por audiencia. Cada uno se imprime o exporta a PDF con un clic."
            example="Reporte Ayuntamiento · Reporte proveedor · Reporte académico." />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Términos del sistema</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Term term="Capital de trabajo" def="Cantidad de dinero que necesita tener el proveedor antes de cobrar el primer pago. Si excede su capital declarado, hay riesgo financiero." />
          <Term term="UMA 2026" def="$117.31 diarios. Base para multas, IMSS, INFONAVIT. Distinto del salario mínimo." />
          <Term term="ISN Zacatecas" def="3.5% sobre la nómina, más 10% adicional para la UAZ. Carga combinada efectiva: 3.85%." />
          <Term term="Bytecoding" def="Generación de código mediante instrucciones en lenguaje natural. Prototipo 3.5× más rápido pero requiere mayor revisión y endurecimiento." />
          <Term term="Riesgo agregado" def="Suma de cinco riesgos: técnico + requerimientos + fiscal + flujo de efectivo + cambios. Niveles: bajo, medio, alto, crítico." />
          <Term term="Tres escenarios" def="Optimista (×0.85), Probable (×1.00), Conservador (×1.25 a ×1.80 según incertidumbre acumulada)." />
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Glosario completo: <Link href="/glossary" className="text-primary hover:underline">30 términos categorizados</Link>
        </p>
      </section>

      <section className="bg-card border rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Acciones</h2>
            <p className="text-sm text-muted-foreground">Crear un proyecto nuevo o abrir el demo capturado.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/projects/new">Crear proyecto</Link>
            </Button>
            {demoProject && (
              <Button variant="outline" asChild>
                <Link href={`/projects/${demoProject.id}`}>Abrir proyecto demo</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ n, icon, title, description, time, example }: { n: number; icon: React.ReactNode; title: string; description: string; time: string; example?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex gap-4">
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">{n}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="text-primary">{icon}</span>
                {title}
              </h3>
              <Badge variant="secondary" className="text-xs">{time}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            {example && <p className="text-xs text-muted-foreground italic bg-muted/50 px-3 py-2 rounded">{example}</p>}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center" />
        </div>
      </CardContent>
    </Card>
  );
}

function Term({ term, def }: { term: string; def: string }) {
  return (
    <div className="p-3 rounded-md border bg-card">
      <p className="font-semibold text-sm mb-1">{term}</p>
      <p className="text-xs text-muted-foreground">{def}</p>
    </div>
  );
}
