/**
 * POST /api/cotizar: de la descripción a la cifra en un paso.
 *
 * Crea el proyecto con los mismos valores típicos que usa el chatbot
 * (cada parte: complejidad 3, claridad 3, criticidad 3, una pantalla; equipo:
 * un desarrollador senior en nómina; utilidad 20 %), corre las cinco formas
 * de hacerlo y deja al visitante en la pantalla del resultado. Todo lo que
 * se asumió queda escrito en las notas del proyecto para que se pueda afinar.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runEstimate } from "@/lib/estimate-service";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

const NOTA_COTIZACION_RAPIDA = "Creado con Cotizar en un minuto.";

const MODOS = ["traditional", "ai_assisted", "hybrid", "bytecoding_prompts", "low_code"] as const;
const SUELDO_TIPICO_MXN = 30000;
const UTILIDAD_TIPICA = 0.2;

const bodySchema = z.object({
  queSistema: z.string().trim().min(10).max(2000),
  partes: z.array(z.string().trim().min(2).max(80)).min(1).max(20),
  presupuesto: z.number().min(0).max(1_000_000_000).nullable().optional(),
  fechaLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  disponibilidadCliente: z.enum(["alta", "media", "baja"]).nullable().optional(),
  lado: z.enum(["ayuntamiento", "proveedor"]).nullable().optional(),
  /** Pericia con la IA de quien lo va a hacer: 1 nunca, 3 a veces, 4 todos los días. */
  experienciaIA: z.number().int().min(1).max(5).nullable().optional(),
  personasQueLoUsan: z.number().int().min(1).max(100000).nullable().optional(),
  segundosEnLlenar: z.number().int().min(0).max(86400).optional(),
});

/** Adivina el tipo de sistema por las palabras del usuario; se puede corregir después. */
function tipoDeSistema(texto: string): string {
  const t = texto.toLowerCase();
  if (/tr[aá]mite|pago|predial|licencia|multa/.test(t)) return "tramites";
  if (/portal|ciudadan/.test(t)) return "portal_ciudadano";
  if (/reporte|tablero|indicador/.test(t)) return "reportes";
  if (/m[oó]vil|celular|\bapp\b/.test(t)) return "movil";
  if (/conect|integr|enlaz/.test(t)) return "integrador";
  return "crud_interno";
}

export async function POST(req: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "No se pudo identificar tu espacio de trabajo. Recarga la página." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Faltan datos: qué sistema necesitas y al menos una parte." }, { status: 400 });
  }
  const data = parsed.data;

  // Si el visitante dijo de qué lado está y aún no tiene rol, se guarda: la
  // recomendación depende de ello.
  if (data.lado && !workspace.role) {
    const role = data.lado === "proveedor" ? "proveedor" : "operador_municipal";
    await prisma.workspace.update({ where: { id: workspace.id }, data: { role } }).catch(() => {});
  }

  const nombre = data.queSistema.length > 70 ? `${data.queSistema.slice(0, 67).trimEnd()}...` : data.queSistema;
  const esProveedor = data.lado === "proveedor";

  const project = await prisma.project.create({
    data: {
      name: nombre,
      client: esProveedor ? "Cliente por definir" : "Ayuntamiento",
      clientType: "municipal",
      municipalArea: "Por definir",
      objective: data.queSistema,
      systemType: tipoDeSistema(data.queSistema),
      priority: "media",
      estimatedBudget: data.presupuesto ?? null,
      targetDate: data.fechaLimite ? new Date(`${data.fechaLimite}T12:00:00`) : null,
      clientAvailabilityLevel: data.disponibilidadCliente ?? null,
      expectedUsers: data.personasQueLoUsan ?? null,
      notes: `${NOTA_COTIZACION_RAPIDA} Cada parte se tomó de tamaño mediano y con una pantalla; el equipo es un desarrollador con experiencia a sueldo de nómina (${SUELDO_TIPICO_MXN.toLocaleString("es-MX")} pesos al mes); la utilidad es ${UTILIDAD_TIPICA * 100} %. Afina módulos y equipo para que la cifra sea tuya.`,
      workspaceId: workspace.id,
      isTemplate: false,
      modules: {
        create: data.partes.map((name) => ({
          name,
          type: "transaccional",
          complexity: 3,
          clarity: 3,
          criticality: 3,
          screensCount: 1,
          reportsCount: 0,
          catalogsCount: 0,
          integrationsCount: 0,
          sensitiveData: false,
        })),
      },
      team: {
        create: [{ name: "Desarrollador con experiencia (equipo típico)", role: "dev_senior", monthlySalary: SUELDO_TIPICO_MXN, monthsAssigned: 1, aiSkill: data.experienciaIA ?? 3 }],
      },
    },
  });

  await logWorkspaceActivity(workspace.id, "project_created", { projectId: project.id, name: project.name, origen: "cotizacion_rapida" });

  const totales: Record<string, number | null> = {};
  for (const mode of MODOS) {
    const result = await runEstimate({
      projectId: project.id,
      mode,
      targetMargin: UTILIDAD_TIPICA,
      workspaceId: workspace.id,
      // Forma de pago típica (30 % anticipo, 30 % al cerrar) para que el flujo
      // y el dinero que adelanta el proveedor no salgan en cero. Sin otras
      // herramientas ni administración: solo las herramientas de IA calculadas.
      cashFlowAssumptions: { anticipoPct: 0.3, finalPaymentPct: 0.3, durationMonths: 3, monthlyToolsCost: 0, monthlyAdminCost: 0 },
    });
    const probable = result.estimates.find((e) => e.scenario === "probable") ?? result.estimates[0];
    totales[mode] = probable?.total ?? null;
  }

  await logWorkspaceActivity(workspace.id, "estimate_run", { projectId: project.id, mode: "todos", origen: "cotizacion_rapida" });
  await logWorkspaceActivity(workspace.id, "cotizacion_rapida", {
    projectId: project.id,
    partes: data.partes.length,
    conPresupuesto: data.presupuesto != null,
    conFecha: !!data.fechaLimite,
    disponibilidadCliente: data.disponibilidadCliente ?? null,
    lado: data.lado ?? null,
    experienciaIA: data.experienciaIA ?? null,
    personasQueLoUsan: data.personasQueLoUsan ?? null,
    segundosEnLlenar: data.segundosEnLlenar ?? null,
    totales,
  });

  return NextResponse.json({ project: { id: project.id }, totales }, { status: 201 });
}
