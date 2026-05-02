import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runEstimate } from "@/lib/estimate-service";
import type { DevelopmentMode, Scenario } from "@/lib/engine";

/**
 * Re-ejecuta la ultima estimacion del proyecto usando los parametros vigentes,
 * creando una NUEVA version (sin sobrescribir el historico - criterio 13).
 * Cumple endpoint addendum 23: /api/projects/{id}/recalculate-with-current-parameters
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const last = await prisma.estimate.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
    if (!last) {
      return NextResponse.json(
        { error: "No hay estimaciones previas. Usa POST /api/projects/{id}/estimate primero." },
        { status: 400 },
      );
    }

    // Reconstruimos los inputs originales del snapshot
    const inputs = JSON.parse(last.inputsSnapshot) as {
      mode: DevelopmentMode;
      targetMargin: number;
      weeklyTeamCapacityHours: number;
      costMode?: "detailed" | "estimated";
      scenarios?: Scenario[];
      cashFlowAssumptions?: {
        anticipoPct: number;
        finalPaymentPct: number;
        durationMonths: number;
        monthlyToolsCost: number;
        monthlyAdminCost: number;
      };
    };

    const result = await runEstimate({
      projectId: id,
      mode: inputs.mode,
      targetMargin: inputs.targetMargin,
      weeklyTeamCapacityHours: inputs.weeklyTeamCapacityHours,
      costMode: inputs.costMode,
      scenarios: inputs.scenarios,
      cashFlowAssumptions: inputs.cashFlowAssumptions,
    });

    await prisma.auditLog.create({
      data: {
        entity: "Project",
        entityId: id,
        action: "recalculate",
        context: `Recalculo con parametros vigentes. Versión previa: ${last.version}`,
      },
    });

    return NextResponse.json({
      message: "Estimacion recalculada con parametros vigentes. Versiones anteriores conservadas.",
      previousVersion: last.version,
      ...result,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
