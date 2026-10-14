/**
 * Cotización para el cliente: el lado del servidor (aquí sí se toca la base).
 *
 * Junta los datos del proyecto, escoge la opción que se cotiza, congela las
 * cifras de esa estimación y guarda la cotización. Todo lo que no necesita la
 * base (formato del número, calendario de pagos, armado del documento) está en
 * lib/cotizacion.ts.
 *
 * Lo que sale de aquí hacia el cliente nunca trae nómina, costo, utilidad ni
 * capital de trabajo: la carga solo lleva las cifras de CifrasCongeladas.
 */
import type { Cotizacion, Estimate, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { loadChangeImpactParameters } from "./parameters";
import { recomendacionDelProyecto } from "./recomendacion-proyecto";
import { factorHorasCambio } from "./engine/reports-insights";
import {
  acumuladoDeCambios,
  montoDeCambio,
  type AcumuladoDeCambios,
  type CambioParaAcumular,
} from "./cambios-acumulados";
import {
  anioDeCotizacion,
  camposPorOmision,
  completarSnapshot,
  congelarCifras,
  leerSnapshot,
  siguienteNumero,
  soloCifras,
  type CamposDeCotizacion,
  type CifrasCongeladas,
  type CotizacionGuardar,
  type CotizacionPayload,
  type LicenciasDelCliente,
  type OpcionDisponible,
} from "./cotizacion";

// ============================================================
// Lectura de lo guardado
// ============================================================

function listaDeTextos(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function camposDeFila(f: Cotizacion): CamposDeCotizacion {
  return {
    numero: f.numero,
    fecha: f.fecha.toISOString(),
    vigenciaDias: f.vigenciaDias,
    proveedorNombre: f.proveedorNombre,
    proveedorRfc: f.proveedorRfc,
    proveedorContacto: f.proveedorContacto,
    clienteNombre: f.clienteNombre,
    mode: f.mode,
    scenario: f.scenario,
    exclusiones: listaDeTextos(f.exclusionesJson),
    supuestos: listaDeTextos(f.supuestosJson),
    incluyeMantenimiento: f.incluyeMantenimiento,
    mantenimientoMensual: f.mantenimientoMensual === null ? null : Number(f.mantenimientoMensual),
    anticipoPct: f.anticipoPct,
    finalPct: f.finalPct,
    notas: f.notas,
  };
}

/** Solo la última estimación de cada forma de hacerlo y escenario (viene ordenada de la versión más nueva a la más vieja). */
function ultimasEstimaciones<T extends { mode: string; scenario: string }>(estimaciones: T[]): T[] {
  const vistos = new Set<string>();
  return estimaciones.filter((e) => {
    const k = `${e.mode}__${e.scenario}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

// ============================================================
// Cifras de una estimación
// ============================================================

interface SnapshotDeEntradas {
  herramientas?: {
    usuariosFinales?: number;
    usdPorUsuarioFinal?: number;
    mensualUsuariosFinalesMXN?: number;
    usuariosFinalesSupuestos?: boolean;
    tipoCambio?: number;
  };
  pericia?: { factor?: number; aplica?: boolean };
}

function leerEntradas(json: string): SnapshotDeEntradas | null {
  try {
    return JSON.parse(json) as SnapshotDeEntradas;
  } catch {
    return null;
  }
}

/** Licencias por usuario final que paga el cliente (solo plataformas de armado). */
function licenciasDeEstimacion(est: Pick<Estimate, "mode" | "inputsSnapshot">): LicenciasDelCliente | null {
  if (est.mode !== "low_code") return null;
  const h = leerEntradas(est.inputsSnapshot)?.herramientas;
  if (!h || !(Number(h.mensualUsuariosFinalesMXN) > 0)) return null;
  return {
    usuarios: Number(h.usuariosFinales) || 0,
    usdPorUsuario: Number(h.usdPorUsuarioFinal) || 0,
    mensualMXN: Number(h.mensualUsuariosFinalesMXN),
    supuestos: !!h.usuariosFinalesSupuestos,
    tipoCambio: Number(h.tipoCambio) || 0,
  };
}

/** El mismo factor de horas de cambios que usan los reportes: forma de hacerlo moderada por la pericia del equipo. */
async function factorHorasDeEstimacion(
  est: Pick<Estimate, "mode" | "inputsSnapshot">,
  workspaceId: string | null,
): Promise<number> {
  try {
    const params = await loadChangeImpactParameters(undefined, undefined, workspaceId);
    const pericia = leerEntradas(est.inputsSnapshot)?.pericia;
    const modo = est.mode as keyof typeof params.modeFactor;
    return factorHorasCambio(params.modeFactor[modo] ?? 1, pericia?.aplica ? (pericia.factor ?? 1) : 1);
  } catch {
    return 1;
  }
}

type ProyectoCompleto = NonNullable<Awaited<ReturnType<typeof cargarProyecto>>>;

async function cifrasDeEstimacion(project: ProyectoCompleto, est: Estimate): Promise<CifrasCongeladas> {
  return congelarCifras({
    estimacion: {
      id: est.id,
      version: est.version,
      mode: est.mode,
      scenario: est.scenario,
      subtotal: Number(est.subtotal),
      vat: Number(est.vat),
      total: Number(est.total),
      weeksTotal: est.weeksTotal === null ? null : Number(est.weeksTotal),
      directCost: Number(est.directCost),
      margin: Number(est.margin),
      createdAt: est.createdAt,
    },
    modulos: project.modules.map((m) => ({
      name: m.name,
      description: m.description,
      type: m.type,
      screensCount: m.screensCount,
      reportsCount: m.reportsCount,
      catalogsCount: m.catalogsCount,
      integrationsCount: m.integrationsCount,
      sensitiveData: m.sensitiveData,
    })),
    factorHorasCambios: await factorHorasDeEstimacion(est, project.workspaceId ?? null),
    licencias: licenciasDeEstimacion(est),
    ahora: new Date(),
  });
}

// ============================================================
// Carga del proyecto
// ============================================================

async function cargarProyecto(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      modules: { orderBy: { createdAt: "asc" } },
      team: { select: { role: true, availabilityPercent: true, aiSkill: true } },
      estimates: { orderBy: [{ version: "desc" }, { mode: "asc" }, { scenario: "asc" }] },
      cashflow: { orderBy: { monthNumber: "asc" }, take: 1 },
      changes: { include: { assessment: { select: { financialBreakdownJson: true, estimatedCost: true } } } },
      decisions: { where: { supersededAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      cotizacion: true,
      workspace: { select: { displayName: true } },
    },
  });
}

/** El subtotal antes de IVA que dejó la evaluación de un cambio, si la hay. */
function subtotalEvaluado(json: string | null | undefined): number | null {
  if (!json) return null;
  try {
    const v = (JSON.parse(json) as { subtotalBeforeVat?: unknown }).subtotalBeforeVat;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Lo mínimo que se necesita de un cambio para sumarlo. */
interface CambioMinimo {
  decision: string;
  costImpact: Prisma.Decimal | number | null;
  assessment: { financialBreakdownJson: string | null; estimatedCost: Prisma.Decimal | number | null } | null;
}

function cambiosParaAcumular(changes: CambioMinimo[]): CambioParaAcumular[] {
  return changes.map((c) => ({
    decision: c.decision,
    monto: montoDeCambio({
      costImpact: c.costImpact === null ? null : Number(c.costImpact),
      subtotalEvaluado: subtotalEvaluado(c.assessment?.financialBreakdownJson),
      costoEvaluado: c.assessment?.estimatedCost == null ? null : Number(c.assessment.estimatedCost),
    }),
  }));
}

/** Lo mínimo que se necesita de una estimación para saber el precio pactado. */
interface EstimacionMinima {
  id: string;
  mode: string;
  scenario: string;
  subtotal: Prisma.Decimal | number;
}

/**
 * El precio pactado, antes de IVA, contra el que se miden los cambios: la
 * estimación de la decisión activa y, si todavía no se decide, la probable de
 * la forma de hacerlo que se está cotizando. `estimaciones` viene de la
 * versión más nueva a la más vieja.
 */
function precioPactado(
  decisionEstimateId: string | null | undefined,
  estimaciones: EstimacionMinima[],
  modoPreferido: string | null,
): { subtotal: number; origen: "decision" | "probable" } | null {
  if (decisionEstimateId) {
    const est = estimaciones.find((e) => e.id === decisionEstimateId);
    if (est) return { subtotal: Number(est.subtotal), origen: "decision" };
  }
  const latest = ultimasEstimaciones(estimaciones);
  const probable =
    (modoPreferido ? latest.find((e) => e.mode === modoPreferido && e.scenario === "probable") : undefined) ??
    latest.find((e) => e.scenario === "probable") ??
    latest[0];
  return probable ? { subtotal: Number(probable.subtotal), origen: "probable" } : null;
}

export interface AcumuladoDelProyecto extends AcumuladoDeCambios {
  /** De dónde sale el precio pactado. */
  origen: "decision" | "probable";
}

/**
 * Los cambios aceptados de un proyecto contra su precio pactado. null si todavía
 * no hay estimación. Consulta lo mínimo: sirve para la lista de cambios, que se
 * pide seguido.
 */
export async function acumuladoDeCambiosDelProyecto(projectId: string): Promise<AcumuladoDelProyecto | null> {
  const [decision, estimaciones, cotizacion, changes] = await Promise.all([
    prisma.projectDecision.findFirst({
      where: { projectId, supersededAt: null },
      orderBy: { createdAt: "desc" },
      select: { estimateId: true },
    }),
    prisma.estimate.findMany({
      where: { projectId },
      orderBy: [{ version: "desc" }, { mode: "asc" }, { scenario: "asc" }],
      select: { id: true, mode: true, scenario: true, subtotal: true },
    }),
    prisma.cotizacion.findUnique({ where: { projectId }, select: { mode: true } }),
    prisma.changeRequest.findMany({
      where: { projectId },
      select: {
        decision: true,
        costImpact: true,
        assessment: { select: { financialBreakdownJson: true, estimatedCost: true } },
      },
    }),
  ]);
  const precio = precioPactado(decision?.estimateId, estimaciones, cotizacion?.mode ?? null);
  if (!precio) return null;
  return { ...acumuladoDeCambios(cambiosParaAcumular(changes), precio.subtotal), origen: precio.origen };
}

// ============================================================
// La carga que usa la pantalla, el reporte y el enlace compartido
// ============================================================

export interface OpcionesDeCarga {
  /** Nombre de quien mira, por si el proyecto no tiene dueño (el ejemplo compartido). */
  proveedorNombrePorOmision?: string | null;
  /** Fuerza la forma de hacerlo y el escenario (la persona los cambió en el formulario y todavía no guarda). */
  mode?: string | null;
  scenario?: string | null;
  puedeEditar: boolean;
}

/**
 * Todo lo que necesita la pantalla de la cotización, el reporte imprimible y
 * el enlace compartido. Con una cotización guardada usa sus campos y sus
 * cifras congeladas; sin ella arma los campos por omisión con las cifras de
 * hoy. null si el proyecto no existe. La regla de quién puede abrir el
 * proyecto la aplica quien llama.
 */
export async function cargarCotizacion(projectId: string, opts: OpcionesDeCarga): Promise<CotizacionPayload | null> {
  const project = await cargarProyecto(projectId);
  if (!project) return null;

  const ahora = new Date();
  const latest = ultimasEstimaciones(project.estimates);
  const guardada = project.cotizacion;
  const decision = project.decisions[0] ?? null;
  const proyecto = { id: project.id, nombre: project.name, objetivo: project.objective || null, cliente: project.client };
  const proveedorPorOmision = project.workspace?.displayName ?? opts.proveedorNombrePorOmision ?? "";

  const opciones: OpcionDisponible[] = latest.map((e) => ({
    mode: e.mode,
    scenario: e.scenario,
    total: Number(e.total),
    semanas: e.weeksTotal === null ? null : Number(e.weeksTotal),
  }));

  if (latest.length === 0) {
    const campos = guardada
      ? camposDeFila(guardada)
      : camposPorOmision({
          proveedorNombre: proveedorPorOmision,
          clienteNombre: project.client,
          mode: "hybrid",
          scenario: "probable",
          fechaParametros: null,
          ahora,
        });
    return {
      guardada: !!guardada,
      puedeEditar: opts.puedeEditar,
      esEjemplo: project.isTemplate,
      sinEstimacion: true,
      proyecto,
      campos,
      cifras: null,
      opciones,
      recomendada: null,
      decision: decision ? { mode: decision.mode, scenario: decision.scenario } : null,
      desactualizada: null,
      acumulado: null,
    };
  }

  // Lo que recomienda el sistema para quien cotiza (la misma recomendación de toda la aplicación).
  const { recomendacion } = recomendacionDelProyecto({
    role: "proveedor",
    project: {
      priority: project.priority,
      targetDate: project.targetDate,
      estimatedBudget: project.estimatedBudget !== null ? Number(project.estimatedBudget) : null,
      systemType: project.systemType,
    },
    modules: project.modules.map((m) => ({
      complexity: m.complexity,
      clarity: m.clarity,
      criticality: m.criticality,
      screensCount: m.screensCount,
      reportsCount: m.reportsCount,
      catalogsCount: m.catalogsCount,
      integrationsCount: m.integrationsCount,
      sensitiveData: m.sensitiveData,
    })),
    estimates: latest.map((e) => ({
      mode: e.mode,
      scenario: e.scenario,
      total: Number(e.total),
      weeksTotal: e.weeksTotal !== null ? Number(e.weeksTotal) : null,
      weeksToPrototype: e.weeksToPrototype !== null ? Number(e.weeksToPrototype) : null,
      riskScore: Number(e.riskScore),
      riskLevel: e.riskLevel,
      margin: Number(e.margin),
    })),
    team: project.team.map((t) => ({ role: t.role, availabilityPercent: t.availabilityPercent, aiSkill: t.aiSkill })),
    workingCapitalRequired: Number(project.cashflow[0]?.workingCapitalRequired ?? 0),
  });
  const recomendada = recomendacion ? { mode: recomendacion.best.mode, scenario: recomendacion.best.scenario } : null;

  // Qué opción se cotiza: la que pide quien llama, la ya guardada, la que eligió la persona,
  // la que recomienda el sistema y, por último, la híbrida probable.
  const existe = (m?: string | null, s?: string | null) => !!m && !!s && latest.some((e) => e.mode === m && e.scenario === s);
  const candidatas: Array<{ mode?: string | null; scenario?: string | null }> = [
    { mode: opts.mode, scenario: opts.scenario },
    { mode: guardada?.mode, scenario: guardada?.scenario },
    { mode: decision?.mode, scenario: decision?.scenario },
    { mode: recomendada?.mode, scenario: recomendada?.scenario },
    { mode: "hybrid", scenario: "probable" },
  ];
  const elegida = candidatas.find((c) => existe(c.mode, c.scenario));
  const mode = elegida?.mode ?? latest[0].mode;
  const scenario = elegida?.scenario ?? latest[0].scenario;
  const estimacionDeHoy = latest.find((e) => e.mode === mode && e.scenario === scenario) ?? latest[0];

  // Las cifras: las congeladas si esa misma opción ya está guardada; si no, las de hoy.
  const snapshotGuardado = guardada ? leerSnapshot(guardada.snapshotJson) : null;
  const usaCongeladas = !!guardada && !!snapshotGuardado && guardada.mode === mode && guardada.scenario === scenario;
  const cifras: CifrasCongeladas = usaCongeladas
    ? soloCifras(snapshotGuardado!)
    : await cifrasDeEstimacion(project, estimacionDeHoy);

  let desactualizada: CotizacionPayload["desactualizada"] = null;
  if (usaCongeladas && snapshotGuardado && estimacionDeHoy.id !== snapshotGuardado.estimacion.id) {
    const totalHoy = Number(estimacionDeHoy.total);
    if (Math.abs(totalHoy - snapshotGuardado.total) >= 1) {
      desactualizada = { totalGuardado: snapshotGuardado.total, totalHoy };
    }
  }

  const campos: CamposDeCotizacion = guardada
    ? { ...camposDeFila(guardada), mode, scenario }
    : camposPorOmision({
        proveedorNombre: proveedorPorOmision,
        clienteNombre: project.client,
        mode,
        scenario,
        fechaParametros: cifras.estimacion.calculadaEl,
        ahora,
      });

  const precio = precioPactado(decision?.estimateId, project.estimates, mode);
  const acumulado = precio ? acumuladoDeCambios(cambiosParaAcumular(project.changes), precio.subtotal) : null;

  return {
    guardada: !!guardada,
    puedeEditar: opts.puedeEditar,
    esEjemplo: project.isTemplate,
    sinEstimacion: false,
    proyecto,
    campos,
    cifras,
    opciones,
    recomendada,
    decision: decision ? { mode: decision.mode, scenario: decision.scenario } : null,
    desactualizada,
    acumulado,
  };
}

// ============================================================
// Guardar
// ============================================================

export class ErrorDeCotizacion extends Error {
  constructor(
    mensaje: string,
    readonly estado: number = 400,
  ) {
    super(mensaje);
  }
}

/**
 * Guarda (crea o reemplaza) la cotización del proyecto.
 *
 * Las cifras se congelan la primera vez, o cuando la persona cambia la forma de
 * hacerlo o el escenario, o pide actualizarlas. En cualquier otro guardado se
 * conservan las que ya estaban, aunque la estimación se haya recalculado: la
 * cotización que ya se entregó no cambia sola. Al congelar cifras nuevas la
 * fecha de la cotización pasa a hoy. El número se asigna una sola vez.
 */
export async function guardarCotizacion(
  projectId: string,
  datos: CotizacionGuardar,
): Promise<{ carga: CotizacionPayload; numero: string; nueva: boolean }> {
  const project = await cargarProyecto(projectId);
  if (!project) throw new ErrorDeCotizacion("Proyecto no encontrado.", 404);

  const latest = ultimasEstimaciones(project.estimates);
  const estimacion = latest.find((e) => e.mode === datos.mode && e.scenario === datos.scenario);
  if (!estimacion) {
    throw new ErrorDeCotizacion(
      "No hay una estimación calculada para esa forma de hacerlo y ese escenario. Calcula el precio primero.",
    );
  }

  const ahora = new Date();
  const previa = project.cotizacion;
  const snapshotPrevio = previa ? leerSnapshot(previa.snapshotJson) : null;
  const conservaCifras =
    !!previa && !!snapshotPrevio && !datos.refrescarCifras && previa.mode === datos.mode && previa.scenario === datos.scenario;

  const cifras: CifrasCongeladas = conservaCifras
    ? soloCifras(snapshotPrevio!)
    : await cifrasDeEstimacion(project, estimacion);
  const snapshot = completarSnapshot(cifras, datos);

  let numero = previa?.numero;
  if (!numero) {
    const anio = anioDeCotizacion(ahora);
    const existentes = await prisma.cotizacion.findMany({
      where: { numero: { startsWith: `COT-${anio}-` }, project: { workspaceId: project.workspaceId } },
      select: { numero: true },
    });
    numero = siguienteNumero(existentes.map((x) => x.numero), ahora);
  }

  const campos: Prisma.CotizacionUncheckedCreateInput = {
    projectId,
    numero,
    fecha: previa && conservaCifras ? previa.fecha : ahora,
    vigenciaDias: datos.vigenciaDias,
    proveedorNombre: datos.proveedorNombre,
    proveedorRfc: datos.proveedorRfc,
    proveedorContacto: datos.proveedorContacto,
    clienteNombre: datos.clienteNombre,
    mode: datos.mode,
    scenario: datos.scenario,
    estimateId: cifras.estimacion.id,
    exclusionesJson: JSON.stringify(datos.exclusiones),
    supuestosJson: JSON.stringify(datos.supuestos),
    incluyeMantenimiento: datos.incluyeMantenimiento,
    mantenimientoMensual: datos.mantenimientoMensual,
    anticipoPct: datos.anticipoPct,
    finalPct: datos.finalPct,
    notas: datos.notas,
    snapshotJson: JSON.stringify(snapshot),
  };
  const { projectId: _id, ...sinProyecto } = campos;
  await prisma.cotizacion.upsert({
    where: { projectId },
    create: campos,
    update: sinProyecto,
  });
  await prisma.auditLog.create({
    data: {
      entity: "Cotizacion",
      entityId: projectId,
      action: previa ? "update" : "create",
      after: JSON.stringify({ numero, mode: datos.mode, scenario: datos.scenario, total: snapshot.total }),
      context: `Cotización ${numero} del proyecto ${projectId}`,
    },
  });

  const carga = await cargarCotizacion(projectId, { puedeEditar: true });
  if (!carga) throw new ErrorDeCotizacion("Proyecto no encontrado.", 404);
  return { carga, numero, nueva: !previa };
}
