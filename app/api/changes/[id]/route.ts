import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { changeRequestUpdateSchema } from "@/lib/validators";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = changeRequestUpdateSchema.parse(body);
    const before = await prisma.changeRequest.findUnique({ where: { id } });
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
        before: before ? JSON.stringify(before) : null,
        after: JSON.stringify(change),
      },
    });
    return NextResponse.json({ change });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
