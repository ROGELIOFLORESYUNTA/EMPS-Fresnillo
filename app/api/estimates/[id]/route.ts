import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { puedeAbrirProyecto } from "@/lib/acceso-proyecto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  // La estimación trae costos y nómina: solo la ve quien puede abrir su proyecto.
  if (!estimate || !(await puedeAbrirProyecto(estimate.projectId))) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ estimate });
}
