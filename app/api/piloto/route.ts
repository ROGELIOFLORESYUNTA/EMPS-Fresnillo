/**
 * POST /api/piloto: guarda una respuesta de la encuesta de salida del piloto.
 * Anónima (solo el workspace por cookie y su rol), una fila por respuesta,
 * y un evento en la bitácora para que salga en la exportación CSV.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

const bodySchema = z.object({
  projectId: z.string().min(1).max(64).nullable().optional(),
  credibilidad: z.number().int().min(1).max(5),
  cifraEsperada: z.number().min(0).max(1_000_000_000).nullable().optional(),
  totalMostrado: z.number().min(0).max(1_000_000_000).nullable().optional(),
  formaQueUsaria: z.string().max(40).nullable().optional(),
  comentario: z.string().max(600).nullable().optional(),
  segundosEnPantalla: z.number().int().min(0).max(86400).nullable().optional(),
});

export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No se pudo identificar tu espacio de trabajo. Recarga la página." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Faltan datos de la encuesta." }, { status: 400 });
  }
  const d = parsed.data;
  const fila = await prisma.pilotoRespuesta.create({
    data: {
      workspaceId: workspace.id,
      projectId: d.projectId ?? null,
      rol: workspace.role ?? null,
      credibilidad: d.credibilidad,
      cifraEsperada: d.cifraEsperada ?? null,
      totalMostrado: d.totalMostrado ?? null,
      formaQueUsaria: d.formaQueUsaria ?? null,
      comentario: d.comentario ?? null,
      segundosEnPantalla: d.segundosEnPantalla ?? null,
    },
  });
  await logWorkspaceActivity(workspace.id, "piloto_respuesta", {
    projectId: d.projectId ?? null,
    rol: workspace.role ?? null,
    credibilidad: d.credibilidad,
    cifraEsperada: d.cifraEsperada ?? null,
    totalMostrado: d.totalMostrado ?? null,
    formaQueUsaria: d.formaQueUsaria ?? null,
    segundosEnPantalla: d.segundosEnPantalla ?? null,
  });
  return NextResponse.json({ id: fila.id }, { status: 201 });
}
