/**
 * Servicio de estimacion: orquesta motor + persistencia + auditoria.
 * Cumple criterios 11 (versionado), 13 (no sobrescribir histórico), RNF-03 (auditabilidad).
 *
 * Correcciones de septiembre 2026 (auditoría de cuentas sobre el proyecto de ejemplo):
 *   - El factor de riesgo ya no es la constante 1.45: sale de los cambios
 *     registrados, de la claridad, de la disponibilidad del cliente y de la
 *     rotación declarada del equipo. Sin datos vale 1.0 y se dice.
 *   - La capacidad semanal ya no es un número que el usuario teclea a ciegas:
 *     sale del equipo capturado (Σ disponibilidad × 40 h). Se puede forzar.
 *   - Las integraciones se cobran una vez, el endurecimiento de bytecoding una
 *     vez, y la liquidación LFT no vuelve a cobrar lo que el costo mensual ya
 *     provisiona.
 *   - El tipo de contrato sí cambia las cargas: honorarios y freelance no pagan
 *     IMSS ni INFONAVIT.
 *   - Todo lo que entra al cálculo queda en el snapshot, incluido el capital
 *     declarado, para que un recálculo reproduzca el mismo riesgo.
 *   - Cada estimación guarda su cadena de cálculo ("de dónde sale este número").
 *
 * Octubre de 2026 (equipo persona por persona):
 *   - Cada persona cuesta por los meses que participa (semanas asignadas), no
 *     "un mes del equipo × los meses del proyecto". Lo mismo vale para la
 *     liquidación LFT y para la nómina de cada mes del flujo de efectivo.
 *   - El contrato "propio" (el tiempo de quien cotiza) no paga IMSS ni impuesto
 *     sobre nómina.
 *   - El snapshot guarda el equipo y el lado.
 */
import { Decimal } from "decimal.js";
import { prisma } from "./db";

const dec = (v: number | string) => new Decimal(v);
import { loadAllForEstimate, buildParametersSnapshot } from "./parameters";
import {
  computeEffort,
  computeScenarios,
  computeCalendar,
  computePricing,
  computeISR,
  buildSimpleCashFlow,
  computeRisk,
  computeLFTRisk,
  costoDelEquipo,
  costoMensualDelEquipo,
  mesesDePersona,
  nominaPorMes,
  SEMANAS_POR_MES,
  type PerfilDeEquipo,
  type DevelopmentMode,
  type Scenario,
  type ProjectInput,
  type ModuleInput,
} from "./engine";
import { construirExplicacion, type PasoDeCalculo } from "./engine/explicacion";
import { periciaDelEquipo, ajustarPorPericia, costoHerramientasPorModo, factorAumentoPlanes, type NivelHerramienta } from "./engine/herramientas";

interface CashFlowAssumptions {
  anticipoPct: number;
  finalPaymentPct: number;
  /** Ya no entra al cálculo: los meses los decide el motor. Se acepta por compatibilidad. */
  durationMonths?: number;
  monthlyToolsCost: number;
  monthlyAdminCost: number;
}

interface EstimateRequest {
  projectId: string;
  mode: DevelopmentMode;
  scenarios?: Scenario[];           // default todos
  targetMargin: number;             // 0..0.99
  /** Si no se manda, se calcula del equipo: Σ(disponibilidad % × 40 h). */
  weeklyTeamCapacityHours?: number | null;
  costMode?: "detailed" | "estimated";
  cashFlowAssumptions?: CashFlowAssumptions;
  capitalDeclaredByProvider?: number;
  /** Nivel de herramientas de IA por persona: básico, típico (default) o máximo. */
  aiToolLevel?: NivelHerramienta;
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
    explicacion: PasoDeCalculo[];
  }>;
  cashflowResult: { workingCapitalRequired: number; months: number };
  /** Capacidad semanal usada y de dónde salió. */
  capacidad: { horasSemana: number; calculadaDelEquipo: boolean };
  /** Herramientas de IA del modo (asientos y pesos al mes, sin IVA) y pericia del equipo con la IA. */
  herramientas: { asientos: number; usdPorAsiento: number; nivel: NivelHerramienta; asientosConPlanPropio: number; sobreconsumo: number; tipoCambio: number; mensualMXN: number; usuariosFinales: number; mensualUsuariosFinalesMXN: number };
  pericia: { promedio: number; conDato: boolean; factor: number; aplica: boolean };
}

const HORAS_SEMANA_POR_PERSONA = 40;
const MIN_PROJECT_MONTHS = 0.5; // mínimo medio mes para cualquier proyecto

/** Niveles que captura la interfaz para "¿qué tan disponible está el cliente?". */
const CLIENTE_AUSENTE_POR_NIVEL: Record<string, number> = {
  alta: 0.0,   // hay alguien dedicado a resolver dudas
  media: 0.10, // contesta cuando puede
  baja: 0.25,  // difícil de encontrar
};

/**
 * Entradas de riesgo del proyecto. Antes eran tres constantes de 0.15 que
 * inflaban todas las horas un 45 % sin que ninguna pantalla las capturara.
 * Ahora cada una sale de un dato real y se documenta de dónde.
 */
export function riesgoDelProyecto(input: {
  cambiosRegistrados: number;
  claridadPromedio: number;
  nivelDisponibilidadCliente: string | null;
  rotacionEquipo: number[]; // turnoverRisk 1..5 por perfil
}): {
  changeProbability: number;
  clientUnavailability: number;
  turnoverRisk: number;
  sinDatoDeCliente: boolean;
} {
  // Cambios: cada solicitud registrada sube la probabilidad; la claridad baja también.
  let changeProbability = Math.min(0.30, input.cambiosRegistrados * 0.05);
  if (input.claridadPromedio <= 2) changeProbability += 0.10;
  else if (input.claridadPromedio <= 3) changeProbability += 0.05;
  changeProbability = Math.min(0.40, changeProbability);

  const nivel = input.nivelDisponibilidadCliente;
  const sinDatoDeCliente = !nivel || !(nivel in CLIENTE_AUSENTE_POR_NIVEL);
  const clientUnavailability = sinDatoDeCliente ? 0 : CLIENTE_AUSENTE_POR_NIVEL[nivel!];

  // Rotación: promedio del 1..5 declarado por perfil, llevado a 0..0.30.
  const rot = input.rotacionEquipo.filter((v) => Number.isFinite(v));
  const promedioRot = rot.length ? rot.reduce((a, b) => a + b, 0) / rot.length : 1;
  const turnoverRisk = Math.max(0, Math.min(0.30, ((promedioRot - 1) / 4) * 0.30));

  return { changeProbability, clientUnavailability, turnoverRisk, sinDatoDeCliente };
}

/** Capacidad semanal del equipo: cada persona aporta 40 h por su disponibilidad. */
export function capacidadDelEquipo(team: { availabilityPercent: number | string }[]): number {
  const horas = team.reduce((acc, p) => acc + (Number(p.availabilityPercent) / 100) * HORAS_SEMANA_POR_PERSONA, 0);
  return Math.max(1, horas);
}

function projectInputFromDb(
  modules: { complexity: number; clarity: number; criticality: number; screensCount: number; reportsCount: number; catalogsCount: number; integrationsCount: number; sensitiveData: boolean; }[],
  context: { changeProbability: number; clientUnavailability: number; turnoverRisk: number; externalIntegrationsCount: number; dataMigration?: boolean },
): ProjectInput {
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
    // Se conserva como señal para el escenario conservador y el riesgo técnico.
    // Ya NO suma horas por segunda vez (ver effort.ts).
    externalIntegrationsCount: context.externalIntegrationsCount,
    changeProbability: context.changeProbability,
    clientUnavailability: context.clientUnavailability,
    turnoverRisk: context.turnoverRisk,
    clientAvailability: 1 - context.clientUnavailability,
  };
}

export async function runEstimate(req: EstimateRequest): Promise<EstimateOutput> {
  const project = await prisma.project.findUnique({
    where: { id: req.projectId },
    include: {
      modules: true,
      team: true,
      _count: { select: { changes: true } },
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

  const claridadPromedio =
    project.modules.reduce((a, m) => a + m.clarity, 0) / project.modules.length;
  const riesgo = riesgoDelProyecto({
    cambiosRegistrados: project._count.changes,
    claridadPromedio,
    nivelDisponibilidadCliente: project.clientAvailabilityLevel ?? null,
    rotacionEquipo: project.team.map((p) => p.turnoverRisk),
  });

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
      changeProbability: riesgo.changeProbability,
      clientUnavailability: riesgo.clientUnavailability,
      turnoverRisk: riesgo.turnoverRisk,
    },
  );

  const effortRaw = computeEffort(projectInput, req.mode, ctx.factors);

  // La IA reduce las horas-persona (effort_efficiency) y acelera el calendario
  // (velocity_factor), pero solo en la parte que la pericia del equipo con la
  // IA permite acreditar. Con pericia 4 ("la usa a diario") es la nominal;
  // a mano y low-code no cambian.
  const pericia = periciaDelEquipo(project.team);
  const modoAjustado = ajustarPorPericia(ctx.velocity[req.mode], req.mode, pericia.promedio, ctx.aiSkillFactors);
  const efficiency = modoAjustado.effort_efficiency;
  const velocityEfectiva = {
    ...ctx.velocity,
    [req.mode]: {
      ...ctx.velocity[req.mode],
      velocity_factor: modoAjustado.velocity_factor,
      prototype_speedup: modoAjustado.prototype_speedup,
      effort_efficiency: modoAjustado.effort_efficiency,
    },
  };
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

  // Capacidad semanal: del equipo, salvo que se fuerce un valor.
  const capacidadCalculadaDelEquipo = !(req.weeklyTeamCapacityHours && req.weeklyTeamCapacityHours > 0);
  const weeklyTeamCapacityHours = capacidadCalculadaDelEquipo
    ? capacidadDelEquipo(project.team)
    : Number(req.weeklyTeamCapacityHours);

  // Costo del equipo. El tipo de contrato decide qué cargas aplican y las
  // semanas asignadas, cuántos meses cuenta cada persona.
  const useEstimated = req.costMode === "estimated";
  const equipo: PerfilDeEquipo[] = project.team.map((p) => ({
    monthlySalary: Number(p.monthlySalary),
    contractType: p.contractType,
    availabilityPercent: Number(p.availabilityPercent),
    weeksAssigned: p.weeksAssigned === null ? null : Number(p.weeksAssigned),
  }));
  // Un mes con todo el equipo presente. El costo del proyecto sale de
  // costoDelEquipo, que cuenta a cada persona solo por los meses que participa.
  const monthlyTeamCost = costoMensualDelEquipo(equipo, ctx.rates, useEstimated);

  const cfa = req.cashFlowAssumptions;

  // Herramientas de IA del modo (un asiento por persona técnica, pesos sin
  // IVA) y los otros costos fijos capturados (servidores, administración).
  // Entran al costo, al precio y al flujo de efectivo con el mismo número:
  // son renglones distintos y ninguno se cobra dos veces.
  const nivelHerramientas: NivelHerramienta = req.aiToolLevel ?? "tipico";
  const herramientas = costoHerramientasPorModo({
    mode: req.mode,
    team: project.team,
    nivel: nivelHerramientas,
    tabla: ctx.aiToolCosts,
    tipoCambio: ctx.tipoCambio,
    usuariosFinales: project.expectedUsers ?? null,
  });
  const otrosHerramientasMensual = Math.max(0, cfa?.monthlyToolsCost ?? 0);
  const administracionMensual = Math.max(0, cfa?.monthlyAdminCost ?? 0);
  const capitalDeclarado = req.capitalDeclaredByProvider ?? 100000;
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
    weeklyTeamCapacityHours,
    capacidadCalculadaDelEquipo,
    costMode: req.costMode ?? "detailed",
    cashFlowAssumptions: cfa,
    capitalDeclaredByProvider: capitalDeclarado,
    // El equipo tal como estaba al estimar (sin nombres) y el lado del proyecto.
    equipo: project.team.map((p) => ({
      id: p.id,
      role: p.role,
      contractType: p.contractType,
      monthlySalary: Number(p.monthlySalary),
      payBasis: p.payBasis ?? null,
      dailyRate: p.dailyRate === null ? null : Number(p.dailyRate),
      weeksAssigned: p.weeksAssigned === null ? null : Number(p.weeksAssigned),
      availabilityPercent: Number(p.availabilityPercent),
      aiSkill: p.aiSkill,
      isOwner: p.isOwner,
    })),
    lado: project.lado ?? null,
    riesgo: { ...riesgo, cambiosRegistrados: project._count.changes, claridadPromedio },
    herramientas,
    aiToolLevel: nivelHerramientas,
    aiToolAumentoAnual: ctx.aiToolAumentoAnual,
    pericia: {
      ...pericia,
      factor: modoAjustado.factor,
      aplica: modoAjustado.aplica,
      nominal: modoAjustado.nominal,
      efectivo: { effort_efficiency: modoAjustado.effort_efficiency, velocity_factor: modoAjustado.velocity_factor, prototype_speedup: modoAjustado.prototype_speedup },
    },
    otrosCostosMensuales: { herramientas: otrosHerramientasMensual, administracion: administracionMensual },
  });

  const velocidadModo = modoAjustado.velocity_factor;
  const nombresModo: Record<string, string> = {
    traditional: "programado a mano",
    ai_assisted: "a mano con ayuda de IA",
    hybrid: "mitad a mano y mitad con IA",
    bytecoding_prompts: "casi todo con IA",
    low_code: "con herramientas de armar sin programar",
  };
  const nombresEscenario: Record<string, string> = {
    optimistic: "si todo sale bien",
    probable: "lo más seguro",
    conservative: "si hay tropiezos",
  };

  for (const scen of scenariosToCompute) {
    const sResult = scenarioMap[scen];
    const calendar = computeCalendar(
      { ...effort, totalEffortHours: sResult.totalEffortHours, phases: sResult.phases },
      req.mode,
      velocityEfectiva,
      weeklyTeamCapacityHours,
    );
    // Calendario real del proyecto en MESES con piso mínimo (un proyecto no puede durar 0 meses).
    const realMonthsOfMode = Math.max(MIN_PROJECT_MONTHS, calendar.weeksTotal / SEMANAS_POR_MES);
    // Primera versión enseñable: la fórmula daba 4 horas para 8 módulos en
    // low-code, que nadie se cree. Piso: media semana más un día por pieza.
    const pisoPrototipo = 0.5 + 0.2 * project.modules.length;
    const weeksToPrototype = Math.max(calendar.weeksToPrototype, pisoPrototipo);

    // Riesgo LFT: si una persona en nómina pasa de 6 meses en el proyecto, hay riesgo de
    // conversión a indeterminado y liquidación al despedir. Se mide por persona: quien
    // participa solo unas semanas cuenta con sus meses, no con los del proyecto.
    const lftRisk = computeLFTRisk({
      team: equipo.map((p) => ({
        monthlySalary: p.monthlySalary,
        contractType: p.contractType,
        availabilityPercent: p.availabilityPercent,
        monthsInProject: mesesDePersona(p, realMonthsOfMode),
      })),
      realMonthsOfProject: realMonthsOfMode,
      willTerminateAtEnd: true, // asumimos terminación al cierre como caso conservador
    });

    // Costo = equipo con cargas (cada persona por los meses que participa) +
    // (herramientas de IA + otras herramientas + administración) por los meses
    // que dura el proyecto, más la liquidación si aplica.
    // Las horas de endurecimiento de bytecoding ya están dentro de las
    // semanas; no se vuelven a multiplicar aquí. indirectCost es la parte que
    // no es nómina, ya incluida en el costo total.
    // En el escenario conservador los planes de IA pueden subir de precio
    // mientras dura el proyecto: se prorratea el aumento anual esperado.
    const factorAumento = scen === "conservative" ? factorAumentoPlanes(ctx.aiToolAumentoAnual, realMonthsOfMode) : 1;
    const herramientasMesEscenario = herramientas.mensualMXN * factorAumento;
    const costoMensualIndirecto = herramientasMesEscenario + otrosHerramientasMensual + administracionMensual;
    const costoEquipo = costoDelEquipo(equipo, ctx.rates, { realMonths: realMonthsOfMode, useEstimated });
    const baseCost = costoEquipo + costoMensualIndirecto * realMonthsOfMode;
    const indirectCost = costoMensualIndirecto * realMonthsOfMode;
    const totalCost = baseCost + lftRisk.estimatedTerminationCost;
    const pricing = computePricing({ totalCost, targetMargin: req.targetMargin }, ctx.rates.IVA);
    const isr = computeISR(pricing.subtotal, totalCost * 0.85, totalCost * 0.05, ctx.rates.ISR);

    // Cashflow basado en el calendario REAL del modo. La nómina va mes a mes:
    // quien sale a las 8 semanas ya no cobra en el mes 3.
    const cashflowMonthsThisMode = Math.max(1, Math.ceil(realMonthsOfMode));
    const nominaMeses = nominaPorMes(equipo, ctx.rates, { realMonths: realMonthsOfMode, useEstimated });
    const cashflowResult = cfa
      ? buildSimpleCashFlow({
          totalContractAmount: pricing.total,
          anticipoPct: cfa.anticipoPct,
          finalPaymentPct: cfa.finalPaymentPct,
          monthlyOutflowPayroll: nominaMeses,
          monthlyOutflowTaxes: nominaMeses.map((n) => n * 0.10),
          monthlyOutflowTools: herramientasMesEscenario + otrosHerramientasMensual,
          monthlyOutflowAdmin: administracionMensual,
          durationMonths: cashflowMonthsThisMode,
        })
      : { workingCapitalRequired: 0, months: [] };

    const risk = computeRisk(projectInput, {
      workingCapitalRequired: cashflowResult.workingCapitalRequired,
      capitalDeclaredByProvider: capitalDeclarado,
      marginPct: req.targetMargin,
      isnUazRate: ctx.rates.ISN * (1 + ctx.rates.UAZ),
      fiscalIvaRate: ctx.rates.IVA,
    });

    const explicacion = construirExplicacion({
      puntosBase: effort.basePoints,
      factorClaridad: effort.clarityFactor,
      claridadPromedio,
      factorRiesgo: effort.riskFactor,
      riesgo: {
        cambios: riesgo.changeProbability,
        clienteAusente: riesgo.clientUnavailability,
        rotacion: riesgo.turnoverRisk,
        sinDatoDeCliente: riesgo.sinDatoDeCliente,
      },
      esfuerzoTecnico: effortRaw.technicalEffort,
      repartoFases: effortRaw.totalEffortHours / effortRaw.technicalEffort,
      horasTrasReparto: effortRaw.totalEffortHours,
      eficienciaModo: efficiency,
      nombreModo: nombresModo[req.mode] ?? req.mode,
      horasModo: effort.totalEffortHours,
      factorEscenario: sResult.factor,
      nombreEscenario: nombresEscenario[scen] ?? scen,
      horasEscenario: sResult.totalEffortHours,
      capacidadSemanal: weeklyTeamCapacityHours,
      capacidadCalculadaDelEquipo,
      velocidadModo,
      semanas: calendar.weeksTotal,
      meses: realMonthsOfMode,
      costoMensualEquipo: monthlyTeamCost,
      personas: project.team.length,
      participacionParcial: equipo
        .filter((p) => p.weeksAssigned != null && mesesDePersona(p, realMonthsOfMode) < realMonthsOfMode)
        .map((p) => ({ semanas: p.weeksAssigned as number })),
      costoEquipoProyecto: costoEquipo,
      liquidacionLFT: lftRisk.estimatedTerminationCost,
      pericia: {
        promedio: pericia.promedio,
        conDato: pericia.conDato,
        factor: modoAjustado.factor,
        aplica: modoAjustado.aplica,
        eficienciaNominal: modoAjustado.nominal.effort_efficiency,
        velocidadNominal: modoAjustado.nominal.velocity_factor,
      },
      herramientas: {
        asientos: herramientas.asientos,
        usdPorAsiento: herramientas.usdPorAsiento,
        sobreconsumo: herramientas.sobreconsumo,
        tipoCambio: herramientas.tipoCambio,
        mensualMXN: herramientas.mensualMXN,
        descripcion: herramientas.descripcion,
        nivel: nivelHerramientas,
        asientosAlNivel: herramientas.asientosAlNivel,
        asientosConPlanPropio: herramientas.asientosConPlanPropio,
        usdPlanesPropios: herramientas.usdPlanesPropios,
        factorAumento,
        aumentoAnual: ctx.aiToolAumentoAnual,
      },
      otrosCostos: { herramientasMensual: otrosHerramientasMensual, administracionMensual },
      costoTotal: totalCost,
      margen: req.targetMargin,
      subtotal: pricing.subtotal,
      tasaIva: ctx.rates.IVA,
      iva: pricing.vat,
      total: pricing.total,
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
        weeksToPrototype: dec(weeksToPrototype.toFixed(2)),
        directCost: dec(totalCost.toFixed(2)),
        indirectCost: dec(indirectCost.toFixed(2)),
        subtotal: dec(pricing.subtotal.toFixed(2)),
        vat: dec(pricing.vat.toFixed(2)),
        total: dec(pricing.total.toFixed(2)),
        margin: dec(req.targetMargin.toFixed(4)),
        isrEstimated: dec(isr.toFixed(2)),
        riskScore: dec(risk.total.toFixed(4)),
        riskLevel: risk.level,
        parametersSnapshot: snapshotStr,
        inputsSnapshot,
        explanationJson: JSON.stringify(explicacion),
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
      weeksToPrototype,
      subtotal: pricing.subtotal,
      vat: pricing.vat,
      total: pricing.total,
      isrEstimated: isr,
      riskLevel: risk.level,
      riskScore: risk.total,
      explicacion,
    });
  }

  // Persistir cashflow una vez (se asocia al proyecto, no al Estimate especifico).
  // Se usa el escenario PROBABLE del modo solicitado y SU calendario real.
  if (cfa) {
    await prisma.cashFlowLine.deleteMany({ where: { projectId: project.id } });
    const probableEst = out.find((e) => e.scenario === "probable") ?? out[0];
    const probableTotal = probableEst?.total ?? 0;
    const probableWeeks = probableEst?.weeksTotal ?? 0;
    const mesesProbables = Math.max(MIN_PROJECT_MONTHS, probableWeeks / SEMANAS_POR_MES);
    const realMonths = Math.max(1, Math.ceil(mesesProbables));
    const nominaMeses = nominaPorMes(equipo, ctx.rates, { realMonths: mesesProbables, useEstimated });
    const finalCashflow = buildSimpleCashFlow({
      totalContractAmount: probableTotal,
      anticipoPct: cfa.anticipoPct,
      finalPaymentPct: cfa.finalPaymentPct,
      monthlyOutflowPayroll: nominaMeses,
      monthlyOutflowTaxes: nominaMeses.map((n) => n * 0.10),
      monthlyOutflowTools: herramientas.mensualMXN + otrosHerramientasMensual,
      monthlyOutflowAdmin: administracionMensual,
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

  return {
    estimates: out,
    cashflowResult: { workingCapitalRequired: wcap, months: cf.length },
    capacidad: { horasSemana: weeklyTeamCapacityHours, calculadaDelEquipo: capacidadCalculadaDelEquipo },
    herramientas: {
      asientos: herramientas.asientos,
      usdPorAsiento: herramientas.usdPorAsiento,
      nivel: herramientas.nivel,
      asientosConPlanPropio: herramientas.asientosConPlanPropio,
      sobreconsumo: herramientas.sobreconsumo,
      tipoCambio: herramientas.tipoCambio,
      mensualMXN: herramientas.mensualMXN,
      usuariosFinales: herramientas.usuariosFinales,
      mensualUsuariosFinalesMXN: herramientas.mensualUsuariosFinalesMXN,
    },
    pericia: { promedio: pericia.promedio, conDato: pericia.conDato, factor: modoAjustado.factor, aplica: modoAjustado.aplica },
  };
}
