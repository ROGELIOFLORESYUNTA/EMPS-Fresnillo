import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storyCreateSchema } from "@/lib/validators";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stories = await prisma.userStory.findMany({
    where: { moduleId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ stories });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = storyCreateSchema.parse(body);
    const story = await prisma.userStory.create({
      data: { ...data, moduleId: id },
    });
    return NextResponse.json({ story }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
