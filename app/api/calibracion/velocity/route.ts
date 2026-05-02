import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const modeSchema = z.object({
  velocity_factor: z.number().min(0.1).max(20),
  prototype_speedup: z.number().min(0.1).max(50),
  hardening_overhead: z.number().min(0).max(1),
  effort_efficiency: z.number().min(0.1).max(2.0).optional(),
  prototype_quality_factor: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  evidencia: z.string().optional(),
});

const bodySchema = z.object({
  traditional: modeSchema,
  ai_assisted: modeSchema,
  bytecoding_prompts: modeSchema,
  low_code: modeSchema,
  hybrid: modeSchema,
});

export async function GET() {
  const param = await prisma.parameter.findFirst({
    where: { key: "DEV_MODE_VELOCITY", year: 2026 },
  });
  if (!param || !param.value) {
    return NextResponse.json({ error: "Parámetro DEV_MODE_VELOCITY no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ velocity: JSON.parse(param.value) });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bodySchema.parse(body);

    const param = await prisma.parameter.findFirst({
      where: { key: "DEV_MODE_VELOCITY", year: 2026 },
    });
    if (!param) {
      return NextResponse.json({ error: "Parámetro no encontrado" }, { status: 404 });
    }

    // Conservar metadata previa (semantica, evidencia, etc.)
    const existing = JSON.parse(param.value ?? "{}");
    const merged = { ...existing, ...data };

    await prisma.parameter.update({
      where: { id: param.id },
      data: { value: JSON.stringify(merged) },
    });

    await prisma.auditLog.create({
      data: {
        entity: "Parameter",
        entityId: param.id,
        action: "update",
        before: JSON.stringify(existing),
        after: JSON.stringify(merged),
        context: "Calibración manual de velocity_factor / prototype_speedup / hardening_overhead",
      },
    });

    return NextResponse.json({
      message: "Calibración guardada. Las próximas estimaciones usarán estos valores. Estimaciones existentes conservan su snapshot.",
      velocity: merged,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400 });
  }
}
