import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { changeRequestUpdateSchema } from "@/lib/validators";
import { puedeAbrirProyecto } from "@/lib/acceso-proyecto";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const before = await prisma.changeRequest.findUnique({ where: { id } });
    // Un cambio se decide o se edita solo desde el proyecto al que pertenece (dueño y lado).
    if (!before || !(await puedeAbrirProyecto(before.projectId))) {
      return NextResponse.json({ error: "no encontrado" }, { status: 404 });
    }
    const body = await req.json();
    const data = changeRequestUpdateSchema.parse(body);
    const change = await prisma.changeRequest.update({
      where: { id },
      data: {
        ...data,
        decidedAt: data.decision && data.decision !== "pendiente" ? new Date() : undefined,
      },
    });
    await prisma.auditLog.create({
      data: {
        entity: "ChangeRequest",
        entityId: change.id,
        action: "update",
        before: JSON.stringify(before),
        after: JSON.stringify(change),
      },
    });
    return NextResponse.json({ change });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
