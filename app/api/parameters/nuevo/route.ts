import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  country: z.string().default("Mexico"),
  state: z.string().nullable().optional(),
  key: z.string().min(2),
  value: z.string().nullable().optional(),
  unit: z.string().min(1),
  base: z.string().nullable().optional(),
  source: z.string().min(2),
  sourceUrl: z.string().url().nullable().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const parameter = await prisma.parameter.create({
      data: {
        ...data,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "Parameter",
        entityId: parameter.id,
        action: "create",
        after: JSON.stringify(parameter),
        context: `Nuevo parámetro ${parameter.key} (año ${parameter.year})`,
      },
    });

    return NextResponse.json({ parameter }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400 });
  }
}
