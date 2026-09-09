/**
 * Crea el proyecto de EJEMPLO que cualquiera puede abrir sin capturar nada.
 *
 * Es idempotente y NO destructivo: si ya existe un proyecto marcado como
 * ejemplo (isTemplate), no hace nada. A diferencia de reset-demo-realista,
 * este script nunca borra proyectos, asi que se puede correr en produccion.
 *
 * Uso: npx tsx prisma/ensure-ejemplo-publico.ts
 */
/**
 * El ejemplo es un caso realista: "Sistema integral de tramites municipales",
 * proyecto medio-grande con 8 modulos, datos sensibles, integraciones y un
 * equipo de 4 personas, para que se noten las diferencias entre modos de
 * desarrollo.
 */
import { PrismaClient } from "@prisma/client";
import { runEstimate } from "../lib/estimate-service";
import type { DevelopmentMode } from "../lib/engine";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Ejemplo publico del sistema ===\n");

  // Este script NO toca los parametros del motor. La version que se copio de
  // reset-demo-realista si los reescribia con el JSON semilla, y correrlo en
  // produccion habria borrado la calibracion hecha desde /admin/calibracion.
  // Para actualizar parametros existe prisma/update-parameters.ts.

  // 1. Si ya existe un ejemplo publico, no se hace nada (idempotente).
  const yaExiste = await prisma.project.findFirst({ where: { isTemplate: true } });
  if (yaExiste) {
    console.log("Ya existe un ejemplo publico: " + yaExiste.name + ". No se crea otro.");
    return;
  }
  console.log("No hay ejemplo publico. Creando uno, sin tocar ningun otro proyecto.");

  // 2. Crear UN solo proyecto realista
  console.log("Creando proyecto demo realista...");
  const project = await prisma.project.create({
    data: {
      name: "Sistema integral de trámites de Fresnillo",
      description: "Plataforma web para que el Ayuntamiento gestione trámites de Predial, Agua, Licencias, Actas, Multas, con portal ciudadano e integración bancaria.",
      client: "Ayuntamiento de Fresnillo",
      clientType: "municipal",
      municipalArea: "Dirección de Innovación y Atención Ciudadana",
      objective: "Sistematizar 5 trámites de mayor volumen para reducir tiempo de atención de 45 min a 5 min y permitir pagos en línea.",
      systemType: "tramites",
      responsible: "Director de Innovación",
      priority: "alta",
      status: "captura",
      notes: "Proyecto piloto que servirá de plantilla para 6 municipios más en Zacatecas. Datos personales: CURP, RFC, dirección.",
      isTemplate: true,
      expectedUsers: 25, // personas de las oficinas que van a usar el sistema (licencias por usuario final en low-code)
      workspaceId: null,
      modules: {
        create: [
          { name: "Predial", type: "transaccional", description: "Cálculo, descuentos, comprobantes y pago en línea.", complexity: 4, clarity: 3, criticality: 5, screensCount: 8, reportsCount: 3, catalogsCount: 2, integrationsCount: 1, sensitiveData: true, rolesPermissions: "Cajero, Supervisor, Auditor" },
          { name: "Agua potable", type: "transaccional", description: "Padrón, lecturas, facturación, pagos y cortes.", complexity: 4, clarity: 3, criticality: 5, screensCount: 8, reportsCount: 4, catalogsCount: 2, integrationsCount: 1, sensitiveData: true, rolesPermissions: "Operador SAPAF, Cajero, Supervisor" },
          { name: "Licencias de funcionamiento", type: "transaccional", description: "Captura, refrendo, vigencia, multas.", complexity: 3, clarity: 4, criticality: 4, screensCount: 6, reportsCount: 2, catalogsCount: 3, integrationsCount: 0, sensitiveData: true, rolesPermissions: "Inspector, Cajero, Supervisor" },
          { name: "Actas de Registro Civil", type: "transaccional", description: "Búsqueda, certificación e impresión con sello digital.", complexity: 3, clarity: 4, criticality: 4, screensCount: 5, reportsCount: 2, catalogsCount: 1, integrationsCount: 0, sensitiveData: true, rolesPermissions: "Oficial Registro Civil, Cajero" },
          { name: "Multas de tránsito", type: "transaccional", description: "Captura, consulta ciudadana, pago en línea.", complexity: 3, clarity: 3, criticality: 4, screensCount: 5, reportsCount: 2, catalogsCount: 2, integrationsCount: 0, sensitiveData: true, rolesPermissions: "Tránsito, Cajero" },
          { name: "Portal ciudadano", type: "flujo", description: "Login con CURP, consulta de adeudos, pago en línea, descarga comprobantes.", complexity: 4, clarity: 3, criticality: 5, screensCount: 12, reportsCount: 0, catalogsCount: 0, integrationsCount: 2, sensitiveData: true, rolesPermissions: "Ciudadano (autoservicio)" },
          { name: "Tablero ejecutivo", type: "reporte", description: "Indicadores de recaudación, tiempos de atención, top trámites.", complexity: 2, clarity: 4, criticality: 3, screensCount: 4, reportsCount: 8, catalogsCount: 0, integrationsCount: 0, sensitiveData: false, rolesPermissions: "Director, Tesorero, Presidencia" },
          { name: "Catálogos generales", type: "catalogo", description: "Localidades, calles, conceptos, tarifas, días inhábiles.", complexity: 2, clarity: 5, criticality: 3, screensCount: 6, reportsCount: 1, catalogsCount: 8, integrationsCount: 0, sensitiveData: false, rolesPermissions: "Administrador" },
        ],
      },
      team: {
        create: [
          { name: "Líder técnico: Ana Pérez", role: "lider_tecnico", level: "senior", monthlySalary: 55000, availabilityPercent: 100, monthsAssigned: 6, contractType: "nomina", productivityFactor: 1.0, turnoverRisk: 2, supervisionRequired: 1, aiSkill: 4 },
          { name: "Dev senior backend: Luis Ortiz", role: "dev_senior", level: "senior", monthlySalary: 42000, availabilityPercent: 100, monthsAssigned: 6, contractType: "nomina", productivityFactor: 1.0, turnoverRisk: 2, supervisionRequired: 2, aiSkill: 4 },
          { name: "Dev mid frontend: Sofía Reyes", role: "dev_senior", level: "mid", monthlySalary: 30000, availabilityPercent: 100, monthsAssigned: 6, contractType: "nomina", productivityFactor: 1.0, turnoverRisk: 3, supervisionRequired: 3, aiSkill: 3 },
          { name: "QA + soporte: Carlos Vega", role: "tester", level: "mid", monthlySalary: 26000, availabilityPercent: 80, monthsAssigned: 4, contractType: "nomina", productivityFactor: 1.0, turnoverRisk: 2, supervisionRequired: 2, aiSkill: 3 },
        ],
      },
    },
    include: { modules: true, team: true },
  });
  console.log(`  Proyecto creado: ${project.name}`);
  console.log(`  ${project.modules.length} módulos, ${project.team.length} perfiles\n`);

  // 2.bis Sembrar historias de usuario por módulo (3-4 historias por módulo crítico)
  const modulesByName = Object.fromEntries(project.modules.map((m) => [m.name, m.id]));
  const HISTORIAS = [
    { mod: "Predial", actor: "Cajero", need: "consultar el adeudo de un predio capturando la cuenta predial", benefit: "atender al ciudadano sin abrir el sistema antiguo" },
    { mod: "Predial", actor: "Ciudadano", need: "pagar mi predial en línea con tarjeta y descargar comprobante", benefit: "no tener que ir a la oficina del Ayuntamiento" },
    { mod: "Predial", actor: "Tesorero", need: "ver un reporte mensual de recaudación con descuentos aplicados", benefit: "validar metas presupuestales" },
    { mod: "Agua potable", actor: "Operador SAPAF", need: "capturar lecturas de medidores en campo desde un celular", benefit: "facturar sin papel y sin errores de transcripción" },
    { mod: "Agua potable", actor: "Cajero", need: "registrar pagos parciales y emitir convenios", benefit: "evitar cortes innecesarios" },
    { mod: "Licencias de funcionamiento", actor: "Inspector", need: "registrar verificaciones con foto y geolocalización", benefit: "tener evidencia de que se hizo la inspección" },
    { mod: "Licencias de funcionamiento", actor: "Empresario", need: "renovar mi licencia en línea sin trasladarme", benefit: "ahorrar tiempo y evitar perder la vigencia" },
    { mod: "Actas de Registro Civil", actor: "Ciudadano", need: "buscar y descargar mi acta de nacimiento certificada", benefit: "completar trámites en otras dependencias rápido" },
    { mod: "Multas de tránsito", actor: "Ciudadano", need: "consultar mis multas y pagarlas con descuento por pronto pago", benefit: "regularizar mi situación sin ir a tránsito" },
    { mod: "Portal ciudadano", actor: "Ciudadano", need: "iniciar sesión con mi CURP y ver todos mis adeudos en un solo lugar", benefit: "no perderse entre sistemas distintos" },
    { mod: "Portal ciudadano", actor: "Ciudadano", need: "recibir una notificación cuando se acerca el vencimiento de un trámite", benefit: "evitar recargos por olvidar fechas" },
    { mod: "Tablero ejecutivo", actor: "Director", need: "ver gráficas de recaudación por trámite y por mes", benefit: "tomar decisiones de presupuesto con datos" },
  ];
  for (const h of HISTORIAS) {
    const moduleId = modulesByName[h.mod];
    if (!moduleId) continue;
    await prisma.userStory.create({
      data: {
        moduleId,
        actor: h.actor,
        need: h.need,
        benefit: h.benefit,
        rules: "Validación obligatoria de campos. Sesión expira a 30 minutos. Datos personales encriptados en tránsito.",
        acceptanceCriteria: "El usuario completa el flujo en menos de 3 minutos sin asistencia técnica.",
        evidenceExpected: "Captura del flujo end-to-end con casos exitosos y de error.",
        maturityLevel: 4,
        priority: "alta",
        status: "validada",
      },
    });
  }
  console.log(`  ${HISTORIAS.length} historias de usuario sembradas\n`);

  // 3. Estimar los 5 modos
  console.log("Estimando los 5 modos × 3 escenarios...");
  const modes: DevelopmentMode[] = ["traditional", "ai_assisted", "bytecoding_prompts", "low_code", "hybrid"];
  for (const mode of modes) {
    await runEstimate({
      projectId: project.id,
      mode,
      targetMargin: 0.20,
      costMode: "detailed",
      capitalDeclaredByProvider: 250000,
      cashFlowAssumptions: {
        anticipoPct: 0.30,
        finalPaymentPct: 0.30,
        durationMonths: 6,
        monthlyToolsCost: 5000,
        monthlyAdminCost: 8000,
      },
    });
    console.log(`  ${mode}: 3 escenarios generados`);
  }

  // 4. Sembrar un cambio de alcance pendiente
  await prisma.changeRequest.create({
    data: {
      projectId: project.id,
      requesterName: "Tesorería Municipal",
      description: "Agregar módulo de presupuesto participativo no contemplado en el alcance original.",
      type: "nuevo_alcance",
      reason: "Solicitud del Cabildo aprobada en sesión del 15-04-2026.",
      timeImpactHours: 120,
      costImpact: 90000,
      decision: "pendiente",
    },
  });
  console.log("\nCambio de alcance pendiente sembrado.");

  // 5. Resumen final
  const final = await prisma.estimate.count({ where: { projectId: project.id } });
  const proj = await prisma.project.findUnique({
    where: { id: project.id },
    include: {
      _count: { select: { modules: true, team: true, estimates: true, changes: true } },
      cashflow: { orderBy: { monthNumber: "asc" } },
    },
  });
  console.log("\n=== Resumen ===");
  console.log(`  Proyecto: ${proj?.name}`);
  console.log(`  Módulos: ${proj?._count.modules}`);
  console.log(`  Equipo: ${proj?._count.team}`);
  console.log(`  Estimaciones: ${final}`);
  console.log(`  Cambios: ${proj?._count.changes}`);
  console.log(`  Líneas de flujo: ${proj?.cashflow.length}`);
  if (proj?.cashflow[0]) {
    console.log(`  Capital de trabajo requerido: $${Number(proj.cashflow[0].workingCapitalRequired).toLocaleString("es-MX")}`);
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
