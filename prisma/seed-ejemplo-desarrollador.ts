/**
 * Crea el proyecto de EJEMPLO del lado del DESARROLLADOR.
 *
 * Es el caso de una persona que trabaja por su cuenta y le cotiza a un cliente
 * privado: un sistema de citas y expedientes para una clínica dental. Sirve de
 * plantilla para que quien entra por el lado del desarrollador vea un proyecto
 * ya capturado, con cifras calculadas de verdad, sin llenar nada. (El ejemplo
 * del lado del Ayuntamiento lo crea ensure-ejemplo-publico.ts.)
 *
 * Es idempotente y NO destructivo: si ya existe una plantilla del lado
 * desarrollador, no cambia nada y solo imprime su id. Nunca borra ni modifica
 * un proyecto que ya existía, así que se puede correr en el servidor.
 *
 * Antes de correrlo:
 *   - Los parámetros del motor deben estar sembrados (npm run db:seed).
 *   - En una base nueva, correr primero ensure-ejemplo-publico.ts: ese script
 *     se salta si ya hay CUALQUIER plantilla, también la de este lado.
 *
 * Uso: npx tsx prisma/seed-ejemplo-desarrollador.ts
 * Después de desplegar la versión de dos lados, correrlo también en el servidor.
 */
import { PrismaClient } from "@prisma/client";
import { runEstimate } from "../lib/estimate-service";
import type { DevelopmentMode } from "../lib/engine";

const prisma = new PrismaClient();

const FORMAS: DevelopmentMode[] = ["traditional", "ai_assisted", "bytecoding_prompts", "low_code", "hybrid"];

// La última forma que se calcula deja el flujo de efectivo del proyecto. Para
// este caso el sistema recomienda bytecoding (low-code se descarta por los
// datos de salud y el híbrido sale más caro y más lento), así que va al final:
// la pantalla abre en esa opción y el flujo de efectivo es el de esa misma opción.
const RECOMENDADA: DevelopmentMode = "bytecoding_prompts";
const ORDEN_DE_CALCULO = [...FORMAS.filter((m) => m !== RECOMENDADA), RECOMENDADA];

const mxn = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/** Suma meses sin desbordar el día: 31 de agosto más un mes es el 30 de septiembre. */
function sumarMeses(desde: Date, meses: number): Date {
  const r = new Date(desde.getFullYear(), desde.getMonth() + meses, 1, 12, 0, 0);
  const ultimoDia = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(desde.getDate(), ultimoDia));
  return r;
}

/**
 * Fecha objetivo: unos 3 meses desde hoy, pero dentro de un año que tenga
 * parámetros. El motor lee los parámetros fiscales del año de la fecha
 * objetivo; hoy solo existen los de 2026, y con una fecha de 2027 el cálculo
 * truena ("Parametro ... no encontrado"), igual que la pantalla Calcular. Si el
 * año de la fecha no tiene parámetros, se usa el 31 de diciembre del último año
 * que sí los tiene. Cuando se carguen los de 2027 saldrá la fecha de 3 meses.
 * La fecha no se mueve después de estimar: la plantilla se puede recalcular
 * desde la pantalla y ese cálculo volvería a tronar.
 */
function fechaObjetivo(aniosConParametros: number[]): { fecha: Date; ajustada: boolean } {
  const deseada = sumarMeses(new Date(), 3);
  if (aniosConParametros.includes(deseada.getFullYear())) return { fecha: deseada, ajustada: false };
  const ultimo = Math.max(...aniosConParametros);
  return { fecha: new Date(ultimo, 11, 31, 12, 0, 0), ajustada: true };
}

async function main() {
  console.log("=== Ejemplo del lado del desarrollador ===\n");

  // 1. Idempotente: si ya hay una plantilla de este lado, no se toca nada.
  const yaExiste = await prisma.project.findFirst({
    where: { isTemplate: true, lado: "desarrollador" },
    select: { id: true, name: true },
  });
  if (yaExiste) {
    console.log(`Ya existe el ejemplo del lado del desarrollador: ${yaExiste.name}. No se cambia nada.`);
    console.log(`Id del proyecto: ${yaExiste.id}`);
    return;
  }

  // 2. Sin parámetros del motor no se puede estimar: avisar antes de crear nada.
  const anios = (await prisma.parameter.groupBy({ by: ["year"] })).map((a) => a.year);
  if (anios.length === 0) {
    throw new Error("La base no tiene parámetros del motor. Corre antes: npm run db:seed");
  }
  const { fecha: targetDate, ajustada: fechaAjustada } = fechaObjetivo(anios);

  // 3. El proyecto: un desarrollador independiente y una clínica privada.
  console.log("Creando el proyecto de ejemplo...");
  const project = await prisma.project.create({
    data: {
      name: "Sistema de citas y expedientes para una clínica dental",
      description:
        "Sistema web donde los pacientes piden su cita desde el celular, la clínica guarda el expediente de cada uno, les avisa por WhatsApp antes de la cita y lleva sus cobros. Lo usan la dueña, los dentistas y la recepción de la Clínica Dental Sonrisa.",
      client: "Clínica Dental Sonrisa (cliente privado)",
      clientType: "externo",
      municipalArea: "No aplica: cliente privado",
      objective:
        "Dejar la libreta y las llamadas: que las citas se agenden solas, que no se pierdan pacientes por olvidos y que la dueña vea cuánto entra cada semana.",
      systemType: "crud_interno",
      responsible: "La dueña de la clínica",
      priority: "media",
      status: "captura",
      notes:
        "Ejemplo del lado del desarrollador: una persona que trabaja por su cuenta le cotiza a una clínica privada. El presupuesto de la clínica ya incluye IVA, así que se compara contra el precio con IVA. Quien cotiza es también quien programa: su tiempo cuenta con contrato Propio (lo que vale su tiempo, sin IMSS ni nómina).",
      estimatedBudget: 180000, // lo que la clínica piensa gastar, con IVA
      targetDate,
      expectedUsers: 6, // la dueña, 2 dentistas, 2 en recepción y 1 asistente
      clientAvailabilityLevel: "media", // la dueña contesta cuando puede
      isTemplate: true,
      workspaceId: null,
      lado: "desarrollador",
      modules: {
        create: [
          {
            name: "Agenda y citas en línea",
            type: "transaccional",
            description: "El paciente pide su cita desde el celular y la recepción ve la agenda del día de cada dentista. Evita citas encimadas.",
            complexity: 3, clarity: 4, criticality: 4,
            screensCount: 2, reportsCount: 0, catalogsCount: 1, integrationsCount: 0,
            sensitiveData: false,
            rolesPermissions: "Recepción, Dentista, Paciente (agenda en línea)",
          },
          {
            name: "Expediente del paciente",
            type: "transaccional",
            description: "Datos del paciente, historial de tratamientos, alergias y notas de cada consulta en un solo lugar. Son datos de salud, que la ley trata como datos sensibles.",
            complexity: 2, clarity: 4, criticality: 5, // criticidad máxima: es el dato más delicado de la clínica
            screensCount: 1, reportsCount: 0, catalogsCount: 1, integrationsCount: 0,
            sensitiveData: true,
            rolesPermissions: "Dentista, Recepción (solo consulta)",
          },
          {
            name: "Recordatorios por WhatsApp",
            type: "integracion",
            description: "Avisa por WhatsApp un día antes de la cita y deja confirmarla o cancelarla. Se conecta con el servicio de mensajes de WhatsApp (una integración externa).",
            complexity: 2, clarity: 4, criticality: 2,
            screensCount: 1, reportsCount: 0, catalogsCount: 0, integrationsCount: 1,
            sensitiveData: false,
            rolesPermissions: "Recepción",
          },
          {
            name: "Cobros y recibos",
            type: "transaccional",
            description: "Registra el pago de cada consulta o tratamiento, cobra con la terminal bancaria o liga de pago y da el recibo. Se conecta con la terminal o pasarela de pago (una integración externa).",
            complexity: 3, clarity: 3, criticality: 3,
            screensCount: 1, reportsCount: 0, catalogsCount: 0, integrationsCount: 1,
            sensitiveData: false,
            rolesPermissions: "Recepción, Dueña",
          },
          {
            name: "Reportes para la dueña",
            type: "reporte",
            description: "Cuánto se cobró, cuántas citas se cumplieron o se cancelaron y qué tratamientos se piden más, por semana y por mes.",
            complexity: 1, clarity: 4, criticality: 2,
            screensCount: 1, reportsCount: 2, catalogsCount: 0, integrationsCount: 0,
            sensitiveData: false,
            rolesPermissions: "Dueña",
          },
          {
            name: "Usuarios y permisos",
            type: "catalogo",
            description: "Quién entra al sistema y qué puede ver: la dueña, los dentistas y la recepción.",
            complexity: 1, clarity: 5, criticality: 3,
            screensCount: 1, reportsCount: 0, catalogsCount: 0, integrationsCount: 0,
            sensitiveData: false,
            rolesPermissions: "Dueña (administra)",
          },
        ],
      },
      team: {
        create: [
          {
            name: "Tú (desarrollador independiente)",
            role: "dev_senior",
            level: "senior",
            contractType: "propio", // lo que vale tu tiempo: sin IMSS ni impuesto sobre nómina
            monthlySalary: 35000,
            payBasis: "mensual",
            availabilityPercent: 75, // además de este proyecto atiendes otros clientes
            monthsAssigned: 3, // aproximado; la duración real la calcula el motor
            aiSkill: 4, // usa la IA a diario y sabe dar instrucciones
            isOwner: true,
            productivityFactor: 1.0,
            turnoverRisk: 1, // quien cotiza es quien hace el trabajo: nadie se va a medio proyecto
            supervisionRequired: 1,
            notes: "Eres tú: cotizas y haces el trabajo. Con el contrato Propio el sistema cuenta lo que vale tu tiempo, sin cargas de nómina.",
          },
        ],
      },
    },
    include: { modules: true, team: true },
  });
  console.log(`  Proyecto creado: ${project.name}`);
  console.log(`  ${project.modules.length} módulos, ${project.team.length} perfil de equipo`);
  console.log(
    `  Fecha objetivo: ${targetDate.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}` +
      (fechaAjustada ? " (ajustada: el motor aún no tiene parámetros del año siguiente)" : "") +
      "\n",
  );

  // 4. Estimar las 5 formas de hacerlo × 3 escenarios. Si algo falla se borra el
  // proyecto a medias, para que al volver a correr el script se cree completo.
  console.log("Estimando las 5 formas × 3 escenarios...");
  try {
    for (const mode of ORDEN_DE_CALCULO) {
      await runEstimate({
        projectId: project.id,
        mode,
        targetMargin: 0.20,
        costMode: "detailed",
        // Una persona sola: lo que puede adelantar de su bolsa es poco.
        capitalDeclaredByProvider: 30000,
        cashFlowAssumptions: {
          // Cliente privado: la mitad al empezar y la mitad al entregar.
          anticipoPct: 0.50,
          finalPaymentPct: 0.50,
          durationMonths: 3,
          monthlyToolsCost: 1500, // servidor, dominio y mensajes de WhatsApp
          monthlyAdminCost: 1000, // contador
        },
      });
      console.log(`  ${mode}: 3 escenarios generados`);
    }
  } catch (e) {
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
    throw e;
  }

  // 5. Resumen
  const estimaciones = await prisma.estimate.findMany({
    where: { projectId: project.id, scenario: "probable" },
    select: { mode: true, total: true, weeksTotal: true, riskLevel: true },
  });
  const porForma = (m: string) => estimaciones.find((e) => e.mode === m);
  console.log("\n=== Resumen (escenario probable, con IVA) ===");
  console.table(
    FORMAS.map((m) => {
      const e = porForma(m);
      return { forma: m, total: e ? mxn(Number(e.total)) : "-", semanas: e ? Number(e.weeksTotal).toFixed(1) : "-", riesgo: e?.riskLevel ?? "-" };
    }),
  );
  const hibrido = porForma("hybrid");
  console.log(`Id del proyecto: ${project.id}`);
  console.log(`Total probable híbrido (con IVA): ${hibrido ? mxn(Number(hibrido.total)) : "sin cifra"}`);
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
