import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  modelKey: z.enum(["effort_range_model", "change_risk_model", "cost_deviation_model", "mode_factor_model"]),
  modelName: z.string().min(2),
  targetVariable: z.string().min(2),
  algorithm: z.enum(["linear_regression", "random_forest", "gradient_boosting", "xgboost", "neural_network", "rules_only"]),
  trainingDatasetNotes: z.string().optional(),
  featureSchema: z.unknown().optional(),
  modelArtifactPath: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where = status ? { status } : {};
  const models = await prisma.mLModelRegistry.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { metrics: true, predictions: true } } },
  });
  return NextResponse.json({ models });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const model = await prisma.mLModelRegistry.create({
      data: {
        ...data,
        featureSchema: data.featureSchema !== undefined ? JSON.stringify(data.featureSchema) : null,
      },
    });
    return NextResponse.json({ model }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
