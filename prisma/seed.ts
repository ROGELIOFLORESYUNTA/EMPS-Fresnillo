/**
 * EMPS Fresnillo seed script
 * Carga:
 *   - 17_seed_data_parametros_2026.json -> Parameter (38)
 *   - addendum: 5 modos catalogo + 4 factores productividad por modo (escenario probable)
 *   - addendum: 8 datasets registrados (D1-D7 + procurement)
 *   - addendum: 8 fuentes vivas (26_seed_fuentes_vivas_2026.json)
 *   - addendum: 1 caso de entrenamiento de ejemplo (27_template_captura_casos_ml.csv)
 *   - 5 usuarios demo + 1 proyecto demo con 3 modulos y 2 perfiles
 */
import { PrismaClient } from "@prisma/client";
import { Decimal } from "decimal.js";
import seedData from "../17_seed_data_parametros_2026.json";
import liveSourcesData from "../26_seed_fuentes_vivas_2026.json";
import changeImpactSeedData from "../31_seed_parametros_control_cambios_2026.json";

const prisma = new PrismaClient();

const dec = (v: number | string) => new Decimal(v);

type SeedParam = {
  key: string;
  value: number | null;
  unit: string;
  base?: string;
  source: string;
  source_url?: string;
  effective_from: string;
  effective_until?: string;
  notes?: string;
  table?: Record<string, unknown>;
};

async function seedParameters() {
  const year = seedData.year;
  const country = seedData.country;
  const state = seedData.state;

  for (const p of seedData.parameters as SeedParam[]) {
    // For table-type parameters, serialize the table to JSON string
    const valueStr =
      p.value === null && p.table
        ? JSON.stringify(p.table)
        : p.value !== null
          ? String(p.value)
          : null;

    await prisma.parameter.upsert({
      where: {
        year_country_state_key_effectiveFrom: {
          year,
          country,
          state,
          key: p.key,
          effectiveFrom: new Date(p.effective_from),
        },
      },
      update: {
        value: valueStr,
        unit: p.unit,
        base: p.base ?? null,
        source: p.source,
        sourceUrl: p.source_url ?? null,
        effectiveUntil: p.effective_until ? new Date(p.effective_until) : null,
        notes: p.notes ?? null,
      },
      create: {
        year,
        country,
        state,
        key: p.key,
        value: valueStr,
        unit: p.unit,
        base: p.base ?? null,
        source: p.source,
        sourceUrl: p.source_url ?? null,
        effectiveFrom: new Date(p.effective_from),
        effectiveUntil: p.effective_until ? new Date(p.effective_until) : null,
        notes: p.notes ?? null,
      },
    });
  }

  // Almacenar tambien development_mode_factors y development_mode_velocity como JSON parameters
  const factorsKey = "DEV_MODE_FACTORS";
  await prisma.parameter.upsert({
    where: {
      year_country_state_key_effectiveFrom: {
        year,
        country,
        state,
        key: factorsKey,
        effectiveFrom: new Date(`${year}-01-01`),
      },
    },
    update: { value: JSON.stringify(seedData.development_mode_factors) },
    create: {
      year,
      country,
      state,
      key: factorsKey,
      value: JSON.stringify(seedData.development_mode_factors),
      unit: "json",
      source: "EMPS Fresnillo internal",
      effectiveFrom: new Date(`${year}-01-01`),
      notes: "Coeficientes de distribucion por fase para cada modo. Suma esperada 1.00 excepto bytecoding (1.10).",
    },
  });

  const velocityKey = "DEV_MODE_VELOCITY";
  await prisma.parameter.upsert({
    where: {
      year_country_state_key_effectiveFrom: {
        year,
        country,
        state,
        key: velocityKey,
        effectiveFrom: new Date(`${year}-01-01`),
      },
    },
    update: { value: JSON.stringify(seedData.development_mode_velocity) },
    create: {
      year,
      country,
      state,
      key: velocityKey,
      value: JSON.stringify(seedData.development_mode_velocity),
      unit: "json",
      source: "EMPS Fresnillo internal",
      effectiveFrom: new Date(`${year}-01-01`),
      notes: "Velocidad calendario y aceleracion a prototipo por modo. Modela la decision de elegir bytecoding pese a sumar 1.10 horas-persona.",
    },
  });

  const scenariosKey = "SCENARIO_FACTORS";
  await prisma.parameter.upsert({
    where: {
      year_country_state_key_effectiveFrom: {
        year,
        country,
        state,
        key: scenariosKey,
        effectiveFrom: new Date(`${year}-01-01`),
      },
    },
    update: { value: JSON.stringify(seedData.scenario_factors) },
    create: {
      year,
      country,
      state,
      key: scenariosKey,
      value: JSON.stringify(seedData.scenario_factors),
      unit: "json",
      source: "EMPS Fresnillo internal",
      effectiveFrom: new Date(`${year}-01-01`),
      notes: "Factores optimista/probable/conservador para escenarios.",
    },
  });

  const cargaKey = "DEFAULT_CARGA_PATRONAL_ESTIMADA";
  await prisma.parameter.upsert({
    where: {
      year_country_state_key_effectiveFrom: {
        year,
        country,
        state,
        key: cargaKey,
        effectiveFrom: new Date(`${year}-01-01`),
      },
    },
    update: { value: JSON.stringify(seedData.default_carga_patronal_estimada) },
    create: {
      year,
      country,
      state,
      key: cargaKey,
      value: JSON.stringify(seedData.default_carga_patronal_estimada),
      unit: "json",
      source: "EMPS Fresnillo internal",
      effectiveFrom: new Date(`${year}-01-01`),
      notes: "Factor agregado para modo 'estimado' cuando no hay desglose.",
    },
  });
}

async function seedUsers() {
  const users = [
    { email: "admin@emps.local", name: "Administrador EMPS", role: "admin" },
    { email: "estimador@emps.local", name: "Estimador Demo", role: "estimador" },
    { email: "ayuntamiento@fresnillo.local", name: "Consulta Ayuntamiento", role: "ayuntamiento" },
    { email: "proveedor@demo.local", name: "Proveedor Demo", role: "proveedor" },
    { email: "auditor@uaz.local", name: "Auditor Academico UAZ", role: "auditor" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: u,
    });
  }
}

async function seedDemoProject() {
  const exists = await prisma.project.findFirst({ where: { name: "Demo Sistema CRUD interno" } });
  if (exists) return;

  await prisma.project.create({
    data: {
      name: "Demo Sistema CRUD interno",
      description: "Proyecto de ejemplo para probar el motor con caso simple del 12_plan_pruebas.md.",
      client: "Ayuntamiento de Fresnillo",
      clientType: "municipal",
      municipalArea: "Direccion de Innovacion",
      objective: "Sistematizar el alta y consulta de tramites internos",
      systemType: "crud_interno",
      responsible: "Estimador Demo",
      priority: "media",
      status: "borrador",
      modules: {
        create: [
          { name: "Catalogo de tramites", type: "catalogo", complexity: 2, clarity: 4, criticality: 3, screensCount: 3, reportsCount: 1 },
          { name: "Alta de solicitudes", type: "transaccional", complexity: 3, clarity: 3, criticality: 4, screensCount: 5, reportsCount: 2 },
          { name: "Reporte mensual", type: "reporte", complexity: 2, clarity: 4, criticality: 2, screensCount: 1, reportsCount: 3 },
        ],
      },
      team: {
        create: [
          { name: "Lider Tecnico", role: "lider_tecnico", level: "senior", monthlySalary: dec(45000), monthsAssigned: dec(3), contractType: "nomina" },
          { name: "Dev Mid", role: "dev_senior", level: "mid", monthlySalary: dec(28000), monthsAssigned: dec(3), contractType: "nomina" },
        ],
      },
    },
  });
}

// ============================================================
// ADDENDUM SEEDS (Fase D.4)
// ============================================================

async function seedDevModeCatalog() {
  // Fuente: 20_migracion_aditiva_postgresql_ml.sql + 22_addendum_bytecoding_comparacion.md
  const modes = [
    { code: "traditional", name: "Desarrollo tradicional", description: "Estimacion basada en analisis, programacion manual, revision, pruebas y despliegue convencional." },
    { code: "ai_assisted", name: "Desarrollo asistido por herramientas generativas", description: "Uso de herramientas generativas para completar codigo, generar pruebas, documentar o refactorizar." },
    { code: "bytecoding_prompts", name: "Bytecoding o codificacion con prompts", description: "Construccion rapida mediante instrucciones en lenguaje natural, generacion de codigo y ajuste iterativo." },
    { code: "low_code", name: "Low-code o configuracion", description: "Construccion con plataformas, plantillas, formularios y configuracion." },
    { code: "hybrid", name: "Hibrido", description: "Combinacion de desarrollo tradicional, asistencia generativa y componentes configurables." },
  ];
  for (const m of modes) {
    await prisma.devModeCatalog.upsert({
      where: { code: m.code },
      update: { name: m.name, description: m.description },
      create: m,
    });
  }
}

async function seedScenarioProductivityFactors() {
  // Mapeo de los 5 modos al modelo per-fase del addendum 22 (multiplicadores vs traditional baseline=1.0)
  // Para escenario "probable". Otros escenarios pueden agregarse despues.
  const factors = [
    { devModeCode: "traditional", scenarioName: "probable", requirementsFactor: 1.00, codingFactor: 1.00, reviewFactor: 1.00, testingFactor: 1.00, refactorFactor: 1.00, documentationFactor: 1.00, maintenanceRiskFactor: 1.00, evidenceLevel: "expert_assumption", sourceNote: "Baseline. Codificacion manual, sin herramientas generativas." },
    { devModeCode: "ai_assisted", scenarioName: "probable", requirementsFactor: 0.95, codingFactor: 0.78, reviewFactor: 1.20, testingFactor: 1.10, refactorFactor: 1.05, documentationFactor: 0.85, maintenanceRiskFactor: 1.05, evidenceLevel: "expert_assumption", sourceNote: "Reduce codificacion ~22%, sube revision ~20% por verificacion de sugerencias IA." },
    { devModeCode: "bytecoding_prompts", scenarioName: "probable", requirementsFactor: 0.95, codingFactor: 0.55, reviewFactor: 1.55, testingFactor: 1.50, refactorFactor: 1.40, documentationFactor: 0.90, maintenanceRiskFactor: 1.30, evidenceLevel: "expert_assumption", sourceNote: "Codificacion casi a la mitad pero revision/pruebas suben fuerte; mantenimiento mas riesgoso si no hay arquitectura controlada." },
    { devModeCode: "low_code", scenarioName: "probable", requirementsFactor: 1.00, codingFactor: 0.40, reviewFactor: 1.20, testingFactor: 1.30, refactorFactor: 1.20, documentationFactor: 0.80, maintenanceRiskFactor: 1.50, evidenceLevel: "expert_assumption", sourceNote: "Muy rapido para CRUD/formularios; riesgo alto por dependencia de plataforma y licencias." },
    { devModeCode: "hybrid", scenarioName: "probable", requirementsFactor: 0.97, codingFactor: 0.75, reviewFactor: 1.25, testingFactor: 1.20, refactorFactor: 1.15, documentationFactor: 0.90, maintenanceRiskFactor: 1.10, evidenceLevel: "expert_assumption", sourceNote: "Manual donde es critico, asistido/bytecoding para boilerplate. Equilibrio entre velocidad y calidad." },
  ];
  for (const f of factors) {
    const exists = await prisma.scenarioProductivityFactor.findFirst({
      where: { devModeCode: f.devModeCode, scenarioName: f.scenarioName },
    });
    if (exists) {
      await prisma.scenarioProductivityFactor.update({ where: { id: exists.id }, data: f as never });
    } else {
      await prisma.scenarioProductivityFactor.create({ data: f as never });
    }
  }
}

async function seedDatasets() {
  // Fuente: 19_addendum_base_datos_datasets_ml.md (D1-D7) + 28_insert_dataset_sources.sql
  const datasets = [
    { code: "D1_PUBLIC_JIRA", name: "The Public Jira Dataset", sourceType: "zenodo", sourceUrl: "https://zenodo.org/records/15719919", doi: "10.5281/zenodo.15719919", description: "Repositorio de issues publicos Jira con proyectos, cambios, comentarios y enlaces.", intendedUse: "Analizar cambios, ciclo de vida, trazabilidad, retrabajo y riesgo de alcance." },
    { code: "D2_JOSSE", name: "JOSSE: Software Development Effort Dataset Annotated with Expert Estimates", sourceType: "zenodo", sourceUrl: "https://zenodo.org/records/7022735", doi: "10.5281/zenodo.7022735", description: "Tareas de desarrollo y mantenimiento con esfuerzo real y estimaciones expertas.", intendedUse: "Comparar esfuerzo real contra estimacion experta y entrenar modelos de esfuerzo por tarea." },
    { code: "D3_SEERA", name: "The SEERA Software Cost Estimation Dataset", sourceType: "zenodo", sourceUrl: "https://zenodo.org/records/4066438/latest", doi: "10.5281/zenodo.4312777", description: "Dataset de estimacion de costo para entornos con restricciones tecnicas y economicas.", intendedUse: "Calibrar variables de costo y esfuerzo en contextos restringidos." },
    { code: "D4_ARTICULOS_REVISION", name: "Matriz local de articulos revisados", sourceType: "local_capture", description: "Matriz de revision de literatura con metodo, hallazgos y relacion con variables.", intendedUse: "Justificar variables y decisiones del modelo." },
    { code: "D5_CONTRATACION_PUBLICA_MX", name: "Procedimientos de contratacion publica Mexico", sourceType: "csv", sourceUrl: "https://www.datos.gob.mx/dataset/procedimientos_contratacion", license: "Creative Commons Attribution 4.0", description: "Datos de procedimientos, proveedor y monto de contrato.", intendedUse: "Contextualizar contratacion publica y rangos de montos; no estima horas de software." },
    { code: "D6_PARAMS_FISCAL_2026", name: "Parametros fiscales/laborales 2026 (Mexico, Zacatecas)", sourceType: "local_capture", description: "Tabla Parameter sembrada con 38 parametros oficiales 2026.", intendedUse: "Calculos deterministicos: ISR, IVA, UMA, salario minimo, ISN, IMSS, INFONAVIT, prestaciones LFT." },
    { code: "D7_CASOS_LOCALES_EMPS", name: "Casos locales capturados en EMPS Fresnillo", sourceType: "local_capture", description: "Estimaciones y resultados reales capturados dentro del sistema.", intendedUse: "Dataset principal para recalibrar el modelo en contexto municipal." },
  ];
  for (const d of datasets) {
    await prisma.estimationDatasetSource.upsert({
      where: { code: d.code },
      update: { name: d.name, sourceType: d.sourceType, sourceUrl: d.sourceUrl ?? null, doi: d.doi ?? null, license: d.license ?? null, description: d.description, intendedUse: d.intendedUse },
      create: { ...d, sourceUrl: d.sourceUrl ?? null, doi: d.doi ?? null, license: d.license ?? null },
    });
  }
}

interface LiveSourceParam {
  parameter_key: string;
  expected_value_numeric?: number;
  unit: string;
  valid_year?: number;
  valid_from?: string;
}
interface LiveSourceData {
  source_key: string;
  source_name: string;
  category: string;
  source_url: string;
  refresh_frequency: string;
  parser_type: string;
  requires_human_approval: boolean;
  doi?: string;
  parameters?: LiveSourceParam[];
}

async function seedLiveSources() {
  // Fuente: 26_seed_fuentes_vivas_2026.json
  const sources = (liveSourcesData.sources as LiveSourceData[]) ?? [];
  for (const s of sources) {
    await prisma.liveSourceRegistry.upsert({
      where: { sourceKey: s.source_key },
      update: {
        sourceName: s.source_name,
        category: s.category,
        sourceUrl: s.source_url,
        refreshFrequency: s.refresh_frequency,
        parserType: s.parser_type,
        requiresHumanApproval: s.requires_human_approval,
      },
      create: {
        sourceKey: s.source_key,
        sourceName: s.source_name,
        category: s.category,
        sourceUrl: s.source_url,
        refreshFrequency: s.refresh_frequency,
        parserType: s.parser_type,
        requiresHumanApproval: s.requires_human_approval,
        notes: s.doi ? `DOI: ${s.doi}` : null,
      },
    });

    // Si tiene parametros esperados, sembramos un FiscalParameterVersion en estado 'approved'
    // (porque ya fueron validados manualmente en Fase A)
    if (s.parameters) {
      for (const p of s.parameters) {
        const existing = await prisma.fiscalParameterVersion.findFirst({
          where: { parameterKey: p.parameter_key, validFrom: p.valid_from ? new Date(p.valid_from) : null },
        });
        if (!existing) {
          await prisma.fiscalParameterVersion.create({
            data: {
              parameterKey: p.parameter_key,
              parameterName: s.source_name,
              jurisdiction: s.category === "fiscal_state" ? "MX-ZAC" : "MX",
              valueNumeric: p.expected_value_numeric !== undefined ? dec(p.expected_value_numeric) : null,
              unit: p.unit,
              validFrom: p.valid_from ? new Date(p.valid_from) : (p.valid_year ? new Date(`${p.valid_year}-01-01`) : null),
              approvalStatus: "approved",
              approvedBy: "Fase A research-driven (2026-05-01)",
              approvedAt: new Date("2026-05-01"),
              notes: `Validado contra fuente oficial en Fase A. Source: ${s.source_url}`,
            },
          });
        }
      }
    }
  }
}

async function seedSampleTrainingCase() {
  // Fuente: 27_template_captura_casos_ml.csv (1 caso ejemplo)
  const exists = await prisma.trainingCase.findFirst({ where: { sourceKind: "simulated_case" } });
  if (exists) return;
  await prisma.trainingCase.create({
    data: {
      sourceKind: "simulated_case",
      projectType: "tramite_municipal",
      municipalArea: "Atencion Ciudadana",
      moduleCount: 4,
      userStoryCount: 18,
      integrationCount: 2,
      screenCount: 12,
      reportCount: 5,
      sensitiveData: true,
      requirementsClarity: dec(65),
      stakeholderAvailability: dec(50),
      changeVolatility: dec(70),
      teamExperience: dec(60),
      devModeCode: "hybrid",
      estimatedEffortHours: dec(520),
      estimatedCostMxn: dec(420000),
      maintenanceMonths: 12,
      fiscalLaborRiskScore: dec(55),
      paymentScheme: "40_40_20",
      labelQuality: "weak",
      notes: "Caso ejemplo del 27_template_captura_casos_ml.csv. Sustituir por casos reales o hipoteticos controlados.",
    },
  });
}

/**
 * Addendum v7 — Carga los parámetros del motor de cambios a la tabla Parameter.
 * Migra las 6 claves del JSON original (31_seed_parametros_control_cambios_2026.json)
 * a los nombres canónicos esperados por loadChangeImpactParameters, y agrega 4 claves
 * nuevas v7 (mínimo de cobro, tarifa default, tope free change, tasa de mantenimiento).
 */
async function seedChangeImpactParameters() {
  const year = 2026;
  const country = "Mexico";
  const state = "Zacatecas";
  const source = "EMPS Fresnillo v7 (31_seed_parametros_control_cambios_2026.json)";
  const sourceUrl = null;
  const effectiveFrom = new Date(changeImpactSeedData.effectiveFrom);

  // Mapeo de claves del JSON original → claves canónicas del motor v7
  const p = changeImpactSeedData.parameters;
  const items: Array<{ key: string; value: unknown; unit: string; notes?: string }> = [
    { key: "CHANGE_PHASE_FACTOR", value: p.CHANGE_PHASE_FACTOR, unit: "json", notes: "Factor por fase del proyecto (Boehm aplanada, Mountain Goat 2014)" },
    { key: "CHANGE_MODE_FACTOR", value: p.CHANGE_MODE_FACTOR, unit: "json", notes: "Factor por modo de desarrollo (Forrester Wave Low-Code 2025)" },
    { key: "CHANGE_HIGH_RISK_MODE_FLOOR", value: p.CHANGE_MODE_MIN_FACTOR_HIGH_RISK, unit: "rate", notes: "Piso del modeFactor cuando hay alto riesgo en seguridad/datos/integración" },
    { key: "CHANGE_CLARITY_FACTOR", value: p.CHANGE_CLARITY_FACTOR, unit: "json", notes: "Factor por nivel de claridad de la solicitud (1-5)" },
    { key: "CHANGE_CONTINGENCY_BY_TYPE", value: p.CHANGE_CONTINGENCY_RATE, unit: "json", notes: "Contingencia PMBOK 7 por tipo de cambio (10-25%)" },
    { key: "CHANGE_ARTIFACT_WEIGHTS", value: p.CHANGE_ARTIFACT_WEIGHTS, unit: "json", notes: "Peso de cada artefacto en puntos (IFPUG compatible, ratio integración/pantalla 4×)" },
    // === v7 nuevas claves no presentes en el JSON original ===
    { key: "CHANGE_MINIMUM_CHARGE_MXN", value: 2500, unit: "MXN", notes: "Costo mínimo de un change request para no regalar tiempo" },
    { key: "CHANGE_HOURLY_RATE_DEFAULT_MXN", value: 500, unit: "MXN", notes: "Tarifa por hora default cuando no se entrega una explícita" },
    { key: "CHANGE_FREE_CHANGE_LIMIT_MXN", value: 10000, unit: "MXN", notes: "Tope debajo del cual se permite 'incluido sin costo' sin guardrail" },
    { key: "CHANGE_MAINTENANCE_RATE_BY_RISK", value: { bajo: 0.005, medio: 0.01, alto: 0.015, critico: 0.02 }, unit: "json", notes: "% del subtotal que se suma al mantenimiento mensual según riesgo del cambio" },
  ];

  for (const it of items) {
    const valueStr = typeof it.value === "object" ? JSON.stringify(it.value) : String(it.value);
    await prisma.parameter.upsert({
      where: {
        year_country_state_key_effectiveFrom: {
          year,
          country,
          state,
          key: it.key,
          effectiveFrom,
        },
      },
      create: {
        year,
        country,
        state,
        key: it.key,
        value: valueStr,
        unit: it.unit,
        source,
        sourceUrl,
        effectiveFrom,
        notes: it.notes ?? null,
      },
      update: {
        value: valueStr,
        unit: it.unit,
        source,
        notes: it.notes ?? null,
      },
    });
  }
}

async function main() {
  console.log("Sembrando parametros 2026...");
  await seedParameters();
  console.log("Sembrando parametros del motor de cambios v7 (10)...");
  await seedChangeImpactParameters();
  console.log("Sembrando usuarios demo...");
  await seedUsers();
  console.log("Sembrando proyecto demo...");
  await seedDemoProject();
  console.log("Sembrando catalogo de modos de desarrollo (5)...");
  await seedDevModeCatalog();
  console.log("Sembrando factores de productividad por modo (escenario probable)...");
  await seedScenarioProductivityFactors();
  console.log("Sembrando datasets registrados (D1-D7)...");
  await seedDatasets();
  console.log("Sembrando fuentes vivas (8) + parametros validados...");
  await seedLiveSources();
  console.log("Sembrando caso de entrenamiento de ejemplo...");
  await seedSampleTrainingCase();

  const counts = {
    parametros: await prisma.parameter.count(),
    modos: await prisma.devModeCatalog.count(),
    factoresProd: await prisma.scenarioProductivityFactor.count(),
    datasets: await prisma.estimationDatasetSource.count(),
    fuentesVivas: await prisma.liveSourceRegistry.count(),
    fiscalVersiones: await prisma.fiscalParameterVersion.count(),
    casosEntrenamiento: await prisma.trainingCase.count(),
    usuarios: await prisma.user.count(),
    proyectos: await prisma.project.count(),
  };
  console.log("\n=== Seed completo ===");
  console.table(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
