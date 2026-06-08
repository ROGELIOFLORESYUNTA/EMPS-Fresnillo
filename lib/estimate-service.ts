/**
 * Servicio de estimacion: orquesta motor + persistencia + auditoria.
 * Cumple criterios 11 (versionado), 13 (no sobrescribir histórico), RNF-03 (auditabilidad).
 */
import { Decimal } from "decimal.js";
import { prisma } from "./db";

const dec = (v: number | string) => new Decimal(v);
import { loadAllForEstimate, buildParametersSnapshot } from "./parameters";
import {
  computeEffort,
  computeScenarios,
  computeCalendar,
  computeProfileCost,
  computePricing,
  computeISR,
  buildSimpleCashFlow,
  computeRisk,
  computeLFTRisk,
  type DevelopmentMode,
  type Scenario,
  type ProjectInput,
  type ModuleInput,
} from "./engine";

interface CashFlowAssumptions {
  anticipoPct: number;
  finalPaymentPct: number;
  durationMonths: number;
  monthlyToolsCost: number;
  monthlyAdminCost: number;
}

interface EstimateRequest {
  projectId: string;
  mode: DevelopmentMode;
  scenarios?: Scenario[];           // default todos
  targetMargin: number;             // 0..0.99
  weeklyTeamCapacityHours: number;
  costMode?: "detailed" | "estimated";
  cashFlowAssumptions?: CashFlowAssumptions;
  capitalDeclaredByProvider?: number;
  createdById?: string;
  /** FASE G.I — si se pasa, las ediciones del workspace en /admin/parametros
   *  (WorkspaceParameterOverride) sobreescriben los valores globales en este
   *  cálculo. Sin esto, el estimate usa solo los valores globales (default). */
  workspaceId?: string | null;
}

interface EstimateOutput {
  estimates: Array<{
    id: string;
    version: number;
    mode: DevelopmentMode;
    scenario: Scenario;
    totalEffortHours: number;
    weeksTotal: number;
    weeksToPrototype: number;
    subtotal: number;
    vat: number;
    total: number;
    isrEstimated: number;
    riskLevel: string;
    riskScore: number;
  }>;
  cashflowResult: { workingCapitalRequired: number; months: number };
}

function projectInputFromDb(modules: { complexity: number; clarity: number; criticality: number; screensCount: number; reportsCount: number; catalogsCount: number; integrationsCount: number; sensitiveData: boolean; }[],
  context: { changeProbability?: number; clientUnavailability?: number; turnoverRisk?: number; clientAvailability?: number; dataMigration?: boolean; externalIntegrationsCount?: number; }): ProjectInput {
  return {
    modules: modules.map((m): ModuleInput => ({
      complexity: m.complexity,
      clarity: m.clarity,
      criticality: m.criticality,
      screensCount: m.screensCount,
      reportsCount: m.reportsCount,
      catalogsCount: m.catalogsCount,
      integrationsCount: m.integrationsCount,
      sensitiveData: m.sensitiveData,
    })),
    dataMigration: context.dataMigration ?? false,
    externalIntegrationsCount: context.externalIntegrationsCount ?? 0,
    changeProbability: context.changeProbability ?? 0.15,
    clientUnavailability: context.clientUnavailability ?? 0.15,
    turnoverRisk: context.turnoverRisk ?? 0.15,
    clientAvailability: context.clientAvailability ?? 0.85,
  };
}

export async function runEstimate(req: EstimateRequest): Promise<EstimateOutput> {
  const project = await prisma.project.findUnique({
    where: { id: req.projectId },
    include: {
      modules: true,
      team: true,
    },
  });
  if (!project) throw new Error(`Proyecto ${req.projectId} no encontrado`);
  if (project.modules.length === 0) {
    throw new Error("El proyecto no tiene modulos. Capture al menos uno antes de estimar.");
  }
  if (project.team.length === 0) {
    throw new Error("El proyecto no tiene perfiles de equipo. Capture al menos uno antes de estimar.");
  }

  const ctx = await loadAllForEstimate(
    project.targetDate?.getFullYear() ?? 2026,
    req.workspaceId ?? null,
  );
  const projectInput = projectInputFromDb(
    project.modules.map((m) => ({
      complexity: m.complexity,
      clarity: m.clarity,
      criticality: m.criticality,
      screensCount: m.screensCount,
      reportsCount: m.reportsCount,
      catalogsCount: m.catalogsCount,
      integrationsCount: m.integrationsCount,
      sensitiveData: m.sensitiveData,
    })),
    {
      externalIntegrationsCount: project.modules.reduce((a, m) => a + m.integrationsCount, 0),
    },
  );

  const effortRaw = computeEffort(projectInput, req.mode, ctx.factors);

  // Aplicar effort_efficiency: la IA / herramientas reducen las HORAS-PERSONA totales,
  // no solo el calendario. Tradicional 1.0 base, ai_assisted 0.78, bytecoding 0.65, low_code 0.50, hybrid 0.72.
  // Si el modo no tiene effort_efficiency configurado (legacy), usa 1.0.
  const efficiency = (ctx.velocity[req.mode] as { effort_efficiency?: number })?.effort_efficiency ?? 1.0;
  const effort = {
    ...effortRaw,
    totalEffortHours: effortRaw.totalEffortHours * efficiency,
    phases: {
      analysis: effortRaw.phases.analysis * efficiency,
      design: effortRaw.phases.design * efficiency,
      coding: effortRaw.phases.coding * efficiency,
      review: effortRaw.phases.review * efficiency,
      testing: effortRaw.phases.testing * efficiency,
      documentation: effortRaw.phases.documentation * efficiency,
      deployment: effortRaw.phases.deployment * efficiency,
      training: effortRaw.phases.training * efficiency,
      support: effortRaw.phases.support * efficiency,
      hardening: effortRaw.phases.hardening * efficiency,
    },
  };
  const scenarioMap = computeScenarios(effort, projectInput, ctx.scenarios);

  // Costo equipo (todo el proyecto, mensual y total)
  const useEstimated = req.costMode === "estimated";
  const monthlyTeamCost = project.team.reduce((acc, p) => {
    const cost = computeProfileCost(
      {
        monthlySalary: Number(p.monthlySalary),
        riskClass: "I",
        useEstimatedFactor: useEstimated,
        estimatedFactor: 0.40,
      },
      ctx.rates,
    );
    return acc + cost.total * Number(p.availabilityPercent) / 100;
  }, 0);

  // El costo se calcula dentro del loop por modo/escenario:
  //   cost = monthlyTeamCost × realMonthsOfMode × actualSum
  // donde realMonthsOfMode = max(MIN_MONTHS, weeksTotal / 4.33) y actualSum es 1.0 o 1.10 (bytecoding).
  // Esto refleja que el proyecto cuesta lo que dura mantener al equipo trabajando.
  const MIN_PROJECT_MONTHS = 0.5; // mínimo medio mes para cualquier proyecto

  // Cashflow (opcional) — la duración la calculamos dentro del loop por modo:
  // si bytecoding termina en 1 mes y tradicional en 6, sus cashflows son distintos.
  const cfa = req.cashFlowAssumptions;

  const scenariosToCompute = (req.scenarios ?? ["optimistic", "probable", "conservative"]) as Scenario[];

  const out: EstimateOutput["estimates"] = [];

  // Determinar version siguiente para este proyecto/modo
  const lastVersion = await prisma.estimate.findFirst({
    where: { projectId: project.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const baseVersion = (lastVersion?.version ?? 0) + 1;

  const snapshotStr = buildParametersSnapshot(ctx.snapshot);
  const inputsSnapshot = JSON.stringify({
    projectInput,
    mode: req.mode,
    targetMargin: req.targetMargin,
    weeklyTeamCapacityHours: req.weeklyTeamCapacityHours,
    costMode: req.costMode ?? "detailed",
    cashFlowAssumptions: cfa,
  });

  for (const scen of scenariosToCompute) {
    const sResult = scenarioMap[scen];
    const calendar = computeCalendar(
      { ...effort, totalEffortHours: sResult.totalEffortHours, phases: sResult.phases },
      req.mode,
      ctx.velocity,
      req.weeklyTeamCapacityHours,
    );
    // Calendario real del proyecto en MESES con piso mínimo (un proyecto no puede durar 0 meses).
    const realMonthsOfMode = Math.max(MIN_PROJECT_MONTHS, calendar.weeksTotal / 4.33);

    // Riesgo LFT — si el proyecto excede 6 meses con personal en nómina, hay riesgo de
    // conversión a indeterminado y liquidación al despedir.
    const lftRisk = computeLFTRisk({
      team: project.team.map((p) => ({
        monthlySalary: Number(p.monthlySalary),
        contractType: p.contractType,
        availabilityPercent: Number(p.availabilityPercent),
      })),
      realMonthsOfProject: realMonthsOfMode,
      willTerminateAtEnd: true, // asumimos terminación al cierre como caso conservador
    });

    // Costo base + overhead de horas + provisión LFT si aplica
    const baseCost = monthlyTeamCost * realMonthsOfMode * effort.actualSum;
    const totalCost = baseCost + lftRisk.estimatedTerminationCost;
    const pricing = computePricing({ totalCost, targetMargin: req.targetMargin }, ctx.rates.IVA);
    const isr = computeISR(pricing.subtotal, totalCost * 0.85, totalCost * 0.05, ctx.rates.ISR);

    // Cashflow basado en el calendario REAL del modo (no en durationMonths declarado).
    const cashflowMonthsThisMode = Math.max(1, Math.ceil(realMonthsOfMode));
    const cashflowResult = cfa
      ? buildSimpleCashFlow({
          totalContractAmount: pricing.total,
          anticipoPct: cfa.anticipoPct,
          finalPaymentPct: cfa.finalPaymentPct,
          monthlyOutflowPayroll: monthlyTeamCost,
          monthlyOutflowTaxes: monthlyTeamCost * 0.10,
          monthlyOutflowTools: cfa.monthlyToolsCost,
          monthlyOutflowAdmin: cfa.monthlyAdminCost,
          durationMonths: cashflowMonthsThisMode,
        })
      : { workingCapitalRequired: 0, months: [] };

    const risk = computeRisk(projectInput, {
      workingCapitalRequired: cashflowResult.workingCapitalRequired,
      capitalDeclaredByProvider: req.capitalDeclaredByProvider ?? 100000,
      marginPct: req.targetMargin,
      isnUazRate: ctx.rates.ISN * (1 + ctx.rates.UAZ),
      fiscalIvaRate: ctx.rates.IVA,
    });

    // Persistir
    const created = await prisma.estimate.create({
      data: {
        projectId: project.id,
        version: baseVersion,
        mode: req.mode,
        scenario: scen,
        analysisHours: dec(sResult.phases.analysis.toFixed(2)),
        designHours: dec(sResult.phases.design.toFixed(2)),
        codingHours: dec(sResult.phases.coding.toFixed(2)),
        reviewHours: dec(sResult.phases.review.toFixed(2)),
        testingHours: dec(sResult.phases.testing.toFixed(2)),
        documentationHours: dec(sResult.phases.documentation.toFixed(2)),
        deploymentHours: dec(sResult.phases.deployment.toFixed(2)),
        trainingHours: dec(sResult.phases.training.toFixed(2)),
        supportHours: dec(sResult.phases.support.toFixed(2)),
        hardeningHours: dec(sResult.phases.hardening.toFixed(2)),
        weeksTotal: dec(calendar.weeksTotal.toFixed(2)),
        weeksToPrototype: dec(calendar.weeksToPrototype.toFixed(2)),
        directCost: dec(totalCost.toFixed(2)),
        indirectCost: dec("0"),
        subtotal: dec(pricing.subtotal.toFixed(2)),
        vat: dec(pricing.vat.toFixed(2)),
        total: dec(pricing.total.toFixed(2)),
        margin: dec(req.targetMargin.toFixed(4)),
        isrEstimated: dec(isr.toFixed(2)),
        riskScore: dec(risk.total.toFixed(4)),
        riskLevel: risk.level,
        parametersSnapshot: snapshotStr,
        inputsSnapshot,
        createdById: req.createdById ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.createdById ?? null,
        entity: "Estimate",
        entityId: created.id,
        action: "create",
        after: JSON.stringify({ version: baseVersion, mode: req.mode, scenario: scen, total: pricing.total }),
        context: `Estimacion v${baseVersion} ${req.mode}/${scen}`,
      },
    });

    out.push({
      id: created.id,
      version: baseVersion,
      mode: req.mode,
      scenario: scen,
      totalEffortHours: sResult.totalEffortHours,
      weeksTotal: calendar.weeksTotal,
      weeksToPrototype: calendar.weeksToPrototype,
      subtotal: pricing.subtotal,
      vat: pricing.vat,
      total: pricing.total,
      isrEstimated: isr,
      riskLevel: risk.level,
      riskScore: risk.total,
    });
  }

  // Persistir cashflow una vez (se asocia al proyecto, no al Estimate especifico).
  // Se usa el escenario PROBABLE del modo solicitado y SU calendario real.
  if (cfa) {
    await prisma.cashFlowLine.deleteMany({ where: { projectId: project.id } });
    const probableEst = out.find((e) => e.scenario === "probable") ?? out[0];
    const probableTotal = probableEst?.total ?? 0;
    const probableWeeks = probableEst?.weeksTotal ?? cfa.durationMonths * 4.33;
    const realMonths = Math.max(1, Math.ceil(Math.max(MIN_PROJECT_MONTHS, probableWeeks / 4.33)));
    const finalCashflow = buildSimpleCashFlow({
      totalContractAmount: probableTotal,
      anticipoPct: cfa.anticipoPct,
      finalPaymentPct: cfa.finalPaymentPct,
      monthlyOutflowPayroll: monthlyTeamCost,
      monthlyOutflowTaxes: monthlyTeamCost * 0.10,
      monthlyOutflowTools: cfa.monthlyToolsCost,
      monthlyOutflowAdmin: cfa.monthlyAdminCost,
      durationMonths: realMonths,
    });
    await prisma.cashFlowLine.createMany({
      data: finalCashflow.months.map((m) => ({
        projectId: project.id,
        monthNumber: m.monthNumber,
        income: dec(m.income.toFixed(2)),
        payrollOutflow: dec(m.payrollOutflow.toFixed(2)),
        taxOutflow: dec(m.taxOutflow.toFixed(2)),
        toolsOutflow: dec(m.toolsOutflow.toFixed(2)),
        adminOutflow: dec(m.adminOutflow.toFixed(2)),
        netFlow: dec(m.netFlow.toFixed(2)),
        accumulatedFlow: dec(m.accumulatedFlow.toFixed(2)),
        workingCapitalRequired: dec(finalCashflow.workingCapitalRequired.toFixed(2)),
      })),
    });
  }

  // Marca el proyecto como estimado
  await prisma.project.update({
    where: { id: project.id },
    data: { status: "estimado" },
  });

  // Buscar el cashflow recién persistido para el response
  const cf = await prisma.cashFlowLine.findMany({
    where: { projectId: project.id },
    orderBy: { monthNumber: "asc" },
    select: { workingCapitalRequired: true },
  });
  const wcap = cf[0] ? Number(cf[0].workingCapitalRequired) : 0;

  return { estimates: out, cashflowResult: { workingCapitalRequired: wcap, months: cf.length } };
}
