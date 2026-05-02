import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estimates = await prisma.estimate.findMany({
    where: { projectId: id },
    orderBy: [{ version: "desc" }, { mode: "asc" }, { scenario: "asc" }],
  });
  return NextResponse.json({ estimates });
}
