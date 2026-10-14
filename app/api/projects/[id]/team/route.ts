import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { teamProfileCreateSchema } from "@/lib/validators";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";
import { conMensualDelPagoDiario } from "@/lib/engine/pago";
import { avisoDeSalarioMinimo, conMesesDeLasSemanas } from "@/lib/equipo-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acceso = await cargarProyectoConAcceso(id);
  if (!acceso.project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: acceso.status });
  const team = await prisma.teamProfile.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ team });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const acceso = await cargarProyectoConAcceso(id);
    if (!acceso.project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: acceso.status });
    const body = await req.json();
    // Pago por día: el mensual se calcula aquí (x 30.4). Semanas asignadas: también se guardan como meses.
    const data = conMesesDeLasSemanas(teamProfileCreateSchema.parse(conMensualDelPagoDiario(body)));
    const profile = await prisma.teamProfile.create({
      data: { ...data, projectId: id },
    });
    return NextResponse.json({ profile, avisoSalarioMinimo: await avisoDeSalarioMinimo(profile) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
