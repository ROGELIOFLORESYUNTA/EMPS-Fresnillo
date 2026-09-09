/**
 * Listado de comentarios con su análisis, para la pantalla y para revisar a mano.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const url = new URL(req.url);
  const filtro = url.searchParams.get("filtro") ?? "testimonios";
  const take = Math.min(200, Number(url.searchParams.get("take") ?? 50) || 50);

  const where =
    filtro === "testimonios"
      ? { esTestimonio: true }
      : filtro === "descartados"
        ? { esTestimonio: false }
        : filtro === "sin_analizar"
          ? { analizadoEl: null, errorAnalisis: null }
          : filtro === "fallidos"
            ? { errorAnalisis: { not: null } }
            : filtro === "por_revisar"
              ? { esTestimonio: true, revisadoPorHumano: false }
              : {};

  const comentarios = await prisma.observatorioComentario.findMany({
    where,
    orderBy: [{ analizadoEl: "desc" }, { cosechadoEl: "desc" }],
    take,
    include: { fuente: { select: { nombre: true } } },
  });

  return NextResponse.json({ comentarios });
}
