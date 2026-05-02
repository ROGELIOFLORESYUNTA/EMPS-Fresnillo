import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { teamProfileCreateSchema } from "@/lib/validators";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await prisma.teamProfile.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ team });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = teamProfileCreateSchema.parse(body);
    const profile = await prisma.teamProfile.create({
      data: { ...data, projectId: id },
    });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
