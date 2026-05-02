import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const metricSchema = z.object({
  datasetSplit: z.enum(["train", "validation", "test", "local"]),
  metricName: z.enum([
    "mae", "rmse", "mape", "r2", "range_coverage_pct",
    "error_by_mode", "error_by_size", "error_by_project_type",
  ]),
  metricValue: z.number(),
  sampleSize: z.number().int().min(1).optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const metrics = await prisma.mLModelMetric.findMany({
    where: { modelId: id },
    orderBy: [{ datasetSplit: "asc" }, { metricName: "asc" }],
  });
  return NextResponse.json({ metrics });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = metricSchema.parse(body);
    const metric = await prisma.mLModelMetric.create({
      data: { ...data, modelId: id },
    });
    return NextResponse.json({ metric }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
