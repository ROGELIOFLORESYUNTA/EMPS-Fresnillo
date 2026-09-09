/**
 * Etapa 4: borrar el texto crudo vencido.
 *
 * Las politicas de YouTube obligan a borrar o refrescar los datos traidos de
 * su API a los 30 dias. Lo que se conserva es el analisis derivado, que es
 * trabajo propio: conteos, causas, y las citas cortas que respaldan cada dato.
 *
 * Correrlo de mas no hace daño: solo toca lo que ya vencio.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

const bodySchema = z.object({
  /** Solo cuenta lo que borraria, sin borrar. */
  simular: z.boolean().default(false),
  /** Para probar: tratar como vencido lo anterior a esta fecha. */
  comoSiFuera: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let opciones;
  try {
    opciones = bodySchema.parse(await req.json().catch(() => ({})));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }

  const corte = opciones.comoSiFuera ? new Date(opciones.comoSiFuera) : new Date();
  const donde = {
    textoExpiraEl: { lte: corte },
    textoOriginal: { not: null },
  };

  const cuantos = await prisma.observatorioComentario.count({ where: donde });

  if (opciones.simular) {
    return NextResponse.json({ simulacion: true, seBorrarian: cuantos, corte });
  }

  // Se vacia el texto crudo y se deja todo el analisis intacto.
  const r = await prisma.observatorioComentario.updateMany({
    where: donde,
    data: { textoOriginal: null },
  });

  const sinAnalizarYSinTexto = await prisma.observatorioComentario.count({
    where: { analizadoEl: null, textoOriginal: null },
  });

  return NextResponse.json({
    textosBorrados: r.count,
    corte,
    sinAnalizarYSinTexto,
    nota:
      sinAnalizarYSinTexto > 0
        ? `Hay ${sinAnalizarYSinTexto} comentarios que vencieron antes de analizarse. Ya no se pueden analizar; conviene cosechar y analizar más seguido.`
        : "Todo lo vencido ya estaba analizado.",
  });
}
