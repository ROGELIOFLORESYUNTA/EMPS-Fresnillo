/**
 * GET  /api/projects/[id]/resources         lista los recursos del proyecto
 * POST /api/projects/[id]/resources         crea un recurso para el proyecto
 *
 * v8: cada recurso queda asociado al workspace + proyecto del cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db";
import { resourceCostSchema } from "@/lib/validators";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

const dec = (v: number | string) => new Decimal(v);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resources = await prisma.projectResourceCost.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ resources });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = resourceCostSchema.parse(body);

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: "Workspace no identificado." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });

    const resource = await prisma.projectResourceCost.create({
      data: {
        workspaceId: workspace.id,
        projectId: id,
        changeRequestId: data.changeRequestId ?? null,
        category: data.category,
        description: data.description,
        acquisitionMode: data.acquisitionMode,
        quantity: dec(data.quantity),
        unitCostBeforeVat: dec(data.unitCostBeforeVat),
        vatRate: dec(data.vatRate),
        vatCreditablePercent: dec(data.vatCreditablePercent),
        invoiceStatus: data.invoiceStatus,
        allocationPercent: dec(data.allocationPercent),
        monthsAllocated: dec(data.monthsAllocated),
        cashOutflowMonth: data.cashOutflowMonth,
        capitalizedAsset: data.capitalizedAsset,
        depreciationRateAnnual: data.depreciationRateAnnual !== undefined ? dec(data.depreciationRateAnnual) : null,
        usefulLifeMonths: data.usefulLifeMonths ?? null,
        isRecurring: data.isRecurring,
        monthlyCostBeforeVat: data.monthlyCostBeforeVat !== undefined ? dec(data.monthlyCostBeforeVat) : null,
        notes: data.notes ?? null,
      },
    });

    await logWorkspaceActivity(workspace.id, "resource_created", {
      resourceId: resource.id,
      projectId: id,
      category: data.category,
      acquisitionMode: data.acquisitionMode,
    });

    return NextResponse.json({ resource }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
