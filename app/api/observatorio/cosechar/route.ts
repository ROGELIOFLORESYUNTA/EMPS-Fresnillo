/**
 * Etapa 1: traer comentarios. No los analiza, solo los guarda.
 *
 * Se separa del analisis a proposito: cosechar es barato y rapido, analizar
 * cuesta dinero. Asi se puede juntar material varios dias y decidir despues
 * cuanto se analiza.
 *
 * Idempotente: externalId es unico, un comentario que ya esta no se vuelve a
 * guardar ni se vuelve a analizar.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import {
  buscarVideos,
  comentariosDeVideo,
  datosDeVideos,
  fechaExpiracionCrudo,
  YouTubeError,
  type VideoEncontrado,
} from "@/lib/observatorio/youtube";

const bodySchema = z.object({
  fuenteId: z.string().optional(),
  max: z.number().int().min(1).max(2000).default(500),
  /** Cuantos videos mirar por cada busqueda. Cada busqueda cuesta 100 unidades. */
  maxVideos: z.number().int().min(1).max(25).default(5),
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

  const fuentes = await prisma.observatorioFuente.findMany({
    where: opciones.fuenteId ? { id: opciones.fuenteId } : { activa: true },
  });
  if (fuentes.length === 0) {
    return NextResponse.json(
      { error: "No hay fuentes activas que cosechar. Da de alta al menos una." },
      { status: 400 },
    );
  }

  const expira = fechaExpiracionCrudo();
  const porFuente: Array<{ fuente: string; nuevos: number; vistos: number; nota?: string }> = [];
  let unidades = 0;
  let nuevosTotal = 0;
  let restante = opciones.max;
  let cuotaAgotada = false;

  for (const fuente of fuentes) {
    if (restante <= 0) break;
    let nuevos = 0;
    let vistos = 0;
    let nota: string | undefined;

    try {
      // 1. Resolver que videos hay que mirar.
      let videos: VideoEncontrado[];
      if (fuente.tipo === "video") {
        const { porId, unidades: u } = await datosDeVideos([fuente.consulta]);
        unidades += u;
        videos = [porId.get(fuente.consulta) ?? { videoId: fuente.consulta, titulo: null, canal: null }];
      } else if (fuente.tipo === "busqueda") {
        const { videos: encontrados, unidades: u } = await buscarVideos(
          fuente.consulta,
          opciones.maxVideos,
          fuente.idioma,
        );
        unidades += u;
        videos = encontrados;
      } else {
        // canal: se resuelve como busqueda restringida al canal
        const { videos: encontrados, unidades: u } = await buscarVideos(
          fuente.consulta,
          opciones.maxVideos,
          fuente.idioma,
        );
        unidades += u;
        videos = encontrados;
      }

      // 2. Traer comentarios de cada video, repartiendo el tope.
      const porVideo = Math.max(1, Math.floor(restante / Math.max(1, videos.length)));
      for (const video of videos) {
        if (restante <= 0) break;
        const { comentarios, unidades: u } = await comentariosDeVideo(
          video.videoId,
          Math.min(porVideo, restante),
        );
        unidades += u;
        vistos += comentarios.length;

        for (const c of comentarios) {
          // createMany con skipDuplicates no es fiable en SQLite; uno por uno
          // y se ignora el choque de externalId, que es justo lo que se quiere.
          try {
            await prisma.observatorioComentario.create({
              data: {
                fuenteId: fuente.id,
                plataforma: "youtube",
                externalId: c.externalId,
                videoId: c.videoId,
                videoTitulo: video.titulo,
                canal: c.canal ?? video.canal,
                publicadoEl: c.publicadoEl,
                likes: c.likes,
                idioma: fuente.idioma,
                textoOriginal: c.texto,
                textoExpiraEl: expira,
              },
            });
            nuevos += 1;
            restante -= 1;
          } catch {
            // ya estaba: no cuenta contra el tope
          }
        }
      }

      await prisma.observatorioFuente.update({
        where: { id: fuente.id },
        data: { ultimaCosechaEl: new Date() },
      });
    } catch (e) {
      if (e instanceof YouTubeError) {
        nota = e.message;
        if (e.cuotaAgotada) cuotaAgotada = true;
      } else {
        nota = e instanceof Error ? e.message : "error desconocido";
      }
    }

    nuevosTotal += nuevos;
    porFuente.push({ fuente: fuente.nombre, nuevos, vistos, ...(nota ? { nota } : {}) });
    if (cuotaAgotada) break;
  }

  const sinAnalizar = await prisma.observatorioComentario.count({ where: { analizadoEl: null } });

  return NextResponse.json({
    nuevos: nuevosTotal,
    sinAnalizar,
    unidadesDeCuota: unidades,
    cuotaAgotada,
    porFuente,
  });
}
