/**
 * POST /api/projects/[id]/resources/preview
 *
 * v8: estima el impacto de una LISTA de recursos sin persistir.
 * Útil cuando el operador captura recursos en el wizard y quiere ver
 * el desglose (IVA, bache, recurrente) antes de guardar.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resourceCostSchema } from "@/lib/validators";
import { computeResourceSummary } from "@/lib/engine/resource-cost";

const previewSchema = z.object({
  resources: z.array(resourceCostSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resources } = previewSchema.parse(body);
    const { breakdowns, summary } = computeResourceSummary(
      resources.map((r) => ({
        category: r.category,
        description: r.description,
        acquisitionMode: r.acquisitionMode,
        quantity: r.quantity,
        unitCostBeforeVat: r.unitCostBeforeVat,
        vatRate: r.vatRate,
        vatCreditablePercent: r.vatCreditablePercent,
        invoiceStatus: r.invoiceStatus,
        allocationPercent: r.allocationPercent,
        monthsAllocated: r.monthsAllocated,
        cashOutflowMonth: r.cashOutflowMonth,
        capitalizedAsset: r.capitalizedAsset,
        depreciationRateAnnual: r.depreciationRateAnnual,
        isRecurring: r.isRecurring,
      })),
    );
    return NextResponse.json({ breakdowns, summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
