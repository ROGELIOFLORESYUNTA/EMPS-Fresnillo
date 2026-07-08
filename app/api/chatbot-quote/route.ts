/**
 * POST /api/chatbot-quote — Integración con el chatbot de ROSBECLOUD.
 *
 * Recibe la descripción estructurada de un proyecto (módulos ya inferidos por
 * el bot), crea un Proyecto REAL (workspace fijo "chatbot-rosbecloud" para
 * poder verlos juntos en la UI), corre runEstimate (versionado + auditoría) y
 * devuelve los escenarios + un rango listo para mostrar al cliente.
 *
 * PANEL DE CONTROL DEL VENDEDOR: los supuestos del cálculo viven como
 * parámetros CHATBOT_* en el catálogo Parameter (se auto-siembran) y el
 * vendedor los edita en /admin/parametros tras recuperar el workspace
 * RSBE-CHAT. Sus overrides aplican al instante en cada cotización.
 *
 * Seguridad: header X-API-Key contra CHATBOT_API_KEY del .env (server-to-server
 * por loopback), comparación timing-safe, rate limit por IP y validación zod.
 */
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { chatbotQuoteSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { runEstimate } from "@/lib/estimate-service";
import { normalizeMode } from "@/lib/engine";
import { logWorkspaceActivity } from "@/lib/workspace";

const CHATBOT_WORKSPACE_ID = "chatbot-rosbecloud";
const KNOB_YEAR = 2026;
// Código privado del vendedor para acceder al workspace del cotizador desde la UI.
// Vive en el .env (secreto); si no está, cae al legacy solo para no romper.
const CHATBOT_RECOVERY_CODE = process.env.CHATBOT_WORKSPACE_RECOVERY_CODE || "RSBE-CHAT";

/** Perillas del vendedor: clave → { default, unit, nota visible en la UI }. */
const KNOBS = {
  CHATBOT_SUELDO_MENSUAL_MXN: {
    def: 30000,
    unit: "MXN",
    notes:
      "Sueldo mensual del perfil que costea las cotizaciones del chat de rosbecloud.com.mx. Súbelo si tu costo real por desarrollador es mayor: los rangos del chat subirán.",
  },
  CHATBOT_MARGEN: {
    def: 0.2,
    unit: "ratio",
    notes: "Margen de ganancia de las cotizaciones del chat. 0.20 = 20%. Súbelo para cobrar más por proyecto.",
  },
  CHATBOT_CAPACIDAD_SEMANAL_HORAS: {
    def: 80,
    unit: "horas",
    notes: "Horas por semana que el equipo dedica al proyecto. Afecta el tiempo estimado que da el chat.",
  },
  CHATBOT_PRECIO_MINIMO_MXN: {
    def: 25000,
    unit: "MXN",
    notes:
      "Piso comercial: si el cálculo sale por debajo, el chat dice 'desde este monto' en lugar de una cifra menor. Protege proyectos chicos.",
  },
  CHATBOT_TECHO_AUTOMATICO_MXN: {
    def: 0,
    unit: "MXN",
    notes:
      "Techo: si el cálculo supera este monto, el chat NO da cifras al cliente y ofrece propuesta del equipo (tú sí ves el rango en el lead). 0 = apagado.",
  },
} as const;

type KnobKey = keyof typeof KNOBS;

/** Auto-siembra: crea los parámetros globales CHATBOT_* si no existen (aparecen solos en /admin/parametros). */
async function ensureChatbotKnobs(): Promise<void> {
  const keys = Object.keys(KNOBS) as KnobKey[];
  const existing = await prisma.parameter.findMany({
    where: { year: KNOB_YEAR, country: "Mexico", key: { in: keys } },
    select: { key: true },
  });
  const have = new Set(existing.map((p) => p.key));
  const missing = keys.filter((k) => !have.has(k));
  for (const key of missing) {
    const k = KNOBS[key];
    await prisma.parameter.create({
      data: {
        year: KNOB_YEAR,
        country: "Mexico",
        state: null,
        key,
        value: String(k.def),
        unit: k.unit,
        source: "Cotizador chatbot ROSBECLOUD",
        effectiveFrom: new Date(`${KNOB_YEAR}-01-01T00:00:00Z`),
        notes: k.notes,
      },
    });
  }
}

/** Lee las perillas: valor global + override del workspace del chatbot (editable por el vendedor). */
async function loadChatbotKnobs(): Promise<Record<KnobKey, number>> {
  const keys = Object.keys(KNOBS) as KnobKey[];
  const [globals, overrides] = await Promise.all([
    prisma.parameter.findMany({
      where: { year: KNOB_YEAR, country: "Mexico", key: { in: keys } },
      select: { key: true, value: true },
    }),
    prisma.workspaceParameterOverride.findMany({
      where: { workspaceId: CHATBOT_WORKSPACE_ID, parameterKey: { in: keys } },
      select: { parameterKey: true, value: true },
    }),
  ]);
  const map = new Map<string, string | null>();
  for (const g of globals) map.set(g.key, g.value);
  for (const o of overrides) map.set(o.parameterKey, o.value); // el override del vendedor manda

  const out = {} as Record<KnobKey, number>;
  for (const key of keys) {
    const raw = map.get(key);
    const n = raw != null ? Number.parseFloat(raw) : NaN;
    out[key] = Number.isFinite(n) ? n : KNOBS[key].def;
  }
  return out;
}

function keyIsValid(req: NextRequest): boolean {
  const expected = process.env.CHATBOT_API_KEY;
  if (!expected) return false;
  const got = req.headers.get("x-api-key") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Garantiza el workspace fijo de cotizaciones del chatbot (visible/recuperable en la UI con RSBE-CHAT). */
async function ensureChatbotWorkspace() {
  return prisma.workspace.upsert({
    where: { id: CHATBOT_WORKSPACE_ID },
    create: {
      id: CHATBOT_WORKSPACE_ID,
      displayName: "Cotizaciones Chatbot ROSBECLOUD",
      role: "proveedor",
      recoveryCode: CHATBOT_RECOVERY_CODE,
      notes: "Proyectos creados automáticamente por el chatbot de rosbecloud.com.mx",
      lastSeenAt: new Date(),
    },
    // Auto-cura: mantiene el código de acceso sincronizado con el .env (privado).
    update: { lastSeenAt: new Date(), recoveryCode: CHATBOT_RECOVERY_CODE },
  });
}

export async function POST(req: NextRequest) {
  // Sin key configurada: integración apagada.
  if (!process.env.CHATBOT_API_KEY) {
    return NextResponse.json({ error: "Integración de chatbot no habilitada." }, { status: 503 });
  }
  if (!keyIsValid(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const rl = rateLimit(`chatbot:${clientIp(req)}`, { maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = chatbotQuoteSchema.parse(body);
    const mode = normalizeMode(data.mode);

    const workspace = await ensureChatbotWorkspace();
    await ensureChatbotKnobs();
    const knobs = await loadChatbotKnobs();

    const contactBits = [
      data.contact?.name ? `Contacto: ${data.contact.name}` : null,
      data.contact?.email ? `Correo: ${data.contact.email}` : null,
      data.contact?.company ? `Empresa: ${data.contact.company}` : null,
    ].filter(Boolean);

    const project = await prisma.project.create({
      data: {
        name: `Chatbot: ${data.projectName}`,
        description: data.description ?? null,
        client: data.contact?.company || data.contact?.name || "Prospecto del chatbot",
        clientType: "externo",
        municipalArea: "Clientes web (rosbecloud.com.mx)",
        objective: data.description?.slice(0, 500) || `Cotización solicitada vía chatbot: ${data.projectName}`,
        systemType: "cotizacion_chatbot",
        responsible: "Chatbot ROSBECLOUD",
        priority: "media",
        notes: contactBits.length ? contactBits.join(" | ") : null,
        workspaceId: workspace.id,
        isTemplate: false,
        modules: {
          create: data.modules.map((m) => ({
            name: m.name,
            type: "transaccional",
            complexity: m.complexity,
            clarity: m.clarity,
            criticality: m.criticality,
            screensCount: m.screensCount,
            reportsCount: m.reportsCount,
            catalogsCount: 0,
            integrationsCount: m.integrationsCount,
            sensitiveData: m.sensitiveData,
          })),
        },
        team: {
          create: (data.team?.length
            ? data.team
            : [{ role: "dev_senior", monthlySalary: knobs.CHATBOT_SUELDO_MENSUAL_MXN }]
          ).map((t) => ({
            name: t.role,
            role: t.role,
            monthlySalary: t.monthlySalary,
            monthsAssigned: 1,
          })),
        },
      },
    });

    // El workspace del chatbot se pasa a runEstimate: los overrides del vendedor
    // (fiscales, modos, escenarios) en ese workspace aplican a las cotizaciones.
    const result = await runEstimate({
      projectId: project.id,
      mode,
      targetMargin: Math.min(0.95, Math.max(0, knobs.CHATBOT_MARGEN)),
      weeklyTeamCapacityHours: Math.max(1, knobs.CHATBOT_CAPACIDAD_SEMANAL_HORAS),
      workspaceId: CHATBOT_WORKSPACE_ID,
    });

    const totals = result.estimates.map((e) => e.total);
    const weeks = result.estimates.map((e) => e.weeksTotal);
    const probable = result.estimates.find((e) => e.scenario === "probable") ?? result.estimates[0];

    await logWorkspaceActivity(workspace.id, "chatbot_quote", {
      projectId: project.id,
      mode,
      totalProbable: probable?.total ?? null,
    });

    return NextResponse.json(
      {
        projectId: project.id,
        projectName: project.name,
        results: result.estimates.map((e) => ({
          mode: e.mode,
          scenario: e.scenario,
          totalEffortHours: Math.round(e.totalEffortHours),
          weeksTotal: Math.round(e.weeksTotal * 10) / 10,
          weeksToPrototype: Math.round(e.weeksToPrototype * 10) / 10,
          subtotal: Math.round(e.subtotal),
          vat: Math.round(e.vat),
          total: Math.round(e.total),
          riskLevel: e.riskLevel,
        })),
        range: {
          totalMin: Math.round(Math.min(...totals)),
          totalMax: Math.round(Math.max(...totals)),
          weeksMin: Math.round(Math.min(...weeks) * 10) / 10,
          weeksMax: Math.round(Math.max(...weeks) * 10) / 10,
        },
        policy: {
          precioMinimoMxn: knobs.CHATBOT_PRECIO_MINIMO_MXN,
          techoAutomaticoMxn: knobs.CHATBOT_TECHO_AUTOMATICO_MXN,
        },
        riskLevel: probable?.riskLevel ?? "medio",
        currency: "MXN",
        disclaimer: "Estimación preliminar automática; sujeta a validación del equipo.",
      },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 400 },
    );
  }
}
