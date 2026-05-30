import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Database,
  BrainCircuit,
  Activity,
  TrendingUp,
  History,
  GraduationCap,
  FileBarChart,
  MessageSquare,
  ClipboardCheck,
  Users,
} from "lucide-react";

export const metadata = {
  title: "Investigación - EMPS Fresnillo",
};

export default async function InvestigacionPage() {
  const [
    datasetsCount,
    mlModelsCount,
    liveSourcesCount,
    auditCount,
    trainingCount,
    actualResultsCount,
    feedbackCount,
    projectsCount,
    usersCount,
  ] = await Promise.all([
    prisma.estimationDatasetSource.count(),
    prisma.mLModelRegistry.count(),
    prisma.liveSourceRegistry.count({ where: { active: true } }),
    prisma.auditLog.count(),
    prisma.trainingCase.count(),
    prisma.projectActualResult.count(),
    prisma.estimationFeedback.count(),
    prisma.project.count(),
    prisma.user.count(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Investigación" }]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6" />
          Zona de investigación
        </h1>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Esta zona reúne la evidencia que alimenta el artículo de tesis. No es necesaria para operar el estimador. Aquí se registran datasets externos, modelos predictivos, fuentes oficiales monitoreadas, casos reales para validar la hipótesis y reportes académicos.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ResearchCard
          href="/investigacion/datasets"
          icon={<Database className="w-5 h-5" />}
          title="Datasets"
          description="Catálogo de bancos de datos externos (Public Jira, JOSSE, SEERA, Zenodo) usados para calibrar el motor o citar en el artículo."
          badge={datasetsCount}
        />
        <ResearchCard
          href="/investigacion/modelos-ml"
          icon={<BrainCircuit className="w-5 h-5" />}
          title="Modelos ML"
          description="Registro de modelos entrenados, sus métricas y su estado de aprobación. Hoy el motor no usa ML; esta sección es para cuando haya un modelo entrenado."
          badge={mlModelsCount}
        />
        <ResearchCard
          href="/investigacion/fuentes-vivas"
          icon={<Activity className="w-5 h-5" />}
          title="Fuentes vivas"
          description="Monitoreo de portales oficiales (SAT, DOF, INEGI, SEFIN) para detectar cambios fiscales y laborales que afecten al motor."
          badge={liveSourcesCount}
        />
        <ResearchCard
          href="/investigacion/comparador-tecnico"
          icon={<TrendingUp className="w-5 h-5" />}
          title="Comparador técnico"
          description="Coeficientes y velocidades de los 5 modos de desarrollo (traditional, ai_assisted, hybrid, bytecoding, low_code) según el motor."
        />
        <ResearchCard
          href="/investigacion/bitacora"
          icon={<History className="w-5 h-5" />}
          title="Bitácora"
          description="Historial completo de cambios del sistema para auditoría académica y reproducibilidad."
          badge={auditCount}
        />
        <ResearchCard
          href="/investigacion/casos-entrenamiento"
          icon={<ClipboardCheck className="w-5 h-5" />}
          title="Casos de entrenamiento"
          description="Casos históricos (públicos, locales y simulados) que alimentan los modelos de ML."
          badge={trainingCount}
          emptyHint={trainingCount === 0 ? "Vacío hoy" : undefined}
        />
        <ResearchCard
          href="/investigacion/resultados-reales"
          icon={<FileBarChart className="w-5 h-5" />}
          title="Resultados reales"
          description="Costo y tiempo realmente observado al cerrar un proyecto, para comparar contra la estimación inicial."
          badge={actualResultsCount}
          emptyHint={actualResultsCount === 0 ? "Vacío hoy" : undefined}
        />
        <ResearchCard
          href="/investigacion/feedback-estimaciones"
          icon={<MessageSquare className="w-5 h-5" />}
          title="Feedback de estimaciones"
          description="Comentarios cualitativos de revisores sobre estimaciones existentes. Complementa los números con la voz de quien las usó."
          badge={feedbackCount}
          emptyHint={feedbackCount === 0 ? "Vacío hoy" : undefined}
        />
        <ResearchCard
          href="/investigacion/reportes-academicos"
          icon={<GraduationCap className="w-5 h-5" />}
          title="Reportes académicos"
          description="Selector de proyecto que abre la versión académica del reporte (5 modos × 3 escenarios, evidencia para validar la hipótesis)."
          badge={projectsCount}
        />
        <ResearchCard
          href="/investigacion/exportar-cambios"
          icon={<FileBarChart className="w-5 h-5" />}
          title="Exportar evidencia de cambios"
          description="Descarga JSON o CSV con todas las evaluaciones de impacto de cambios (motor v7) para anexar al artículo o validación externa."
        />
        <ResearchCard
          href="/investigacion/usuarios-y-roles"
          icon={<Users className="w-5 h-5" />}
          title="Usuarios y roles"
          description="Administración de los 5 roles del sistema: admin, estimador, ayuntamiento, proveedor, auditor."
          badge={usersCount}
        />
      </div>
    </div>
  );
}

function ResearchCard({
  href,
  icon,
  title,
  description,
  badge,
  emptyHint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: number;
  emptyHint?: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:bg-accent/40 hover:border-primary/30 transition-all cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-primary">{icon}</div>
            <div className="flex items-center gap-2">
              {emptyHint && <span className="text-[10px] text-amber-700 italic">{emptyHint}</span>}
              {badge !== undefined && <Badge variant="outline" className="text-xs">{badge}</Badge>}
            </div>
          </div>
          <h3 className="font-medium text-sm mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
