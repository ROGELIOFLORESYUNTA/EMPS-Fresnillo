import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { changeRequestCreateSchema } from "@/lib/validators";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const changes = await prisma.changeRequest.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ changes });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = changeRequestCreateSchema.parse(body);
    const change = await prisma.changeRequest.create({
      data: { ...data, projectId: id },
    });
    await prisma.auditLog.create({
      data: { entity: "ChangeRequest", entityId: change.id, action: "create", after: JSON.stringify(change) },
    });
    return NextResponse.json({ change }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
