/**
 * Genera el documento Word "EMPS_Fresnillo_Estado_Actual.docx" para entregarlo a ChatGPT Pro.
 * Refleja el estado real del sistema (lo construido, no la spec original).
 *
 * Estructura:
 *   1. Portada
 *   2. Resumen ejecutivo
 *   3. Stack técnico real
 *   4. Motor de cálculo (fórmulas + parámetros 2026)
 *   5. Estructura del repositorio
 *   6. Modelo de datos (25 tablas Prisma)
 *   7. API REST (44 endpoints)
 *   8. Pantallas implementadas con capturas
 *      8.1 Vista del operador
 *      8.2 Vista del investigador
 *      8.3 Reportes
 *   9. Demo cargado y resultados
 *  10. Pendientes
 *  11. Cómo retomar el trabajo en ChatGPT Pro
 *
 * Run:  npx tsx scripts/build-entregable-docx.ts
 */
import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
} from "docx";

const SHOTS = path.resolve(__dirname, "..", "entregable-chatgpt", "screenshots");
const OUT = path.resolve(__dirname, "..", "entregable-chatgpt", "EMPS_Fresnillo_Estado_Actual.docx");

function H1(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 } });
}
function H2(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 140 } });
}
function H3(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } });
}
function P(text: string, opts: { bold?: boolean; italics?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })],
    spacing: { after: 120 },
  });
}
function bullet(text: string): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}
function code(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: "Consolas", size: 18 })],
    spacing: { after: 120 },
    shading: { type: "clear", color: "auto", fill: "F2F2F2" },
  });
}
function img(filename: string, widthCm = 16, caption?: string): Paragraph[] {
  const file = path.join(SHOTS, filename);
  if (!fs.existsSync(file)) {
    return [P(`[Imagen faltante: ${filename}]`, { italics: true })];
  }
  const data = fs.readFileSync(file);
  const pixelsPerCm = 37.795;
  const widthPx = Math.round(widthCm * pixelsPerCm);
  // Mantener aspect ratio: estos screenshots son 1440 ancho originales
  const heightPx = Math.round(widthPx * (900 / 1440));
  const out: Paragraph[] = [
    new Paragraph({
      children: [new ImageRun({ data, transformation: { width: widthPx, height: heightPx } })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
    }),
  ];
  if (caption) {
    out.push(
      new Paragraph({
        children: [new TextRun({ text: caption, italics: true, size: 18 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    );
  }
  return out;
}
function table(rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
    },
    rows: rows.map((row, i) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: cell, bold: i === 0, size: 18 })],
              }),
            ],
          }),
        ),
      }),
    ),
  });
}
function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

const sections = [
  // === PORTADA ===
  new Paragraph({
    children: [new TextRun({ text: "EMPS Fresnillo", bold: true, size: 48 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 240 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Estimador Municipal de Proyectos de Software", size: 28 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Estado actual del sistema", italics: true, size: 24 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Documento generado para retomar el trabajo en ChatGPT Pro", size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Snapshot: 2026-05-29", size: 18 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Autor: Rogelio Flores Rodríguez", size: 18 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Universidad Autónoma de Zacatecas, Ingeniería en Software", size: 18 })],
    alignment: AlignmentType.CENTER,
  }),

  pageBreak(),

  // === SECCIÓN 1: RESUMEN EJECUTIVO ===
  H1("1. Resumen ejecutivo"),
  P("EMPS Fresnillo es un estimador de proyectos de software desarrollado a la medida del Ayuntamiento de Fresnillo, Zacatecas. Integra cuatro dimensiones que la literatura suele tratar por separado: esfuerzo técnico, modo de desarrollo, control de cambios y viabilidad fiscal-laboral mexicana."),
  P("La regla rectora del sistema es: «el sistema no debe calcular solamente horas; debe responder si el proyecto es viable técnica y financieramente». Esto se traduce en que cada estimación entrega cifras de precio, capital de trabajo requerido (bache de caja), riesgo de cotización, comparación entre cinco modos de desarrollo y reportes redactados para tres audiencias distintas."),
  P("Este documento captura el estado real del sistema implementado al 29 de mayo de 2026, no la especificación original. Se entrega con capturas de pantalla, fragmentos de código clave y el modelo de datos completo, para que cualquier IA o colaborador externo pueda continuar el trabajo sobre lo construido."),

  H2("Cifras de salud del repositorio"),
  table([
    ["Indicador", "Valor"],
    ["Líneas de código TypeScript (lib/ + app/)", "~12,500"],
    ["Modelos Prisma", "25"],
    ["Endpoints REST", "44"],
    ["Pantallas UI", "26"],
    ["Tests unitarios (motor)", "39/39 verde"],
    ["Tests E2E (Playwright)", "16+ verde"],
    ["Parámetros fiscales 2026 sembrados", "38, validados contra DOF/INEGI/CONASAMI/SEFIN"],
    ["Commits en la rama main", "12+"],
  ]),

  pageBreak(),

  // === SECCIÓN 2: STACK TÉCNICO REAL ===
  H1("2. Stack técnico real"),
  P("Durante la implementación se descartaron varias decisiones tentativas de la especificación original (Express/FastAPI, modelos de ML activos desde el día uno, autenticación al inicio) por necesidad práctica. El stack actual es:"),
  table([
    ["Capa", "Decisión final"],
    ["Frontend + Backend", "Next.js 15 App Router (monorrepo)"],
    ["Lenguaje", "TypeScript 5.7 con strict mode"],
    ["ORM", "Prisma 6.1"],
    ["Base de datos (prototipo)", "SQLite"],
    ["Base de datos (producción)", "PostgreSQL vía DATABASE_URL (schema portable)"],
    ["UI", "Tailwind 3.4 + componentes shadcn-style + Radix Primitives + Lucide icons"],
    ["Validación", "Zod 3.24"],
    ["Tests unitarios", "Vitest 2.1"],
    ["Tests E2E", "Playwright 1.59"],
    ["Aritmética decimal", "decimal.js + Prisma.Decimal (precisión 18,4 para montos, 18,6 para tasas)"],
    ["Reportes", "HTML imprimible con CSS @media print (no PDF nativo)"],
    ["Autenticación", "No implementada todavía (queda en el schema)"],
  ]),
  P("La razón principal para elegir Next.js App Router en lugar de Express o FastAPI es que un solo desarrollador mantiene tanto el frontend como el backend; compartir tipos TypeScript de extremo a extremo y permitir que los Server Components consulten Prisma sin pasar por REST reduce significativamente el código de pegamento."),

  pageBreak(),

  // === SECCIÓN 3: MOTOR DE CÁLCULO ===
  H1("3. Motor de cálculo"),
  P("El motor vive en lib/engine y es 100% determinístico (sin ML activo). Implementa las fórmulas descritas en 07_motor_formulas.md, con calibraciones documentadas para reflejar la práctica real 2026."),

  H2("3.1 Esfuerzo técnico"),
  code("clarityFactor:  1→1.80 · 2→1.50 · 3→1.25 · 4→1.10 · 5→1.00"),
  code("riskFactor    = 1 + changeProbability + clientUnavailability + turnoverRisk   (cap 2.0)"),
  code("technicalEffort = basePoints × clarityFactor × riskFactor"),
  P("basePoints suma por módulo: complejidad × 50 + pantallas × 16 + reportes × 24 + catálogos × 12 + integraciones × 50 + (datos sensibles ? 36 : 0) + (criticidad - 1) × 12. Mínimo 40h por módulo para evitar absurdos. Sobre el total se agrega 80h por cada integración externa, 120h si hay migración de datos y 96h de overhead si algún módulo maneja datos sensibles."),

  H2("3.2 Cinco modos de desarrollo, calibrados con evidencia 2026"),
  table([
    ["Modo", "velocity_factor", "prototype_speedup", "effort_efficiency"],
    ["traditional", "1.00", "1.00", "1.00"],
    ["ai_assisted", "1.55", "2.50", "0.78"],
    ["hybrid", "1.90", "3.50", "0.72"],
    ["bytecoding_prompts", "3.00", "7.00", "0.65"],
    ["low_code", "3.50", "8.00", "0.50"],
  ]),
  P("Fuentes de calibración: McKinsey (productividad +46% con IA), GitHub Copilot study (+55% velocity), Anthropic Claude internal study (+70-90% en algunos workflows), Bain (resultados unremarkable en otros). El effort_efficiency multiplica horas-persona equivalentes para reflejar que los modos automatizados reducen el trabajo realmente realizado, no solo el calendario.", { italics: false }),

  H2("3.3 Costo basado en calendario, no en horas"),
  code("monthlyTeamCost  = Σ computeProfileCostDetailed(perfil, ratesIMSS_2026)\nrealMonthsOfMode = weeksTotal / 4.33\nbaseCost         = monthlyTeamCost × realMonthsOfMode × actualSum\ntotalCost        = baseCost + lftRisk.estimatedTerminationCost\nsubtotal         = totalCost / (1 − targetMargin)\ntotal_invoice    = subtotal × (1 + IVA_GENERAL)"),
  P("computeProfileCostDetailed desglosa por ramo IMSS: enfermedad y maternidad (especie fija + especie excedente + dinero + pensionados), riesgo de trabajo según clase, invalidez y vida, guarderías, retiro, cesantía y vejez escalonada por SBC en UMAs (8 tramos), INFONAVIT 5%, ISN Zacatecas 3.5% con sobretasa UAZ 10% (carga efectiva 3.85%), y provisiones LFT por aguinaldo y prima vacacional."),

  H2("3.4 Riesgo LFT por contratos largos"),
  P("Si realMonthsOfMode supera 6 meses y hay personal con contractType='nomina', aplica la indemnización LFT por terminación: 90 días + 20 días por año + prima de antigüedad 12 días por año, calculada sobre el SBC. Esto NO aplica a asimilados, honorarios, RESICO PF ni freelance. La indemnización se suma al totalCost para que el proveedor vea el costo real de elegir personal en nómina por más de 6 meses."),

  H2("3.5 Flujo de efectivo y bache de caja"),
  code("accumulated[n]         = accumulated[n-1] + (income[n] − Σ outflows[n])\nworkingCapitalRequired = |min(accumulated[1..N], 0)|"),
  P("El bache de caja se renombró en la UI desde el término técnico «capital de trabajo» a un lenguaje empresarial (Konfío, BBVA México) para que el operador no contable lo entienda. Se conecta visualmente con la tabla del flujo: la fila correspondiente al peor saldo se resalta en naranja con la etiqueta «← BACHE DE CAJA»."),

  H2("3.6 Motor de control de cambios (Addendum v6, integrado mayo 2026)"),
  code("artifactPoints = Σ (artifactCount × artifactWeight)\nbaseHours      = artifactPoints × clarityFactor × phaseFactor × riskFactor × modeFactor\ncontingency    = baseHours × contingencyRate\nestimatedHours = baseHours + contingency"),
  P("11 artefactos con pesos (pantallas 6, endpoints 8, reglas 10, tablas 14, reportes 10, roles 12, integraciones externas 24, migración 18, tests automáticos 4, tests manuales 3, docs 2). 7 fases del proyecto con factor 0.7→3.0 (curva de costo del cambio aplanada para CI-CD agile moderno). 5 modos con piso 0.90 cuando hay alto riesgo en seguridad/datos/integración. Contingencia 10-25% según tipo (corregida desde 5-20% del addendum original para alinearse con PMBOK 7 real). Penalización aditiva +0.15 al riskFactor cuando low_code o bytecoding entran a alto riesgo (Forrester Wave 2025 documenta que cambios complejos en low-code pueden costar más, no menos, que tradicional)."),

  pageBreak(),

  // === SECCIÓN 4: PARÁMETROS 2026 ===
  H1("4. Parámetros fiscales 2026 (validados)"),
  P("Todos los valores se cargan desde 17_seed_data_parametros_2026.json a la tabla Parameter. Cada parámetro lleva su fuente oficial y URL en source/source_url, y la fecha desde la que está vigente."),
  table([
    ["Clave", "Valor", "Fuente"],
    ["IVA_GENERAL", "0.16", "LIVA Art. 1 (DOF 07-nov-2025)"],
    ["ISR_PERSONA_MORAL", "0.30", "LISR Art. 9"],
    ["UMA_DIARIA", "117.31 MXN", "INEGI Comunicado 1/26 (DOF 09-ene-2026, vigente 01-feb-2026)"],
    ["UMA_MENSUAL", "3,566.22 MXN", "mismo"],
    ["UMA_ANUAL", "42,794.64 MXN", "mismo"],
    ["SALARIO_MINIMO_GENERAL_DIARIO", "315.04 MXN", "CONASAMI (DOF 09-dic-2025)"],
    ["SALARIO_MINIMO_ZLFN_DIARIO", "440.87 MXN", "CONASAMI"],
    ["ISN_ZACATECAS", "0.035", "Ley de Hacienda del Estado de Zacatecas 2026 (SEFIN)"],
    ["UAZ_SOBRETASA", "0.10", "Ley de Hacienda Zacatecas"],
    ["EYM, IV, RT, RETIRO, CEAV, GUARDERIAS", "tasas IMSS por ramo", "LSS Art. 25-106"],
    ["INFONAVIT", "0.05", "LINFONAVIT Art. 29"],
    ["LFT prestaciones", "aguinaldo 15 días, vacaciones 12, prima 25%", "LFT (reforma 2023)"],
    ["LFT_INDEMNIZACION_BASE_DIAS", "90", "LFT Art. 50"],
    ["LFT_INDEMNIZACION_DIAS_POR_ANIO", "20", "LFT Art. 50"],
    ["LFT_PRIMA_ANTIGUEDAD_DIAS_POR_ANIO", "12", "LFT Art. 162"],
  ]),

  pageBreak(),

  // === SECCIÓN 5: ESTRUCTURA DEL REPO ===
  H1("5. Estructura del repositorio"),
  code(`EstimacionTemprana/
├── prisma/
│   ├── schema.prisma            ← 25 modelos
│   ├── seed.ts                  ← carga parámetros fiscales
│   └── reset-demo-realista.ts   ← genera proyecto demo
├── lib/
│   ├── db.ts                    ← PrismaClient singleton
│   ├── parameters.ts            ← carga parámetros + snapshot
│   ├── estimate-service.ts      ← orquestador motor → persistencia → auditoría
│   ├── validators.ts            ← esquemas Zod
│   ├── utils.ts                 ← formatMXN, DEVELOPMENT_MODES, RISK_LEVELS
│   └── engine/                  ← motor de dominio puro
│       ├── effort.ts            ← basePoints, claridad, riesgo, distribución
│       ├── cost.ts              ← costo por perfil (IMSS desglosado, CEAV escalonada)
│       ├── cashflow.ts          ← flujo mensual + bache de caja
│       ├── lft-risk.ts          ← riesgo LFT por contrato >6 meses
│       ├── risk.ts              ← riesgo agregado (5 dimensiones)
│       ├── change-types.ts      ← tipos del motor v6
│       ├── change-impact.ts     ← motor de cambios v6
│       ├── change-questions.ts  ← preguntas de aclaración
│       └── metrics.ts           ← backtesting (preparado, no activo)
├── app/
│   ├── page.tsx                 ← landing del operador
│   ├── layout.tsx               ← header + footer
│   ├── projects/                ← CRUD proyectos + estimación + reportes
│   ├── admin/                   ← solo /parametros y /calibracion (operativos)
│   ├── investigacion/           ← dashboard + 10 sub-pantallas (oculto al operador)
│   ├── como-funciona/           ← tutorial guiado
│   ├── glossary/                ← 34 términos definidos
│   └── api/                     ← 44 endpoints REST
├── components/
│   ├── ui/                      ← 8 primitivos
│   ├── breadcrumbs.tsx
│   ├── info-tip.tsx             ← popover ⓘ con fuente
│   └── mode-scenario-selector.tsx
├── tests/engine.test.ts         ← 30 tests motor base
├── tests/change-impact.test.ts  ← 9 tests motor v6
├── e2e/                         ← Playwright (16+ tests)
├── 00..34_*.md                  ← documentación de investigación
├── 17_seed_data_parametros_2026.json
├── 31_seed_parametros_control_cambios_2026.json
├── MANUAL.md                    ← manual operativo
├── HANDOFF_CHATGPT.md           ← handoff técnico original
└── SESSION_STATE.md             ← estado de la última sesión`),

  pageBreak(),

  // === SECCIÓN 6: MODELO DE DATOS ===
  H1("6. Modelo de datos (25 tablas Prisma)"),
  H2("Núcleo del estimador"),
  bullet("User — 5 roles: admin, estimador, ayuntamiento, proveedor, auditor."),
  bullet("Project — proyecto del Ayuntamiento, con responsable, presupuesto estimado, fecha objetivo."),
  bullet("Module — descomposición funcional con complejidad, claridad, criticidad (1-5)."),
  bullet("UserStory — historias por módulo, con criterio de aceptación, evidencia esperada."),
  bullet("TeamProfile — perfiles del equipo con sueldo, contractType (clave para LFT), turnoverRisk."),
  bullet("Parameter — parámetros fiscales versionados por año + key + effectiveFrom."),
  bullet("Estimate — estimación versionada (criterio: nunca sobreescribir), con parametersSnapshot y inputsSnapshot en JSON."),
  bullet("ChangeRequest — solicitudes de cambio con tipo y decisión."),
  bullet("CashFlowLine — flujo mensual con ingresos, 4 egresos, neto, acumulado, capital requerido."),
  bullet("AuditLog — bitácora con before/after en JSON para auditoría académica."),

  H2("Addendum FASE D: datasets, ML, fuentes vivas, validación"),
  bullet("DevModeCatalog — catálogo de los 5 modos."),
  bullet("ScenarioProductivityFactor — factores per-fase × modo × escenario con evidenceLevel."),
  bullet("EstimationDatasetSource — D1-D7 (Jira público, JOSSE, SEERA, Zenodo). Solo metadata académica."),
  bullet("DatasetImportBatch + ExternalTaskRecord — pipeline de ingesta (infraestructura, vacío hoy)."),
  bullet("TrainingCase — casos locales etiquetados (vacío hoy, alimenta ML futuro)."),
  bullet("MLModelRegistry + MLModelMetric + MLPrediction — registros para modelos entrenados (vacío)."),
  bullet("LiveSourceRegistry + LiveSourceSnapshot — monitoreo de DOF/INEGI/CONASAMI."),
  bullet("FiscalParameterVersion + ParameterChangeReview — versionado con aprobación humana."),
  bullet("ProjectActualResult + EstimationFeedback — captura de resultados reales para validar la hipótesis."),

  H2("Addendum v6: control de cambios inteligente"),
  bullet("ChangeImpactAssessment — evaluación de impacto vinculada a ChangeRequest. 25 columnas: artifactPoints, factores, contingencyRate, optimisticHours, probableHours, conservativeHours, riskLevel, requiresFormalApproval, explanationJson, questionsToClarifyJson, parametersSnapshot."),

  pageBreak(),

  // === SECCIÓN 7: PANTALLAS DEL OPERADOR ===
  H1("7. Pantallas implementadas"),
  P("El sistema separa dos perspectivas en la misma aplicación: el operador (Ayuntamiento o proveedor) que va a estimar proyectos reales, y el investigador (autor de la tesis) que recopila evidencia. El operador no ve nada de la zona de investigación; el investigador llega por un enlace discreto al pie del footer (sin login todavía)."),

  H2("7.1 Vista del operador"),

  H3("Landing (Inicio)"),
  P("La pantalla de entrada muestra tres acciones principales (crear proyecto, mis proyectos, editar parámetros), alertas de cambios pendientes y una lista de proyectos recientes. La sección de tutorial y glosario está abajo, sin distracciones de la zona académica."),
  ...img("01_homepage_operador.png", 16, "Figura 1. Página de inicio para el operador."),

  H3("Lista de proyectos"),
  P("Listado con buscador y badges de estado. Cada tarjeta muestra cliente, módulos, estimaciones y precio (modo híbrido probable, que es la línea base realista)."),
  ...img("02_lista_proyectos.png", 16, "Figura 2. Mis proyectos."),

  H3("Detalle del proyecto"),
  P("Esta es la pantalla central del operador. Muestra el banner de perspectiva azul que aclara que se está viendo desde el lado del proveedor, el checklist de progreso de 5 pasos, el selector de modo y escenario, las 4 tarjetas resumen con tooltips ⓘ explicativos, la tarjeta de riesgo de cotización (en naranja cuando el rango entre modos supera 1.5×), el comparador de los 5 modos × 3 escenarios y el flujo de efectivo mes a mes con el bache resaltado."),
  ...img("03_proyecto_detalle_hibrido_probable.png", 16, "Figura 3. Proyecto en modo híbrido probable (línea base)."),
  P("El operador puede cambiar el modo y escenario desde el selector. El precio cotizado y los rótulos se ajustan en vivo, sin recalcular (los 15 escenarios ya están precomputados):"),
  ...img("04_proyecto_detalle_tradicional_conservador.png", 16, "Figura 4. Mismo proyecto en modo tradicional conservador."),
  ...img("05_proyecto_detalle_bytecoding_optimista.png", 16, "Figura 5. Mismo proyecto en bytecoding optimista."),

  H3("Módulos del proyecto"),
  P("CRUD inline de módulos. Cada módulo captura tipo (catálogo / transaccional / reporte / integración / flujo), complejidad, claridad, criticidad, conteos de pantallas, reportes, catálogos, integraciones, datos sensibles, roles, notas. Editable sin salir de la pantalla."),
  ...img("06_modulos.png", 16, "Figura 6. Captura de módulos."),

  H3("Equipo del proyecto"),
  P("Perfiles del equipo con sueldo mensual, tipo de contrato (nómina, asimilados, honorarios, RESICO PF, freelance), disponibilidad, meses asignados, riesgo de rotación. El campo tipo de contrato es crítico para el cálculo del riesgo LFT."),
  ...img("07_equipo.png", 16, "Figura 7. Captura del equipo."),

  H3("Control de cambios"),
  P("Registro de solicitudes de cambio en lenguaje del cliente. La cotización inteligente (motor v6) calcula horas, costo y días de impacto considerando fase del proyecto (1.0/1.5/2.5×), modo de desarrollo y contingencia 10-15%. El operador puede usar el costo sugerido o ajustarlo manualmente."),
  ...img("08_cambios.png", 16, "Figura 8. Cambios solicitados con cotización inteligente."),

  H3("Estimar el proyecto"),
  P("Pantalla que ejecuta el motor sobre los datos capturados. Devuelve 5 modos × 3 escenarios (15 estimaciones) en una sola corrida y las persiste como nueva versión, sin sobreescribir las anteriores."),
  ...img("09_estimar.png", 16, "Figura 9. Ejecutar estimación."),

  pageBreak(),

  H2("7.2 Reportes"),
  P("El hub de reportes ofrece dos versiones para el operador: una para el Ayuntamiento (cliente) y otra para el proveedor. La versión académica existe pero solo se accede desde la zona de investigación, no aparece aquí."),
  ...img("10_reportes_hub.png", 16, "Figura 10. Hub de reportes."),

  H3("Reporte para el Ayuntamiento"),
  P("Resumen ejecutivo de la cotización del proveedor: precio total, plazo, riesgos, qué NO está incluido, alertas de cotización baja, checklist de aceptación. Imprimible (Ctrl+P) sin elementos de navegación."),
  ...img("11_reporte_municipal.png", 16, "Figura 11. Reporte para Ayuntamiento."),

  H3("Reporte para el proveedor"),
  P("Detalle financiero interno del proveedor: costo real del equipo desglosado por ramo IMSS, ISN+UAZ, INFONAVIT, prestaciones LFT, indemnización si aplica, capital de trabajo requerido, margen y precio mínimo sostenible."),
  ...img("12_reporte_proveedor.png", 16, "Figura 12. Reporte para proveedor."),

  pageBreak(),

  H2("7.3 Configuración avanzada (operador)"),
  P("Bajo /admin/* quedan solo las dos pantallas que afectan cálculos y que el operador podría necesitar modificar:"),

  H3("Editor de parámetros fiscales"),
  P("Los 38 parámetros 2026 organizados por categoría (IMSS, UMA, salarios, LFT, federal, modos, Zacatecas). Cada parámetro lleva su fuente, fecha de vigencia y URL oficial. Al modificar un valor se crea una nueva versión; las estimaciones anteriores conservan su snapshot original (auditabilidad inviolable)."),
  ...img("13_admin_parametros.png", 16, "Figura 13. Editor de parámetros 2026."),

  H3("Calibración del motor"),
  P("Para ajustar los multiplicadores de cada modo de desarrollo: velocity_factor, prototype_speedup, hardening_overhead. Útil si la organización mide que en su contexto particular el bytecoding rinde diferente."),
  ...img("14_admin_calibracion.png", 16, "Figura 14. Calibración del motor."),

  H3("Ayuda al operador"),
  P("Tutorial guiado de 6 pasos y glosario con 34 términos del sistema. El glosario incluye conceptos fiscales (IVA, ISR, IMSS, UMA, SBC, CEAV, ZLFN, RESICO), laborales (LFT, aguinaldo, PTU, vacaciones reforma 2023), financieros (margen, bache de caja, capital de trabajo), modos de desarrollo y privacidad (LGPDPPSO, LFPDPPP, derechos ARCO, datos sensibles)."),
  ...img("15_como_funciona.png", 16, "Figura 15. Tutorial."),
  ...img("16_glossario.png", 16, "Figura 16. Glosario."),

  pageBreak(),

  // === SECCIÓN 8: VISTA DEL INVESTIGADOR ===
  H1("8. Vista del investigador (oculta al operador)"),
  P("El investigador llega a /investigacion mediante un enlace discreto al pie del footer. Esta zona reúne toda la evidencia que alimenta el artículo académico. No es necesaria para operar el estimador."),

  H2("8.1 Dashboard de investigación"),
  P("10 tarjetas que cubren las distintas piezas de evidencia: datasets, modelos ML, fuentes vivas, comparador técnico, bitácora, casos de entrenamiento, resultados reales, feedback, reportes académicos y usuarios. Cada tarjeta abre con una descripción breve en lenguaje claro y un badge con el conteo actual. Las pantallas vacías muestran «Vacío hoy» como recordatorio."),
  ...img("17_investigacion_dashboard.png", 16, "Figura 17. Zona de investigación."),

  H2("8.2 Comparador técnico"),
  P("Visualiza los coeficientes y velocidades de los 5 modos tal como los usa el motor. Útil para defender en la tesis por qué bytecoding suma 1.10 horas-persona pero entrega prototipo 3.5× más rápido."),
  ...img("18_investigacion_comparador_tecnico.png", 16, "Figura 18. Comparador técnico."),

  H2("8.3 Datasets"),
  P("Catálogo de bancos de datos públicos (Public Jira, JOSSE, SEERA, Zenodo) registrados como evidencia para la tesis. Hoy solo se registran metadatos; las tareas reales no se importan al sistema."),
  ...img("19_investigacion_datasets.png", 16, "Figura 19. Datasets."),

  H2("8.4 Modelos ML"),
  P("Registro de modelos entrenados con su métricas y estado de aprobación. Hoy NO hay modelos activos; el motor es 100% determinístico. Esta pantalla es infraestructura para Fase C2 (entrenamiento futuro)."),
  ...img("20_investigacion_modelos_ml.png", 16, "Figura 20. Modelos ML."),

  H2("8.5 Fuentes vivas"),
  P("Monitoreo de portales oficiales (SAT, DOF, INEGI, CONASAMI, SEFIN) para detectar cambios en parámetros fiscales/laborales. Workflow: check → snapshot → si hay cambio se genera ParameterChangeReview pendiente de aprobación humana."),
  ...img("21_investigacion_fuentes_vivas.png", 16, "Figura 21. Fuentes vivas."),

  H2("8.6 Bitácora"),
  P("Historial completo de cambios del sistema. Cada acción (create, update, delete, recalculate, decision, compute) queda registrada con fecha, usuario, entidad afectada, snapshot before/after y contexto. Sirve como evidencia académica de reproducibilidad."),
  ...img("22_investigacion_bitacora.png", 16, "Figura 22. Bitácora."),

  H2("8.7 Casos de entrenamiento, resultados reales y feedback"),
  P("Tres pantallas que hoy están VACÍAS pero son la base de la Fase C2 (validar la hipótesis con datos reales). Cada una abre con un texto explicativo que dice qué se captura y para qué sirve."),
  ...img("23_investigacion_casos_entrenamiento.png", 16, "Figura 23. Casos de entrenamiento (vacío hoy)."),
  ...img("24_investigacion_resultados_reales.png", 16, "Figura 24. Resultados reales (vacío hoy)."),
  ...img("25_investigacion_feedback_estimaciones.png", 16, "Figura 25. Feedback de estimaciones (vacío hoy)."),

  H2("8.8 Reportes académicos"),
  P("Selector de proyectos que abre la versión académica del reporte. Incluye las variables capturadas, los 5 modos × 3 escenarios comparados y la evidencia para validar/ajustar la hipótesis del artículo."),
  ...img("26_investigacion_reportes_academicos.png", 16, "Figura 26. Selector de reportes académicos."),
  ...img("27_reporte_academico.png", 16, "Figura 27. Reporte académico de un proyecto."),

  H2("8.9 Usuarios y roles"),
  P("Administración de los 5 roles del sistema. NextAuth no está implementado todavía; cuando se implemente, esta pantalla controlará accesos a cada rol."),
  ...img("28_investigacion_usuarios_roles.png", 16, "Figura 28. Usuarios y roles."),

  pageBreak(),

  // === SECCIÓN 9: DEMO ===
  H1("9. Demo cargado actualmente"),
  P("El script prisma/reset-demo-realista.ts crea un único proyecto realista llamado «Sistema integral de trámites de Fresnillo», para el Ayuntamiento (Dirección de Innovación y Atención Ciudadana). Tiene 8 módulos (predial, agua potable, licencias de funcionamiento, actas, multas, portal ciudadano, integración bancaria, reportes ejecutivos), 12 historias de usuario detalladas, 4 perfiles de equipo en nómina y 1 cambio pendiente."),
  H2("Resultados precomputados para los 5 modos × 3 escenarios"),
  table([
    ["Modo", "Optimista", "Probable", "Conservador"],
    ["traditional", "$3,393,587", "$3,991,279", "$5,335,228"],
    ["ai_assisted", "$1,800,234", "$2,117,920", "$2,830,341"],
    ["hybrid", "$931,766", "$1,096,196", "$1,464,902"],
    ["bytecoding_prompts", "$671,421", "$789,907", "$1,055,580"],
    ["low_code", "$349,496", "$411,172", "$549,517"],
  ]),
  P("Rango entre el modo más caro y el más barato: aproximadamente 13×. El sistema marca esto con la alerta naranja «Riesgo de cotización» en el detalle del proyecto. Cotizar al cliente como low-code y ejecutar como tradicional llevaría al proveedor a quiebra."),

  pageBreak(),

  // === SECCIÓN 10: PENDIENTES ===
  H1("10. Pendientes técnicos"),
  H2("Próxima iteración"),
  bullet("UI wizard de captura del cambio v6 en 5 pasos (29_addendum). El motor y los endpoints ya reciben el payload completo; faltan las pantallas que lo capturen."),
  bullet("Cargar 31_seed_parametros_control_cambios_2026.json a la tabla Parameter y hacer que change-impact.ts los lea desde DB en lugar de hardcoded."),

  H2("Mediano plazo"),
  bullet("Cashflow per-mode (hoy se guarda una sola vez por proyecto, debería regenerarse al recalcular en otro modo)."),
  bullet("Sección «Cambios» en los 3 reportes (municipal, proveedor, académico) con tabla de cambios, decisión, costo, días, riesgo y responsable."),
  bullet("Tests E2E del flujo completo de cambios v6."),

  H2("Largo plazo / siguientes tesis"),
  bullet("Entrenar y aprobar un modelo ML usando TrainingCase y ProjectActualResult."),
  bullet("NextAuth con los 5 roles del schema (admin, estimador, ayuntamiento, proveedor, auditor)."),
  bullet("Auto-actualización real de LiveSourceRegistry (hoy todo es manual)."),

  pageBreak(),

  // === SECCIÓN 11: CÓMO RETOMAR ===
  H1("11. Cómo retomar el trabajo en ChatGPT Pro"),
  P("Junto con este documento se entrega una carpeta con:"),
  bullet("Este documento Word con todas las capturas y descripciones."),
  bullet("La carpeta entregable-chatgpt/codigo-clave/ con los archivos más importantes del software: schema Prisma completo, todos los archivos del motor (lib/engine/), los servicios (lib/estimate-service.ts, lib/parameters.ts), los validadores Zod y los seeds JSON con parámetros 2026."),
  bullet("La carpeta entregable-chatgpt/docs/ con la documentación de investigación: HANDOFF_CHATGPT.md (snapshot técnico de 521 líneas con prompt incluido), MANUAL.md (manual operativo), SESSION_STATE.md (estado de la última sesión) y los addendums numerados 26-34 del control de cambios."),
  bullet("La carpeta entregable-chatgpt/screenshots/ con las 28 capturas de pantalla originales en alta resolución."),

  H2("Reglas para ChatGPT Pro"),
  bullet("Cuando exista una contradicción entre los archivos .md de la spec original (00..25) y el código real, GANA SIEMPRE EL CÓDIGO. La spec se actualizará para coincidir."),
  bullet("Si propones modificar parámetros fiscales o fórmulas, primero contrasta con fuentes oficiales recientes (DOF, INEGI, CONASAMI, SAT, IMSS, SEFIN). Cita la URL."),
  bullet("Si propones agregar pantallas nuevas, respeta la separación operador/investigador: operador no debe ver nada de investigación."),
  bullet("Lenguaje: español neutro, sin marketing. Sin «¡Listo!», sin «Te guiamos paso a paso», sin uppercase forzado, sin em-dashes retóricos en oraciones (solo como placeholder de valor vacío en celdas)."),
  bullet("Cuando referencies un archivo, usa la ruta relativa exacta y, si aplica, el número de línea (ejemplo: lib/engine/effort.ts:53)."),
  bullet("El motor, el schema Prisma y los endpoints están estables. Cambios ahí necesitan tests unitarios y E2E."),

  H2("Estado de los tests al cierre"),
  bullet("npm run typecheck: exit 0"),
  bullet("npm test: 39/39 verde (30 motor base + 9 change-impact v6)"),
  bullet("npm run build: compiled successfully"),
  bullet("28/28 capturas de pantalla generadas"),

  H2("GitHub"),
  P("Repositorio: https://github.com/ROGELIOFLORESYUNTA/EMPS-Fresnillo"),
  P("Rama principal: main. Último commit incluido en este documento: c7ddfef."),
];

const doc = new Document({
  creator: "EMPS Fresnillo (build-entregable-docx)",
  title: "EMPS Fresnillo - Estado actual del sistema",
  description: "Documento de entrega para ChatGPT Pro",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
        paragraph: { spacing: { line: 300 } },
      },
    },
  },
  sections: [{ children: sections }],
});

(async () => {
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  const sizeKb = (buffer.length / 1024).toFixed(1);
  console.log(`OK: ${OUT} (${sizeKb} KB)`);
})();
