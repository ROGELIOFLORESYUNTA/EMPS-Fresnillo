import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

/**
 * Carga masiva de parámetros para un año fiscal.
 * Acepta un objeto con la misma estructura que 17_seed_data_parametros_2026.json:
 *   { year, country, state, parameters: [...] }
 *
 * Por cada parámetro: si ya existe (year+country+state+key+effectiveFrom) lo actualiza,
 * si no existe lo crea. No borra los antiguos — para eso está DELETE individual.
 */

const paramSchema = z.object({
  key: z.string().min(2),
  value: z.union([z.number(), z.string(), z.null()]).optional(),
  unit: z.string().min(1),
  base: z.string().optional(),
  source: z.string().min(2),
  source_url: z.string().url().optional(),
  effective_from: z.string(),
  effective_until: z.string().optional(),
  notes: z.string().optional(),
  table: z.record(z.unknown()).optional(),
});

const bodySchema = z.object({
  year: z.number().int().min(2020).max(2100),
  country: z.string().default("Mexico"),
  state: z.string().optional(),
  parameters: z.array(paramSchema),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bodySchema.parse(body);

    let created = 0;
    let updated = 0;

    for (const p of data.parameters) {
      const valueStr =
        p.value === null || p.value === undefined
          ? p.table
            ? JSON.stringify(p.table)
            : null
          : String(p.value);

      const updateData = {
        value: valueStr,
        unit: p.unit,
        base: p.base ?? null,
        source: p.source,
        sourceUrl: p.source_url ?? null,
        effectiveUntil: p.effective_until ? new Date(p.effective_until) : null,
        notes: p.notes ?? null,
      };

      // findFirst soporta state null (findUnique con clave compuesta no en TS estricto).
      const existing = await prisma.parameter.findFirst({
        where: {
          year: data.year,
          country: data.country,
          state: data.state ?? null,
          key: p.key,
          effectiveFrom: new Date(p.effective_from),
        },
      });
      if (existing) {
        await prisma.parameter.update({ where: { id: existing.id }, data: updateData });
        updated++;
      } else {
        await prisma.parameter.create({
          data: {
            year: data.year,
            country: data.country,
            state: data.state ?? null,
            key: p.key,
            effectiveFrom: new Date(p.effective_from),
            ...updateData,
          },
        });
        created++;
      }
    }

    await prisma.auditLog.create({
      data: {
        entity: "Parameter",
        entityId: "load-year",
        action: "create",
        context: `Carga masiva año ${data.year}: ${created} creados, ${updated} actualizados`,
        after: JSON.stringify({ year: data.year, created, updated }),
      },
    });

    return NextResponse.json({
      message: `Carga año ${data.year} completada`,
      created,
      updated,
      total: created + updated,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400 });
  }
}
