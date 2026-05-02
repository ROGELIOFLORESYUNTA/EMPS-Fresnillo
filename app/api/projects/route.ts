import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectCreateSchema } from "@/lib/validators";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { modules: true, estimates: true, changes: true } },
    },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = projectCreateSchema.parse(body);
    const project = await prisma.project.create({
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        estimatedBudget: data.estimatedBudget ?? null,
      },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
