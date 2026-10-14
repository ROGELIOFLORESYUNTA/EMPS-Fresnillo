import { prisma } from "@/lib/db";
import { filtroDeLado } from "@/lib/acceso-proyecto";
import { getLado } from "@/lib/lado-server";
import { CotizarDesarrollador } from "@/components/cotizar-desarrollador";
import { CotizarMunicipal } from "@/components/cotizar-municipal";

export const metadata = {
  title: "Cotizar en un minuto",
  description: "Di qué sistema te piden y en un minuto tienes precio, tiempo y si te alcanza.",
};

/**
 * Cotizar en un minuto cambia por lado (lib/lado.ts): el desarrollador lo
 * hace en tres pasos, de uno en uno; el Ayuntamiento conserva el formulario
 * de una sola pantalla.
 */
export default async function CotizarPage() {
  const lado = await getLado();
  if (lado === "ayuntamiento") return <CotizarMunicipal />;

  // El ejemplo del desarrollador, para quien prefiere verlo antes de llenar nada.
  const ejemplo = await prisma.project.findFirst({
    where: { isTemplate: true, ...filtroDeLado("desarrollador") },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return <CotizarDesarrollador ejemploId={ejemplo?.id ?? null} />;
}
