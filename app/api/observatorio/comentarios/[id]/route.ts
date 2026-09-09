/**
 * Revisión humana de un comentario ya analizado.
 *
 * Es la mitad que le falta al análisis automático: sin una muestra revisada a
 * mano no se puede reportar qué tanto coincide el modelo con una persona, y
 * sin ese dato el capítulo no se defiende.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

const updateSchema = z.object({
  coincideConHumano: z.boolean(),
  notaRevision: z.string().max(1000).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const data = updateSchema.parse(await req.json());
    const comentario = await prisma.observatorioComentario.update({
      where: { id },
      data: { ...data, revisadoPorHumano: true },
    });
    return NextResponse.json({ comentario });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
