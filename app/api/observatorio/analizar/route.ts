/**
 * Etapa 2: analizar lo cosechado, un comentario a la vez.
 *
 * Tres frenos para que nunca se dispare el gasto:
 *   1. tope por corrida (max, 200 por omision)
 *   2. tope mensual en dolares (OBSERVATORIO_TOPE_MENSUAL_USD)
 *   3. si un comentario falla se marca y se sigue; nunca se cae la corrida
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { analizarComentario, costoEstimado, AnalisisError, MODELO } from "@/lib/observatorio/analisis";

const bodySchema = z.object({
  max: z.number().int().min(1).max(1000).default(200),
  /** Solo estima el costo y no gasta nada. */
  simular: z.boolean().default(false),
});

function topeMensualUsd(): number {
  const raw = Number(process.env.OBSERVATORIO_TOPE_MENSUAL_USD);
  return Number.isFinite(raw) && raw > 0 ? raw : 25;
}

/** Lo gastado en el mes en curso, sumando lo que ya se analizo. */
async function gastadoEsteMes(): Promise<number> {
  const inicio = new Date();
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  const analizados = await prisma.observatorioComentario.count({
    where: { analizadoEl: { gte: inicio } },
  });
  return costoEstimado(analizados);
}

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

  const pendientes = await prisma.observatorioComentario.findMany({
    where: { analizadoEl: null, errorAnalisis: null, textoOriginal: { not: null } },
    orderBy: { cosechadoEl: "asc" },
    take: opciones.max,
    select: { id: true, textoOriginal: true, videoTitulo: true, canal: true },
  });

  const tope = topeMensualUsd();
  const gastado = await gastadoEsteMes();
  const estimado = costoEstimado(pendientes.length);

  if (opciones.simular) {
    return NextResponse.json({
      simulacion: true,
      pendientes: pendientes.length,
      costoEstimadoUsd: Number(estimado.toFixed(2)),
      gastadoEsteMesUsd: Number(gastado.toFixed(2)),
      topeMensualUsd: tope,
      alcanza: gastado + estimado <= tope,
    });
  }

  if (gastado >= tope) {
    return NextResponse.json(
      {
        error: `Ya se llego al tope del mes (${tope} dolares). Sube OBSERVATORIO_TOPE_MENSUAL_USD o espera al mes que entra.`,
        gastadoEsteMesUsd: Number(gastado.toFixed(2)),
        topeMensualUsd: tope,
      },
      { status: 429 },
    );
  }

  let analizados = 0;
  let testimonios = 0;
  let fallidos = 0;
  let costoReal = 0;
  let detenidoPorTope = false;

  for (const c of pendientes) {
    if (gastado + costoReal >= tope) {
      detenidoPorTope = true;
      break;
    }
    if (!c.textoOriginal) continue;

    try {
      const { analisis, costoUsd } = await analizarComentario(c.textoOriginal, {
        videoTitulo: c.videoTitulo,
        canal: c.canal,
      });
      costoReal += costoUsd;

      await prisma.observatorioComentario.update({
        where: { id: c.id },
        data: {
          analizadoEl: new Date(),
          modeloUsado: MODELO,
          esTestimonio: analisis.esTestimonio,
          quienHabla: analisis.quienHabla,
          duracionDeclaradaMeses: analisis.duracionDeclaradaMeses,
          montoDeclarado: analisis.montoDeclarado,
          moneda: analisis.moneda,
          tamanoEquipo: analisis.tamanoEquipo,
          desviacion: analisis.desviacion,
          desviacionPct: analisis.desviacionPct,
          causasJson: JSON.stringify(analisis.causas),
          confianza: analisis.confianza,
          citasJson: JSON.stringify(analisis.citas),
          razonamiento: analisis.razonamiento,
          errorAnalisis: null,
        },
      });
      analizados += 1;
      if (analisis.esTestimonio) testimonios += 1;
    } catch (e) {
      // Falta de llave: no tiene caso seguir intentando con los demas.
      if (e instanceof AnalisisError && e.status === 503) {
        return NextResponse.json({ error: e.message }, { status: 503 });
      }
      fallidos += 1;
      await prisma.observatorioComentario.update({
        where: { id: c.id },
        data: { errorAnalisis: (e instanceof Error ? e.message : "error").slice(0, 400) },
      });
    }
  }

  const sinAnalizar = await prisma.observatorioComentario.count({
    where: { analizadoEl: null, errorAnalisis: null },
  });

  return NextResponse.json({
    analizados,
    testimonios,
    descartados: analizados - testimonios,
    fallidos,
    sinAnalizar,
    detenidoPorTope,
    costoDeEstaCorridaUsd: Number(costoReal.toFixed(4)),
    gastadoEsteMesUsd: Number((gastado + costoReal).toFixed(2)),
    topeMensualUsd: tope,
  });
}
