/**
 * Fuentes del observatorio: qué se va a cosechar.
 *
 * Solo investigador. GET incluido: son datos de investigación, no públicos.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

const createSchema = z.object({
  nombre: z.string().min(2).max(200),
  tipo: z.enum(["busqueda", "canal", "video"]),
  consulta: z.string().min(2).max(500),
  idioma: z.string().max(5).optional().nullable(),
  activa: z.boolean().default(true),
  notas: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const fuentes = await prisma.observatorioFuente.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { comentarios: true } } },
  });
  return NextResponse.json({ fuentes });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  try {
    const data = createSchema.parse(await req.json());
    const fuente = await prisma.observatorioFuente.create({
      data: { ...data, plataforma: "youtube" },
    });
    return NextResponse.json({ fuente }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
