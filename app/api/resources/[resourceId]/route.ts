/**
 * PUT    /api/resources/[resourceId]     actualiza un recurso
 * DELETE /api/resources/[resourceId]     elimina un recurso
 *
 * v8: solo el dueño del workspace puede modificar sus recursos.
 */
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db";
import { resourceCostSchema } from "@/lib/validators";
import { getCurrentWorkspace } from "@/lib/workspace";

const dec = (v: number | string) => new Decimal(v);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  try {
    const { resourceId } = await params;
    const body = await req.json();
    const data = resourceCostSchema.partial().parse(body);

    const workspace = await getCurrentWorkspace();
    const existing = await prisma.projectResourceCost.findUnique({ where: { id: resourceId } });
    if (!existing) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
    if (workspace && existing.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "No tienes permiso para editar este recurso." }, { status: 403 });
    }

    const resource = await prisma.projectResourceCost.update({
      where: { id: resourceId },
      data: {
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.acquisitionMode !== undefined && { acquisitionMode: data.acquisitionMode }),
        ...(data.quantity !== undefined && { quantity: dec(data.quantity) }),
        ...(data.unitCostBeforeVat !== undefined && { unitCostBeforeVat: dec(data.unitCostBeforeVat) }),
        ...(data.vatRate !== undefined && { vatRate: dec(data.vatRate) }),
        ...(data.vatCreditablePercent !== undefined && { vatCreditablePercent: dec(data.vatCreditablePercent) }),
        ...(data.invoiceStatus !== undefined && { invoiceStatus: data.invoiceStatus }),
        ...(data.allocationPercent !== undefined && { allocationPercent: dec(data.allocationPercent) }),
        ...(data.monthsAllocated !== undefined && { monthsAllocated: dec(data.monthsAllocated) }),
        ...(data.cashOutflowMonth !== undefined && { cashOutflowMonth: data.cashOutflowMonth }),
        ...(data.capitalizedAsset !== undefined && { capitalizedAsset: data.capitalizedAsset }),
        ...(data.depreciationRateAnnual !== undefined && { depreciationRateAnnual: dec(data.depreciationRateAnnual) }),
        ...(data.usefulLifeMonths !== undefined && { usefulLifeMonths: data.usefulLifeMonths }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
        ...(data.monthlyCostBeforeVat !== undefined && { monthlyCostBeforeVat: dec(data.monthlyCostBeforeVat) }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
    return NextResponse.json({ resource });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  try {
    const { resourceId } = await params;
    const workspace = await getCurrentWorkspace();
    const existing = await prisma.projectResourceCost.findUnique({ where: { id: resourceId } });
    if (!existing) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
    if (workspace && existing.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar este recurso." }, { status: 403 });
    }
    await prisma.projectResourceCost.delete({ where: { id: resourceId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
