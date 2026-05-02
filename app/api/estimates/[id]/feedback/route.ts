import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const feedbackSchema = z.object({
  reviewerRole: z.enum(["ayuntamiento", "proveedor", "auditor", "estimador", "admin"]).optional(),
  feedbackType: z.enum(["alcance", "costo", "tiempo", "riesgo", "parametros", "metodologia"]).optional(),
  feedbackText: z.string().min(2),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const items = await prisma.estimationFeedback.findMany({
    where: { estimateId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ feedback: items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = feedbackSchema.parse(body);
    const item = await prisma.estimationFeedback.create({
      data: { ...data, estimateId: id },
    });
    return NextResponse.json({ feedback: item }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
