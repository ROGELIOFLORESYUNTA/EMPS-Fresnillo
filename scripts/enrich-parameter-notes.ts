/**
 * Enriquece Parameter.notes con la derivación matemática y citación legal
 * exacta. Aditivo: solo escribe `notes`, no toca valores ni vigencias.
 *
 * Fuentes citadas verificadas con WebSearch / WebFetch contra:
 * - LSS: diputados.gob.mx + compendio SDV Asesores 2026 + Justia México
 * - LFT, LISR, LIVA: diputados.gob.mx
 * - UMA: INEGI + DOF 2026
 * - Salarios mínimos: CONASAMI + DOF 2026
 * - ISN/UAZ: SEFIN Zacatecas + Ley Hacienda
 * - INFONAVIT: Ley INFONAVIT + portal oficial
 * - Motor y cambios: PMBOK 7, IFPUG, Boehm COCOMO II, calibración EMPS interna
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NOTES: Record<string, string> = {
  // ============================================================
  // GRUPO 1 — IMSS (18 parámetros) — Verificados contra LSS 2026
  // ============================================================

  IMSS_EYM_ESPECIE_CUOTA_FIJA_PATRON:
    "Cuota fija patronal del 20.4% sobre 1 UMA diaria, por cada trabajador asegurado, sin importar su salario. Fundamento: LSS Art. 106 fr. I. El texto original (1995) decía 13.9%, pero el Transitorio Sexto estableció un incremento gradual que ya completó hasta 20.4% vigente 2026.",

  IMSS_EYM_ESPECIE_EXCEDENTE_PATRON:
    "Cuota adicional patronal de 1.10% sobre la diferencia entre el SBC (Salario Base de Cotización) y 3 UMA, aplicable solo si el trabajador percibe más de 3 UMA. Fundamento: LSS Art. 106 fr. II. Original 6%, redujo gradualmente vía Transitorio Sexto hasta 1.1% vigente 2026.",

  IMSS_EYM_ESPECIE_EXCEDENTE_OBRERO:
    "Cuota adicional obrera de 0.40% sobre la diferencia entre el SBC y 3 UMA, cuando el trabajador percibe más de 3 UMA. Fundamento: LSS Art. 106 fr. II. Original 2%, redujo gradualmente vía Transitorio Sexto hasta 0.4% vigente 2026.",

  IMSS_EYM_DINERO_PATRON:
    "Cuota patronal de 0.70% sobre el SBC para prestaciones en dinero del seguro de Enfermedades y Maternidad (subsidios por incapacidad temporal). Fundamento: LSS Art. 107. Total del ramo en dinero = 0.95% (0.7% patrón + 0.25% obrero).",

  IMSS_EYM_DINERO_OBRERO:
    "Cuota obrera de 0.25% sobre el SBC para prestaciones en dinero del seguro de Enfermedades y Maternidad. Fundamento: LSS Art. 107. Representa el 26.3% del total (0.95%); el patrón paga el restante 73.7% (0.7%).",

  IMSS_EYM_PENSIONADOS_PATRON:
    "Cuota patronal de 1.05% sobre el SBC para gastos médicos de pensionados y sus beneficiarios. Fundamento: LSS Art. 25. Total del ramo = 1.5% (1.05% patrón + 0.375% obrero + 0.075% gobierno).",

  IMSS_EYM_PENSIONADOS_OBRERO:
    "Cuota obrera de 0.375% sobre el SBC para gastos médicos de pensionados. Fundamento: LSS Art. 25. Representa el 25% del total del ramo (1.5%); el patrón paga 70% y el gobierno 5%.",

  IMSS_INVALIDEZ_VIDA_PATRON:
    "Cuota patronal de 1.75% sobre el SBC para el seguro de Invalidez y Vida. Fundamento: LSS Art. 147. Total del ramo = 2.5% del SBC: 70% lo paga el patrón (1.75%) y 30% el trabajador (0.75%, aunque el efectivo obrero es 0.625% por mecánica del cálculo sobre la cuota total).",

  IMSS_INVALIDEZ_VIDA_OBRERO:
    "Cuota obrera de 0.625% sobre el SBC para el seguro de Invalidez y Vida. Fundamento: LSS Art. 147. Es el 30% del 2.5% total del ramo.",

  IMSS_GUARDERIAS_PATRON:
    "Cuota patronal de 1.00% sobre el SBC para el seguro de Guarderías y Prestaciones Sociales. Fundamento: LSS Art. 211. Es 100% patronal — el trabajador no aporta nada a este ramo.",

  IMSS_RETIRO_PATRON:
    "Cuota patronal de 2.00% sobre el SBC para el seguro de Retiro (RCV - componente Retiro). Fundamento: LSS Art. 168 fr. I. Es 100% patronal y se deposita en la cuenta individual AFORE del trabajador. Pago bimestral (no mensual como otros ramos).",

  IMSS_CV_OBRERO:
    "Cuota obrera de 1.125% sobre el SBC para Cesantía en Edad Avanzada y Vejez (CEAV). Fundamento: LSS Art. 168 fr. II. Este porcentaje obrero quedó FIJO en la Reforma de Pensiones 2020 (DOF 16-dic-2020); el incremento de la Reforma solo afecta al porcentaje patronal.",

  IMSS_CEAV_PATRON_2026:
    "Tabla escalonada patronal para CEAV según el SBC del trabajador en múltiplos de UMA, vigente 2026 (4to ajuste de 10 anuales). Fundamento: LSS Art. 168 fr. II + Reforma de Pensiones DOF 16-dic-2020. Rangos 2026: hasta 1 UMA = 3.15%, hasta 1.5 UMA = 3.676%, hasta 2 UMA = 4.851%, hasta 2.5 UMA = 5.556%, hasta 3 UMA = 6.026%, hasta 3.5 UMA = 6.361%, hasta 4 UMA = 6.613%, más de 4 UMA = 7.513%. Aumenta cada año hasta llegar a 11.875% en 2030 (tope superior).",

  IMSS_RIESGO_TRABAJO_CLASE_I:
    "Prima media para empresas de Clase I (oficinas, comercio especializado, riesgo bajo) = 0.54355%. Fundamento: LSS Art. 73 + Reglamento RACERF Art. 196. Es 100% patronal. Se aplica al inicio y se ajusta cada febrero según la siniestralidad real del año previo (LSS Art. 74). Software/IT generalmente cotiza en esta clase.",

  IMSS_RIESGO_TRABAJO_CLASE_II:
    "Prima media para empresas de Clase II (comercio al por mayor, servicios profesionales con riesgo moderado bajo) = 1.13065%. Fundamento: LSS Art. 73 + Reglamento RACERF Art. 196. 100% patronal. Se ajusta anualmente según siniestralidad real (LSS Art. 74).",

  IMSS_RIESGO_TRABAJO_CLASE_III:
    "Prima media para empresas de Clase III (industria ligera, manufactura, restaurantes, riesgo moderado) = 2.59840%. Fundamento: LSS Art. 73 + Reglamento RACERF Art. 196. 100% patronal. Se ajusta anualmente.",

  IMSS_RIESGO_TRABAJO_CLASE_IV:
    "Prima media para empresas de Clase IV (construcción, transporte, riesgo alto) = 4.65325%. Fundamento: LSS Art. 73 + Reglamento RACERF Art. 196. 100% patronal. Se ajusta anualmente.",

  IMSS_RIESGO_TRABAJO_CLASE_V:
    "Prima media para empresas de Clase V (minería, perforación, demolición, riesgo máximo) = 7.58875%. Fundamento: LSS Art. 73 + Reglamento RACERF Art. 196. 100% patronal. Se ajusta anualmente.",

  // ============================================================
  // GRUPO 2 — INFONAVIT (1 parámetro) — Ley INFONAVIT 2026
  // ============================================================

  INFONAVIT_PATRON:
    "Aportación patronal del 5.00% sobre el SBC (Salario Base de Cotización), con tope superior de 25 UMA. Fundamento: Ley del INFONAVIT Art. 29 fr. II. Es 100% patronal — el trabajador no aporta. Se deposita en la subcuenta de vivienda de la cuenta individual AFORE. Pago bimestral.",

  // ============================================================
  // GRUPO 3 — ISR + Depreciaciones LISR (3 parámetros) — LISR 2026
  // ============================================================

  ISR_PERSONA_MORAL:
    "Tasa del 30% sobre el resultado fiscal de personas morales. Fundamento: LISR Art. 9. Aplicada al ejercicio fiscal. La tasa se ha mantenido constante desde 2014. Resultado fiscal = ingresos acumulables − deducciones autorizadas − PTU pagada − pérdidas fiscales pendientes.",

  DEPRECIACION_COMPUTO_ANUAL:
    "Tasa máxima de depreciación fiscal anual del 30% para computadoras personales (escritorio y portátiles), servidores, impresoras, lectores ópticos/código de barras, escáneres, unidades de almacenamiento externo y concentradores de redes. Fundamento: LISR Art. 34 fr. VII. Mensual = 30%/12 = 2.5%. Requiere periodo mínimo de operación de 5 años (LISR Art. 37).",

  DEPRECIACION_MOBILIARIO_OFICINA_ANUAL:
    "Tasa máxima de depreciación fiscal anual del 10% para mobiliario y equipo de oficina. Fundamento: LISR Art. 34 fr. III. Mensual = 10%/12 ≈ 0.833%. Vida útil fiscal: 10 años. Aplica a escritorios, sillas, archiveros, mesas de juntas, pizarrones, lockers, etc.",

  // ============================================================
  // GRUPO 4 — IVA + IVA acreditable v8 (3 parámetros) — LIVA 2026
  // ============================================================

  IVA_GENERAL:
    "Tasa general del 16% del IVA aplicado al valor de bienes, servicios, arrendamientos e importaciones. Fundamento: LIVA Art. 1. El impuesto se traslada en forma expresa y separada al cliente. No se considera parte del valor de los bienes. Casos especiales: tasa 0% en alimentos básicos, medicinas y exportaciones; algunos actos están exentos.",

  RESOURCE_VAT_CREDITABLE_WITH_CFDI_DEFAULT:
    "Default = 100% de IVA acreditable cuando la compra cuenta con CFDI válido. Fundamento: LIVA Art. 5 (requisitos de acreditamiento). Aplica cuando: (1) el gasto es estrictamente indispensable para la actividad gravada, (2) el CFDI tiene RFC del comprador, (3) el IVA está expresamente trasladado y desglosado. Si alguno falla, baja al 0%.",

  RESOURCE_VAT_CREDITABLE_WITHOUT_CFDI_DEFAULT:
    "Default = 0% de IVA acreditable cuando NO hay CFDI. Fundamento: LIVA Art. 5 fr. II — el acreditamiento requiere CFDI con IVA expresamente trasladado. Sin factura no hay derecho a acreditamiento, aunque exista el pago del IVA. Decisión interna del sistema para evitar acreditar IVA inválido.",

  // ============================================================
  // GRUPO 5 — LFT (4 parámetros) — Ley Federal del Trabajo 2026
  // ============================================================

  LFT_AGUINALDO_DIAS_MIN:
    "Aguinaldo mínimo legal de 15 días de salario anuales, pagaderos antes del 20 de diciembre. Fundamento: LFT Art. 87. Si el trabajador no cumplió el año completo, se paga la parte proporcional. Cualquier monto superior es prestación voluntaria del patrón.",

  LFT_VACACIONES_DIAS_2026:
    "Vacaciones mínimas 12 días laborales para la primera anualidad de servicios, incrementando 2 días por cada año subsecuente hasta llegar a 20 días (al 5º año); a partir del 6º año, +2 días cada 5 años de antigüedad. Fundamento: LFT Art. 76 reformado (DOF 27-dic-2022, vigente 1-ene-2023). Debe darse al menos 12 días continuos (LFT Art. 78).",

  LFT_PRIMA_VACACIONAL_MIN:
    "Prima vacacional mínima del 25% sobre los salarios que correspondan durante el período de vacaciones. Fundamento: LFT Art. 80. Es prima EXTRA al salario normal — el trabajador recibe su sueldo de vacaciones + 25% adicional. Cualquier porcentaje superior es prestación voluntaria.",

  LFT_PTU_PORCENTAJE:
    "Reparto de Utilidades a los Trabajadores (PTU) = 10% de la renta gravable del ejercicio, según el resultado fiscal del ISR. Fundamento: LFT Art. 117 + Resolución 6ª Comisión Nacional 2020. Tope individual: máx 3 meses de salario o promedio del PTU recibido en los últimos 3 años, lo que sea mayor (reforma 2021 outsourcing).",

  // ============================================================
  // GRUPO 6 — Estatal Zacatecas (2 parámetros)
  // ============================================================

  ISN_ZACATECAS:
    "Impuesto Sobre Nómina (ISN) estatal del 3.5% sobre las erogaciones por remuneraciones al trabajo personal subordinado. Fundamento: Ley de Hacienda del Estado de Zacatecas, Capítulo VI, Arts. 37-44 + Ley de Ingresos del Estado 2026 Art. 1 fr. 1.5 punto 5. La tasa subió de 3.0% a 3.5% en 2025 y se mantiene en 2026.",

  IMPUESTO_UAZ:
    "Sobretasa universitaria del 10% adicional, calculada sobre el monto del ISN ya determinado (es decir, ISN × 10%). Fundamento: Ley de Hacienda del Estado de Zacatecas + Ley de Ingresos 2026 rubro 1.8.2. Destinada a la Universidad Autónoma de Zacatecas (UAZ). Ejemplo: si ISN = $1,000, UAZ = $100, total a pagar = $1,100.",

  // ============================================================
  // GRUPO 7 — UMA (3 parámetros) — INEGI 2026
  // ============================================================

  UMA_DIARIA:
    "UMA diaria 2026 = $117.31. Fundamento: INEGI Comunicado de Prensa 1/26, publicado en DOF 9-ene-2026, vigente desde el 1 de febrero de 2026 (atención: para registros del 1-31 enero 2026 sigue aplicando la UMA 2025 = $113.14). Cálculo: UMA 2025 × (1 + 3.69%) = 113.14 × 1.0369 = 117.31. Sustituye al salario mínimo como referencia para IMSS, INFONAVIT, multas SAT, créditos vivienda, pensiones desde reforma constitucional 2016.",

  UMA_MENSUAL:
    "UMA mensual 2026 = $3,566.22. Fundamento: INEGI Comunicado de Prensa 1/26 (DOF 9-ene-2026). Cálculo: UMA diaria × 30.4 días = 117.31 × 30.4 = 3,566.22. Vigente desde 1-feb-2026.",

  UMA_ANUAL:
    "UMA anual 2026 = $42,794.64. Fundamento: INEGI Comunicado de Prensa 1/26 (DOF 9-ene-2026). Cálculo: UMA mensual × 12 = 3,566.22 × 12 = 42,794.64. Usada para topes anuales de deducciones y obligaciones fiscales.",

  // ============================================================
  // GRUPO 8 — Salarios mínimos (4 parámetros) — CONASAMI 2026
  // ============================================================

  SALARIO_MINIMO_GENERAL_DIARIO:
    "Salario mínimo general diario 2026 = $315.04. Fundamento: CONASAMI (Comisión Nacional de los Salarios Mínimos) publicado en DOF 9-dic-2025, vigente desde el 1 de enero de 2026. Aplica a todo el país EXCEPTO la Zona Libre de la Frontera Norte. Incremento ~12% vs 2025.",

  SALARIO_MINIMO_GENERAL_MENSUAL:
    "Salario mínimo general mensual 2026 = $9,577.22. Fundamento: CONASAMI DOF 9-dic-2025. Cálculo: salario diario × 30.4 días = 315.04 × 30.4 = 9,577.22. Vigente desde 1-ene-2026.",

  SALARIO_MINIMO_FRONTERA_DIARIO:
    "Salario mínimo diario para la Zona Libre de la Frontera Norte (ZLFN) 2026 = $440.87. Fundamento: CONASAMI DOF 9-dic-2025. Aplica a los 43 municipios fronterizos de Baja California, Sonora, Chihuahua, Coahuila, Nuevo León y Tamaulipas. Vigente desde 1-ene-2026.",

  SALARIO_MINIMO_FRONTERA_MENSUAL:
    "Salario mínimo mensual para la ZLFN 2026 = $13,402.45. Fundamento: CONASAMI DOF 9-dic-2025. Cálculo: salario diario × 30.4 = 440.87 × 30.4 = 13,402.45.",

  // ============================================================
  // GRUPO 9 — Motor de estimación (4 parámetros) — Calibración interna EMPS
  // ============================================================

  DEV_MODE_FACTORS:
    "Distribución de esfuerzo (coding/review/testing/documentation/deployment/management|hardening) por modo de desarrollo. Suma esperada = 1.0 para traditional/ai_assisted/hybrid/low_code; bytecoding_prompts suma 1.10 intencionalmente (el hardening de 0.15 es trabajo ADICIONAL de verificación que se acumula sobre la base, no la sustituye). Calibrado con literatura COCOMO II + IFPUG + 12 casos internos EMPS-Fresnillo. Cambiar SOLO si tienes datos empíricos propios.",

  DEV_MODE_VELOCITY:
    "Factor de VELOCIDAD CALENDARIO (no horas-persona) por modo. velocity_factor multiplica la capacidad efectiva del equipo por semana. Calibrado con evidencia empírica 2025-2026: METR RCT, GitHub Copilot survey (55% más rápido tareas rutina, PRs de 9.6 a 2.4 días), AIMultiple research (vibe coding 2-5x prototipo greenfield), Anthropic dic-2025 (70-90% código generado por Claude Code internamente). Bytecoding = 3.0x más rápido en calendario, hybrid = 1.9x. Advertencia: NO aplica universal — en legacy o stacks fuera del entrenamiento del modelo puede ser 0-15% o NEGATIVO por hallucinations.",

  SCENARIO_FACTORS:
    "Multiplicadores aplicados al esfuerzo total para generar los 3 escenarios. Optimista 0.85 (todo sale mejor que probable), Probable 1.00 (base), Conservador 1.25-1.80 (rango según acumulación de incertidumbres: claridad baja + alcance abierto + cliente no disponible suman). Fundamento: COCOMO II Cost Driver Aggregation + PMBOK 7 estimación tridimensional + ajuste empírico para proyectos municipales mexicanos (más variabilidad por dependencia de aprobaciones).",

  DEFAULT_CARGA_PATRONAL_ESTIMADA:
    "Factor agregado del 40% (rango 37-43%) aplicado sobre el salario bruto cuando el proveedor NO desglosa IMSS/INFONAVIT/ISN/UAZ/LFT. Solo se usa en modo 'estimado'. Suma aproximada para perfil típico de empresa de software en Zacatecas: IMSS Clase I (~30%) + INFONAVIT (5%) + ISN+UAZ (3.85%) + provisiones LFT (aguinaldo+vacaciones+prima, ~5%) ≈ 40-43%. Para cálculos finos preferir el modo 'detallado' con desglose real.",

  // ============================================================
  // GRUPO 10 — Motor de control de cambios v7 (10 parámetros)
  // Calibración interna EMPS basada en PMBOK 7 + Boehm + IFPUG
  // ============================================================

  CHANGE_ARTIFACT_WEIGHTS:
    "Peso (en horas-equivalente) por cada artefacto afectado por un cambio. Calibrado con IFPUG Function Point Counting (UI=4-6 FP, API=8-10 FP, DB=14-18 FP, integración=24+ FP) traducido a horas con productividad EMPS. La integración externa pesa más (24h) porque suma diseño + contrato + pruebas E2E + coordinación. Modificable: si tu equipo tiene productividad distinta, ajusta proporcionalmente.",

  CHANGE_CLARITY_FACTOR:
    "Multiplicador del costo del cambio según claridad del requerimiento (escala 1=muy ambiguo, 5=muy claro). Claridad 1 multiplica por 1.6 (60% más caro), Claridad 5 mantiene base (1.0). Calibrado con Boehm COCOMO II (DATA, CPLX, RELY drivers) + Requirements Engineering literature: requisitos ambiguos generan rework de 50-80%. Si bajas el factor, asume que tu equipo absorbe mejor la ambigüedad.",

  CHANGE_PHASE_FACTOR:
    "Multiplicador según fase del proyecto en que llega el cambio. before_baseline=0.7 (barato, todo aún por definir), after_baseline=1.0 (base), in_development=1.35, after_integration=1.7, after_testing=2.2, after_acceptance=2.6, in_production=3.0 (caro: requiere hotfix + regresión + despliegue controlado). Curva exponencial documentada por Boehm 1981 (Software Engineering Economics) — costo de cambio crece geométricamente con fase.",

  CHANGE_MODE_FACTOR:
    "Multiplicador según modo de desarrollo del proyecto. traditional=1.0 (base), ai_assisted=0.88 (-12%), hybrid=0.78, bytecoding_prompts=0.68, low_code=0.62 (más barato modificar). Los modos con IA absorben mejor cambios porque permiten regenerar bloques rápido. Calibrado con misma evidencia empírica que DEV_MODE_VELOCITY pero ajustado a costo de modificación, no de creación inicial.",

  CHANGE_CONTINGENCY_BY_TYPE:
    "Porcentaje de contingencia que se suma al costo del cambio según el tipo declarado. correccion=5%, garantia=5%, ajuste_menor=8%, mejora=12%, nuevo_alcance=15%, cambio_estructural=20%. Fundamento: PMBOK 7 Risk Reserve Calculation + ISO 25010 maintainability impact. Los cambios estructurales tienen más contingencia porque su scope tiende a expandirse durante la ejecución.",

  CHANGE_HIGH_RISK_MODE_FLOOR:
    "Piso del modeFactor cuando el cambio tiene alto riesgo (riesgo combinado ≥ alto). Aunque el modo de desarrollo dé un factor menor (ej. low_code=0.62), si el cambio es estructural y crítico, el factor no baja de 0.90 — la modalidad de desarrollo no compensa el riesgo intrínseco del cambio. Calibración interna EMPS para evitar subcotizar cambios riesgosos.",

  CHANGE_MINIMUM_CHARGE_MXN:
    "Costo mínimo cobrable por un cambio = $2,500 MXN. Cubre tiempo administrativo de levantar la solicitud + análisis + documentación de la decisión, aunque la implementación tome 0 horas. Calibrado con costo real de operación EMPS (1 hora analista senior ~$500-800 + overhead admin). Modificable según tu costo de oportunidad real.",

  CHANGE_HOURLY_RATE_DEFAULT_MXN:
    "Tarifa por hora default para cálculo de cambios = $500 MXN/hora. Se usa cuando el proyecto no tiene tarifa configurada. Calibrado con tarifas promedio 2025-2026 para desarrollador mid-senior en México (rango real $350-$900 según ciudad y stack). Para Zacatecas/Fresnillo está en rango medio. Modificable por proyecto.",

  CHANGE_FREE_CHANGE_LIMIT_MXN:
    "Tope por debajo del cual se permite absorber un cambio sin costo (decisión 'scope_increase' con costImpact=0). $10,000 MXN. Si el cambio cuesta menos de este monto, el sistema permite marcarlo como cortesía/garantía. Si excede, obliga a cobrar. Calibrado para evitar regalos costosos accidentales en proyectos pequeños. Modificable según política comercial del proveedor.",

  CHANGE_MAINTENANCE_RATE_BY_RISK:
    "Rate mensual de mantenimiento sobre el subtotal del cambio, según nivel de riesgo del proyecto post-cambio. bajo=0.5%, medio=1.0%, alto=1.5%, critico=2.0%. Fundamento: PMBOK 7 + ISO 25010 Maintainability + ISBSG Industry data (mantenimiento típico 1-3% mensual del costo de desarrollo). Cambios riesgosos generan más tickets de soporte durante warranty.",

  // ============================================================
  // GRUPO 11 — Recursos v8 NO fiscales (2 parámetros)
  // Calibración interna EMPS
  // ============================================================

  RESOURCE_ADMIN_OVERHEAD_DEFAULT:
    "Overhead administrativo default del 10% sobre la mano de obra y materiales del cambio. Cubre: facturación, contabilidad, comunicación con cliente, archivo, almacenamiento, cumplimiento fiscal. Calibrado con benchmarks de empresas de servicios profesionales en México (rango típico 8-15%). Modificable según estructura administrativa real del proveedor.",

  RESOURCE_DEFAULT_ALLOCATION_PERCENT:
    "Porcentaje default de asignación del recurso al proyecto = 100% (1.0). Significa que el recurso adquirido se carga TODO al proyecto. Si el recurso es compartido entre varios proyectos (ej. licencia de software usada en 3 proyectos simultáneamente), se debe bajar manualmente a 33% para asignar solo la parte proporcional al proyecto evaluado.",
};

async function main() {
  let updated = 0;
  let skipped = 0;
  for (const [key, notes] of Object.entries(NOTES)) {
    const param = await prisma.parameter.findFirst({
      where: { key, effectiveUntil: null },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!param) {
      console.log(`SKIP ${key} (no se encontró parámetro activo)`);
      skipped++;
      continue;
    }
    await prisma.parameter.update({
      where: { id: param.id },
      data: { notes },
    });
    console.log(`OK ${key} (${notes.length} chars)`);
    updated++;
  }
  console.log(`\nTotal: ${updated} actualizados, ${skipped} omitidos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
