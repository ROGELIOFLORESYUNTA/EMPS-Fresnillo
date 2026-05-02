import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "decimal.js";
import { z } from "zod";

const createSchema = z.object({
  sourceKind: z.enum(["public_dataset", "local_capture", "simulated_case"]),
  sourceRecordId: z.string().optional(),
  projectType: z.string().optional(),
  municipalArea: z.string().optional(),
  moduleCount: z.number().int().min(0).optional(),
  userStoryCount: z.number().int().min(0).optional(),
  integrationCount: z.number().int().min(0).optional(),
  screenCount: z.number().int().min(0).optional(),
  reportCount: z.number().int().min(0).optional(),
  sensitiveData: z.boolean().default(false),
  requirementsClarity: z.number().min(0).max(100).optional(),
  stakeholderAvailability: z.number().min(0).max(100).optional(),
  changeVolatility: z.number().min(0).max(100).optional(),
  teamExperience: z.number().min(0).max(100).optional(),
  devModeCode: z.enum(["traditional", "ai_assisted", "bytecoding_prompts", "low_code", "hybrid"]).optional(),
  estimatedEffortHours: z.number().min(0).optional(),
  actualEffortHours: z.number().min(0).optional(),
  estimatedCostMxn: z.number().min(0).optional(),
  actualCostMxn: z.number().min(0).optional(),
  changeCount: z.number().int().min(0).optional(),
  maintenanceMonths: z.number().int().min(0).optional(),
  fiscalLaborRiskScore: z.number().min(0).max(100).optional(),
  paymentScheme: z.string().optional(),
  rawFeatures: z.unknown().optional(),
  labelQuality: z.enum(["unknown", "weak", "moderate", "strong"]).default("unknown"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sourceKind = url.searchParams.get("sourceKind");
  const devMode = url.searchParams.get("devMode");
  const where: { sourceKind?: string; devModeCode?: string } = {};
  if (sourceKind) where.sourceKind = sourceKind;
  if (devMode) where.devModeCode = devMode;
  const cases = await prisma.trainingCase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ cases });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const decFields = ["requirementsClarity", "stakeholderAvailability", "changeVolatility", "teamExperience",
      "estimatedEffortHours", "actualEffortHours", "estimatedCostMxn", "actualCostMxn", "fiscalLaborRiskScore"] as const;
    const payload: Record<string, unknown> = { ...data };
    for (const f of decFields) {
      if (data[f] !== undefined) payload[f] = new Decimal(data[f] as number);
    }
    if (data.rawFeatures !== undefined) payload.rawFeatures = JSON.stringify(data.rawFeatures);
    const created = await prisma.trainingCase.create({ data: payload as never });
    return NextResponse.json({ case: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
