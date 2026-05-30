/**
 * POST /api/projects/[id]/changes/[changeId]/preview-with-materials
 *
 * v8: corre el motor v7 (computeChangeImpact) sobre los inputs del cambio,
 * agrega los recursos materiales asociados (de DB o del payload), y devuelve
 * el desglose integrado (computeChangeWithMaterials).
 *
 * Útil para que el wizard de cambios muestre IVA, materiales y bache de caja
 * antes de aplicar decisión.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { changeImpactInputSchema, resourceCostSchema } from "@/lib/validators";
import { computeChangeImpact } from "@/lib/engine/change-impact";
import { computeChangeWithMaterials } from "@/lib/engine/change-materials";
import { loadChangeImpactParameters } from "@/lib/parameters";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  changeInput: changeImpactInputSchema,
  resources: z.array(resourceCostSchema).optional().default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; changeId: string }> },
) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, { maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento.", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const { id, changeId } = await params;
    const body = await req.json();
    const { changeInput, resources } = bodySchema.parse(body);

    const engineParams = await loadChangeImpactParameters(2026, "Zacatecas");
    const changeResult = computeChangeImpact(
      { ...changeInput, projectId: id, changeRequestId: changeId },
      engineParams,
    );

    // Si el payload no trae recursos, leer de DB los asociados a este changeRequest
    let resourcesToUse = resources;
    if (resourcesToUse.length === 0) {
      const dbResources = await prisma.projectResourceCost.findMany({
        where: { projectId: id, changeRequestId: changeId },
      });
      resourcesToUse = dbResources.map((r) => ({
        category: r.category,
        description: r.description,
        acquisitionMode: r.acquisitionMode,
        quantity: Number(r.quantity),
        unitCostBeforeVat: Number(r.unitCostBeforeVat),
        vatRate: Number(r.vatRate),
        vatCreditablePercent: Number(r.vatCreditablePercent),
        invoiceStatus: r.invoiceStatus,
        allocationPercent: Number(r.allocationPercent),
        monthsAllocated: Number(r.monthsAllocated),
        cashOutflowMonth: r.cashOutflowMonth,
        capitalizedAsset: r.capitalizedAsset,
        depreciationRateAnnual: r.depreciationRateAnnual ? Number(r.depreciationRateAnnual) : undefined,
        isRecurring: r.isRecurring,
      }));
    }

    const breakdown = computeChangeWithMaterials({
      changeImpact: changeResult,
      resources: resourcesToUse,
    });

    return NextResponse.json({
      changeImpact: changeResult,
      withMaterials: breakdown,
      parametersUsed: engineParams.loadedKeys,
      warnings: engineParams.fallbackWarnings,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
