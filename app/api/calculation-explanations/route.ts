/**
 * GET /api/calculation-explanations?entityType=...&entityId=...
 *
 * v7: lista las explicaciones de cálculo registradas (auditoría académica).
 * Útil para reproducir cálculos pasados o exportar evidencia para el artículo.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculationExplanationQuerySchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = calculationExplanationQuerySchema.parse({
      entityType: url.searchParams.get("entityType") ?? undefined,
      entityId: url.searchParams.get("entityId") ?? undefined,
    });

    const where: { entityType?: string; entityId?: string } = {};
    if (q.entityType) where.entityType = q.entityType;
    if (q.entityId) where.entityId = q.entityId;

    const items = await prisma.calculationExplanation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      count: items.length,
      explanations: items.map((it) => ({
        ...it,
        input: it.inputJson ? JSON.parse(it.inputJson) : null,
        output: it.outputJson ? JSON.parse(it.outputJson) : null,
        source: it.sourceJson ? JSON.parse(it.sourceJson) : null,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
