import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storyCreateSchema } from "@/lib/validators";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = storyCreateSchema.partial().parse(body);
    const story = await prisma.userStory.update({ where: { id }, data });
    return NextResponse.json({ story });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.userStory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
