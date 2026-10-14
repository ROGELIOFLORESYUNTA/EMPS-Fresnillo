import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acceso = await cargarProyectoConAcceso(id);
  if (!acceso.project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: acceso.status });
  const estimates = await prisma.estimate.findMany({
    where: { projectId: id },
    orderBy: [{ version: "desc" }, { mode: "asc" }, { scenario: "asc" }],
  });
  return NextResponse.json({ estimates });
}
