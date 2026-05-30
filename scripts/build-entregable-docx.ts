/**
 * Genera "EMPS_Fresnillo_Estado_Actual.docx" para entregar a ChatGPT Pro.
 *
 * Versión actualizada (mayo 2026, tras G.H + G.I + Addendum v7):
 *   - 12 secciones
 *   - 37 capturas de pantalla
 *   - Refleja motor v7 control de cambios + reportes orientados a audiencia
 *     + multi-tenancy por cookie + manual de parámetros + panel admin
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
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } });
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
  const heightPx = Math.round(widthPx * (900 / 1440));
  const out: Paragraph[] = [
    new Paragraph({
      children: [new ImageRun({ type: "png", data, transformation: { width: widthPx, height: heightPx } })],
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
            children: [new Paragraph({ children: [new TextRun({ text: cell, bold: i === 0, size: 18 })] })],
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
    children: [new TextRun({ text: "Snapshot: 2026-05-30 (Fases A–G.I integradas)", size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Documento para retomar trabajo en ChatGPT Pro", size: 18 })],
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

  // === 1. RESUMEN EJECUTIVO ===
  H1("1. Resumen ejecutivo"),
  P("EMPS Fresnillo es un estimador de proyectos de software desarrollado a la medida del Ayuntamiento de Fresnillo, Zacatecas. Integra cuatro dimensiones que la literatura suele tratar por separado: esfuerzo técnico, modo de desarrollo, control de cambios y viabilidad fiscal-laboral mexicana."),
  P("Este snapshot refleja el sistema tras integrar el Addendum v6 (control de cambios), Addendum v7 (costo de cambios + parámetros vivos + explicabilidad), Fase G.H (reportes orientados a la pregunta real de cada audiencia) y Fase G.I (multi-tenancy por cookie + manual visual por parámetro + panel de administrador para análisis científico)."),
  H2("Cifras del repositorio"),
  table([
    ["Indicador", "Valor"],
    ["Modelos Prisma", "29 (25 originales + Workspace, WorkspaceParameterOverride, ParameterManual, WorkspaceActivityLog)"],
    ["Endpoints REST", "50+"],
    ["Pantallas UI", "30+"],
    ["Tests unitarios", "79/79 verde"],
    ["Parámetros fiscales 2026 sembrados", "48"],
    ["Funciones puras del motor", "30+ (effort, cost, cashflow, lft-risk, risk, change-impact, reports-insights)"],
    ["Capturas en este documento", "37"],
  ]),

  pageBreak(),

  // === 2. STACK TÉCNICO ===
  H1("2. Stack técnico real"),
  table([
    ["Capa", "Decisión"],
    ["Framework", "Next.js 15 App Router + React 19"],
    ["Lenguaje", "TypeScript 5.7 strict"],
    ["ORM", "Prisma 6"],
    ["BD local", "SQLite"],
    ["BD producción", "PostgreSQL vía DATABASE_URL (schema portable)"],
    ["UI", "Tailwind 3.4 + Radix Primitives + Lucide icons"],
    ["Validación", "Zod 3.24"],
    ["Tests unitarios", "Vitest 2.1"],
    ["Tests E2E", "Playwright 1.59"],
    ["Decimales", "decimal.js + Prisma.Decimal (precisión 18,4 / 18,6)"],
    ["Identidad de usuario", "Cookie automática por navegador (sin login)"],
    ["Auth del panel investigador", "Cookie comparada con variable de entorno ADMIN_SECRET"],
    ["Reportes", "HTML imprimible (Ctrl+P) con CSS @media print"],
  ]),

  pageBreak(),

  // === 3. CÓMO SE USA: VISTA DEL OPERADOR ===
  H1("3. Vista del operador (Ayuntamiento o Proveedor)"),
  P("El operador entra al sitio y recibe automáticamente un workspace propio identificado por cookie (sin necesidad de login). Todos los proyectos que cree, parámetros que edite y estimaciones que corra quedan asociados a su workspace y no afectan a otros usuarios."),

  H2("3.1 Página de inicio"),
  P("Tres acciones principales (crear proyecto, mis proyectos, editar parámetros), alertas si hay cambios pendientes, lista de proyectos recientes. Solo se ven los proyectos del workspace propio + el demo público."),
  ...img("01_homepage_operador.png", 16, "Figura 1. Inicio para el operador."),

  H2("3.2 Lista de proyectos y detalle"),
  P("Tarjeta por proyecto con cliente, módulos, estimaciones y precio en modo híbrido probable (línea base realista)."),
  ...img("02_lista_proyectos.png", 16, "Figura 2. Mis proyectos."),

  P("El detalle es la pantalla central: banner azul de perspectiva, checklist de 5 pasos, selector de modo/escenario, 4 tarjetas resumen con tooltips, tarjeta de riesgo de cotización, comparador de los 5 modos y flujo de efectivo con el bache resaltado."),
  ...img("03_proyecto_detalle_hibrido_probable.png", 16, "Figura 3. Detalle del proyecto, modo híbrido probable (default)."),
  ...img("04_proyecto_detalle_tradicional_conservador.png", 16, "Figura 4. Mismo proyecto, tradicional conservador."),
  ...img("05_proyecto_detalle_bytecoding_optimista.png", 16, "Figura 5. Mismo proyecto, bytecoding optimista."),

  H2("3.3 Captura de módulos y equipo"),
  P("Cada módulo captura tipo, complejidad, claridad, criticidad, pantallas, reportes, integraciones, datos sensibles. Cada columna tiene un tooltip ⓘ que explica qué se mide y cómo afecta al cálculo de horas."),
  ...img("06_modulos.png", 16, "Figura 6. Módulos con tooltips explicativos."),

  P("El equipo captura sueldo, tipo de contrato (clave para LFT), disponibilidad y meses asignados."),
  ...img("07_equipo.png", 16, "Figura 7. Equipo del proyecto."),

  H2("3.4 Estimación y cambios"),
  P("La pantalla de estimación ejecuta el motor sobre los datos capturados y devuelve 5 modos × 3 escenarios (15 estimaciones) en una sola corrida."),
  ...img("09_estimar.png", 16, "Figura 8. Ejecutar estimación."),

  P("La pantalla de cambios permite registrar solicitudes en lenguaje natural. Cada cambio tiene un botón de lupa que abre el wizard del motor v7."),
  ...img("08_cambios.png", 16, "Figura 9. Lista de cambios con botón de evaluación detallada."),

  pageBreak(),

  // === 4. ADDENDUM V7: WIZARD DE EVALUACIÓN DE CAMBIOS ===
  H1("4. Addendum v7: wizard de evaluación de cambios"),
  P("El motor v7 evalúa cambios con 11 tipos de artefactos × 7 fases × 5 modos × claridad × riesgo. Aplica piso de modo 0.90 cuando hay alto riesgo (impide que low-code subestime cambios complejos) y bloquea decisiones de 'sin costo' cuando requiere aprobación formal."),

  P("La UI es un wizard de 6 pasos: (1) solicitud original, (2) preguntas de aclaración + contexto + claridad + modo + riesgos, (3) artefactos afectados con iconos, (4) resultado en 4 tarjetas + desglose financiero + explicación cliente + preguntas, (5) panel 'de dónde sale' (fórmula + technical + referencias legales), (6) decisión con guardrails."),
  ...img("29_changes_wizard_paso1.png", 16, "Figura 10. Wizard v7, paso 1 (solicitud original)."),

  pageBreak(),

  // === 5. REPORTES POR AUDIENCIA (G.H) ===
  H1("5. Reportes orientados a la pregunta real de cada audiencia (Fase G.H)"),
  P("Los reportes responden las preguntas concretas que cada audiencia se hace, no solo muestran cifras técnicas."),

  H2("5.1 Hub de reportes"),
  P("Dos versiones para el operador: Ayuntamiento (cliente) y Proveedor. La versión académica vive en la zona de investigación, fuera del flujo operativo."),
  ...img("10_reportes_hub.png", 16, "Figura 11. Hub de reportes."),

  H2("5.2 Reporte para Ayuntamiento (6 nuevas cards G1–G6)"),
  P("Responde 6 preguntas concretas con semáforo y texto narrativo: ¿va a terminar a tiempo?, ¿el proveedor va a aguantar?, ¿qué método usa y qué implica?, ¿cuánto cuestan los cambios si pides después?, ¿cuánto cuesta mantenerlo cada mes?, ¿termina antes de la fecha objetivo?"),
  ...img("30_reporte_municipal_con_G1_G6.png", 16, "Figura 12. Reporte municipal con las 6 cards nuevas."),

  H2("5.3 Reporte para Proveedor (4 nuevas cards H1–H4)"),
  P("Responde: ¿realmente estás ganando? (costo de oportunidad: margen mensual vs sueldo asalariado de mercado), ¿cuándo cobras vs cuándo gastas? (timeline visual), ¿aguantas el proyecto? (ratio bache vs margen), ¿cuánto cobrar si surgen cambios?"),
  ...img("31_reporte_proveedor_con_H1_H4.png", 16, "Figura 13. Reporte proveedor con las 4 cards nuevas."),

  H2("5.4 Reportes municipal y proveedor base"),
  ...img("11_reporte_municipal.png", 16, "Figura 14. Reporte Ayuntamiento (vista clásica)."),
  ...img("12_reporte_proveedor.png", 16, "Figura 15. Reporte Proveedor (vista clásica)."),

  pageBreak(),

  // === 6. MULTI-TENANCY (G.I) ===
  H1("6. Multi-tenancy por workspace, manual visual por parámetro y panel de admin (Fase G.I)"),

  P("Tres problemas resueltos:"),
  bullet("Cada visitante = workspace propio (cookie automática). Lo que un usuario edita no afecta a los demás."),
  bullet("Cada parámetro tiene una ⓘ con manual extendido: origen oficial, URL al DOF, qué afecta si cambias, checklist antes de modificar, referencias bibliográficas."),
  bullet("Panel del investigador (oculto al operador): ves todos los workspaces, parámetros más editados, distribuciones de uso, estimaciones agregadas y export CSV para análisis científico."),

  H2("6.1 Editor de parámetros con badge y manual"),
  P("Aparece un badge 'Editado por ti' (azul) cuando el workspace tiene un override. El valor del global queda tachado. Cada parámetro tiene un botón ⓘ que abre el manual."),
  ...img("32_admin_parametros_con_manual_button.png", 16, "Figura 16. Editor de parámetros con badge y manual."),

  H2("6.2 Login del panel de investigador"),
  P("La pantalla pide un código de acceso. Ese código es el valor de la variable ADMIN_SECRET configurada en el archivo .env del servidor. Solo el dueño del despliegue conoce ese código."),
  ...img("33_admin_login.png", 16, "Figura 17. Login del panel de investigador."),

  H2("6.3 Panel del investigador"),
  P("Una vez autenticado, el investigador ve workspaces activos, distribución de uso (modos elegidos, tipos de cambio), parámetros más editados (señal de que el default no calibra), promedios por modo × escenario y bitácora de eventos. Botón para descargar el CSV completo de actividad."),
  ...img("34_admin_datos_panel.png", 16, "Figura 18. Panel del investigador con datos agregados."),

  pageBreak(),

  // === 7. CONFIGURACIÓN AVANZADA (operador) ===
  H1("7. Configuración avanzada (operador)"),
  H2("7.1 Editor de parámetros fiscales"),
  ...img("13_admin_parametros.png", 16, "Figura 19. Listado de parámetros 2026."),
  H2("7.2 Calibración del motor"),
  ...img("37_admin_calibracion.png", 16, "Figura 20. Calibración velocity_factor por modo."),

  pageBreak(),

  // === 8. ZONA DE INVESTIGACIÓN ===
  H1("8. Zona de investigación (oculta al operador)"),
  P("Accesible desde el enlace discreto 'Investigación' en el footer. Reúne datasets, ML, fuentes vivas, comparador técnico, bitácora, casos de entrenamiento, resultados reales, feedback, reportes académicos, usuarios y exportar evidencia."),
  ...img("36_investigacion_dashboard_actualizado.png", 16, "Figura 21. Zona de investigación (dashboard)."),

  H2("8.1 Comparador técnico y bitácora"),
  ...img("18_investigacion_comparador_tecnico.png", 16, "Figura 22. Comparador técnico (Boehm + velocity)."),
  ...img("22_investigacion_bitacora.png", 16, "Figura 23. Bitácora de eventos."),

  H2("8.2 Datasets, ML y fuentes vivas"),
  ...img("19_investigacion_datasets.png", 16, "Figura 24. Datasets."),
  ...img("20_investigacion_modelos_ml.png", 16, "Figura 25. Modelos ML."),
  ...img("21_investigacion_fuentes_vivas.png", 16, "Figura 26. Fuentes vivas."),

  H2("8.3 Casos de entrenamiento, resultados reales y feedback"),
  P("Estas 3 tablas están vacías hoy. Son la base de la validación científica de la tesis (Fase C2): comparar estimado vs real."),
  ...img("23_investigacion_casos_entrenamiento.png", 16, "Figura 27. Casos de entrenamiento (vacío hoy)."),
  ...img("24_investigacion_resultados_reales.png", 16, "Figura 28. Resultados reales (vacío hoy)."),
  ...img("25_investigacion_feedback_estimaciones.png", 16, "Figura 29. Feedback de estimaciones (vacío hoy)."),

  H2("8.4 Reportes académicos, exportar cambios, usuarios"),
  ...img("26_investigacion_reportes_academicos.png", 16, "Figura 30. Selector de reportes académicos."),
  ...img("27_reporte_academico.png", 16, "Figura 31. Reporte académico de un proyecto."),
  ...img("35_investigacion_exportar_cambios.png", 16, "Figura 32. Exportar evidencia de cambios."),
  ...img("28_investigacion_usuarios_roles.png", 16, "Figura 33. Usuarios y roles."),

  pageBreak(),

  // === 9. AYUDA Y GLOSARIO ===
  H1("9. Ayuda al operador"),
  ...img("15_como_funciona.png", 16, "Figura 34. Tutorial 'Cómo funciona'."),
  ...img("16_glossario.png", 16, "Figura 35. Glosario con 34+ términos."),

  pageBreak(),

  // === 10. ARQUITECTURA ===
  H1("10. Arquitectura del repositorio"),
  code(`EstimacionTemprana/
├── prisma/
│   ├── schema.prisma                ← 29 modelos
│   ├── seed.ts                      ← parámetros fiscales 2026 + CHANGE_*
│   ├── reset-demo-realista.ts       ← demo público (isTemplate=true)
│   └── migrate-v7-assessments.ts    ← recalcula assessments con v7
├── middleware.ts                    ← NUEVO G.I: cookie de workspace
├── lib/
│   ├── workspace.ts                 ← NUEVO G.I: helper de identidad por cookie
│   ├── admin-auth.ts                ← NUEVO G.I: protege panel investigador
│   ├── rate-limit.ts                ← v7: defensa de POST /preview
│   ├── parameters.ts                ← carga parámetros (acepta workspaceId)
│   ├── estimate-service.ts          ← orquestador
│   ├── validators.ts                ← Zod
│   └── engine/                      ← motor de dominio puro
│       ├── effort.ts, cost.ts, cashflow.ts, lft-risk.ts, risk.ts
│       ├── change-impact.ts         ← v7
│       ├── change-types.ts          ← v7
│       ├── change-questions.ts      ← v7
│       ├── change-export.ts         ← v7
│       └── reports-insights.ts      ← NUEVO G.H: 6 funciones de insight
├── app/
│   ├── middleware aplicado a todo
│   ├── page.tsx, layout.tsx
│   ├── admin-login/                 ← NUEVO G.I: login investigador
│   ├── projects/                    ← CRUD proyectos + estimación + reportes
│   │   └── [id]/changes/[changeId]/impact/
│   │                                ← v7: wizard de 6 pasos
│   ├── admin/                       ← /parametros y /calibracion (operativos)
│   ├── investigacion/               ← zona oculta al operador
│   │   ├── admin-datos/             ← NUEVO G.I: panel del investigador
│   │   ├── exportar-cambios/        ← v7
│   │   └── (datasets, modelos-ml, fuentes-vivas, comparador, bitácora, etc.)
│   └── api/                         ← 50+ endpoints
├── tests/                           ← 79 unit tests verde
├── e2e/                             ← Playwright (incluye screenshots y multi-tenancy)
├── 00..34_*.md                      ← spec original + addendums v6
├── addendum_md_v7_costo_cambios_ux_fiscal/  ← addendum v7
├── 17_seed_*.json, 31_seed_*.json   ← parámetros
└── docs entregables:
    ├── MANUAL.md, SESSION_STATE.md, HANDOFF_CHATGPT.md`),

  pageBreak(),

  // === 11. INSTRUCCIONES PARA CHATGPT PRO ===
  H1("11. Instrucciones para ChatGPT Pro"),
  P("Junto a este documento Word vienen las siguientes carpetas para subir al chat:"),
  bullet("entregable-chatgpt/screenshots/ con las 37 capturas PNG originales."),
  bullet("entregable-chatgpt/codigo-clave/ con el motor (lib/engine/*), schema Prisma, validadores Zod, helpers de workspace y parámetros, seeds JSON."),
  bullet("entregable-chatgpt/docs/ con HANDOFF_CHATGPT.md, MANUAL.md, SESSION_STATE.md y los addendums v6/v7."),

  H2("Sobre la variable ADMIN_SECRET (configuración para el dueño del despliegue)"),
  P("En el panel del investigador (figura 17 y 18) se pide un código de acceso. Ese código se llama ADMIN_SECRET y vive en un archivo llamado .env en la raíz del proyecto (junto al package.json). El archivo .env es un archivo de texto que el dueño del servidor crea con cualquier editor de texto."),
  P("Para configurarlo:"),
  bullet("Abrir el archivo .env en la raíz del proyecto (si no existe, crear un archivo nuevo con ese nombre)."),
  bullet("Agregar una línea: ADMIN_SECRET=mi_codigo_secreto_largo_que_solo_yo_se"),
  bullet("Guardar el archivo y reiniciar el servidor (Ctrl+C y luego npm run dev)."),
  bullet("Ese código secreto es el que se captura en la pantalla /admin-login para entrar al panel del investigador."),
  P("La variable existe para que solo el autor de la investigación (Rogelio) tenga acceso al panel con los datos agregados de todos los usuarios. Sin ese código nadie más puede ver esa parte del sistema."),

  H2("Prompt sugerido para ChatGPT Pro"),
  code(`Estoy continuando el proyecto EMPS Fresnillo (estimador municipal de proyectos
de software, tesis UAZ 2026). Te paso este documento Word con el estado real
del sistema al 30 de mayo de 2026, incluyendo Addendum v7 (costo de cambios),
Fase G.H (reportes orientados a audiencia) y Fase G.I (multi-tenancy por
cookie + manual visual por parámetro + panel de investigador).

ANTES DE PROPONER CAMBIOS, lee el documento completo. Las 37 capturas
muestran cómo está construido cada flujo. Si propones modificar algo,
asegúrate de que sea aditivo (no rehacer arquitectura).

REGLAS:
1. El stack es Next.js 15 App Router + TypeScript estricto + Prisma 6 + SQLite
   (Postgres-ready). No proponer cambio de stack.
2. Las decisiones tomadas en el documento son irreversibles salvo que el autor
   las desautorice explícitamente.
3. Para nuevos addendums, seguir el formato de los anteriores: archivos
   numerados (35, 36, 37...) con README, SRS, SDS, Prisma, API, UI, tests
   y prompt de integración.
4. Para parámetros fiscales/laborales 2026, citar fuente oficial real
   (DOF, INEGI, CONASAMI, SAT, IMSS, SEFIN Zacatecas).
5. Idioma: español neutro, mexicano. Sin frases tipo "Te guiamos paso a paso".

Lo que necesito ahora es: [DESCRIBE AQUÍ LO QUE QUIERAS]`),

  pageBreak(),

  // === 12. CIERRE ===
  H1("12. Pendientes y siguiente paso"),
  H2("Pendientes técnicos visibles"),
  bullet("Generar 46_parameter_manuals_2026.json con ChatGPT Pro (prompt en el plan G.I.7) para que los botones ⓘ del editor de parámetros muestren manual real en lugar de 'Pendiente'."),
  bullet("Configurar ADMIN_SECRET en .env (ver §11 de este documento)."),
  bullet("Sembrar usuarios reales del Ayuntamiento si se va a desplegar en producción."),
  H2("Pendientes para la investigación"),
  bullet("Poblar las 3 tablas vacías (Casos de entrenamiento, Resultados reales, Feedback) con datos de proyectos pasados o de simulación."),
  bullet("Cuando haya N workspaces activos, exportar el CSV desde el panel del investigador y procesar con R/Python/Excel para el análisis del artículo."),
  bullet("Validar empíricamente la hipótesis del artículo comparando estimaciones del motor con resultados reales registrados."),
  H2("Comandos comunes"),
  code(`npm run dev -- -p 3003      # arranca el servidor en puerto 3003
npm run typecheck            # valida tipos TypeScript
npm test -- --run            # corre los 79 tests unitarios
npm run build                # build de producción
npx tsx prisma/reset-demo-realista.ts   # regenera el demo público`),
];

const doc = new Document({
  creator: "EMPS Fresnillo (build-entregable-docx)",
  title: "EMPS Fresnillo - Estado actual del sistema",
  description: "Documento de entrega para ChatGPT Pro (post G.H + G.I + v7)",
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
