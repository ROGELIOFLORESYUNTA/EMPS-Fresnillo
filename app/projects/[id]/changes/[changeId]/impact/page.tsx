import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";
import { ImpactWizardClient } from "./wizard-client";

export default async function ChangeImpactPage({
  params,
}: {
  params: Promise<{ id: string; changeId: string }>;
}) {
  const { id, changeId } = await params;
  // Dueño y lado: 404 si el proyecto es de otro workspace o del otro lado.
  const { project } = await cargarProyectoConAcceso(id);
  if (!project) notFound();
  const [change, assessment] = await Promise.all([
    prisma.changeRequest.findFirst({ where: { id: changeId, projectId: id } }),
    prisma.changeImpactAssessment.findUnique({ where: { changeRequestId: changeId } }),
  ]);
  if (!change) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Mis proyectos", href: "/projects" },
          { label: project.name, href: `/projects/${id}` },
          { label: "Cambios", href: `/projects/${id}/changes` },
          { label: "Evaluar cambio" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold">Evaluar cambio</h1>
        <p className="text-muted-foreground">
          Convierte una solicitud en lenguaje natural en impacto técnico, costo, días y decisión.
        </p>
      </div>
      <ImpactWizardClient
        projectId={id}
        changeId={changeId}
        initialDescription={change.clientOriginalText ?? change.description}
        existingAssessmentJson={assessment ? JSON.stringify(assessment) : null}
      />
    </div>
  );
}
