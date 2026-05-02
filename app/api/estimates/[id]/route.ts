import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  return NextResponse.json({ estimate });
}
