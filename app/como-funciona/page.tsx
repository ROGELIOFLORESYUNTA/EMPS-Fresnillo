import { prisma } from "@/lib/db";
import { getLado } from "@/lib/lado-server";
import { filtroDeLado } from "@/lib/acceso-proyecto";
import { ComoFuncionaAyuntamiento } from "@/components/como-funciona-ayuntamiento";
import { ComoFuncionaDesarrollador } from "@/components/como-funciona-desarrollador";
import { mesesDeSemanas } from "@/lib/graficas";

export const metadata = {
  title: "Cómo funciona",
  description: "Describes lo que te piden, comparas cinco formas de hacerlo y llevas la cotización.",
};

/**
 * Cómo funciona cambia por lado (lib/lado.ts): el desarrollador ve tres pasos
 * con la captura real de cada pantalla; el Ayuntamiento, el tutorial de seis
 * pasos con sus términos. Cada lado abre solo su ejemplo.
 */
export default async function HowItWorksPage() {
  const lado = await getLado();
  // Se busca por la marca de ejemplo público, no por el nombre: así el botón
  // sigue funcionando aunque el proyecto de ejemplo cambie de título.
  const demoProject = await prisma.project.findFirst({
    where: { isTemplate: true, ...filtroDeLado(lado) },
    select: { id: true, name: true },
  });

  if (lado === "ayuntamiento") return <ComoFuncionaAyuntamiento demoProject={demoProject} />;

  // La cifra del problema sale del propio ejemplo: lo que cuesta a mano contra casi todo con IA.
  let contraste: { aMano: number; conIA: number; meses: number | null } | null = null;
  if (demoProject) {
    const estimaciones = await prisma.estimate.findMany({
      where: { projectId: demoProject.id, scenario: "probable", mode: { in: ["traditional", "bytecoding_prompts"] } },
      orderBy: { version: "desc" },
      select: { mode: true, total: true, weeksTotal: true },
    });
    const aMano = estimaciones.find((e) => e.mode === "traditional");
    const conIA = estimaciones.find((e) => e.mode === "bytecoding_prompts");
    if (aMano && conIA) {
      contraste = {
        aMano: Number(aMano.total),
        conIA: Number(conIA.total),
        meses: conIA.weeksTotal != null ? mesesDeSemanas(Number(conIA.weeksTotal)) : null,
      };
    }
  }
  return <ComoFuncionaDesarrollador ejemplo={demoProject} contraste={contraste} />;
}
