/**
 * Cálculo del RIESGO DE LFT — Contrato indeterminado y liquidación
 *
 * Por la Ley Federal del Trabajo (México), un contrato por obra/tiempo determinado de
 * personal calificado puede durar hasta 6 meses. Si la obra se prolonga más, el
 * trabajador puede demandar conversión a contrato por tiempo indeterminado.
 *
 * Si el proveedor termina el proyecto y necesita despedir al equipo (porque eran de obra
 * determinada pero ya están en indeterminado por exceder los 6 meses), debe pagar:
 *   - 3 meses de salario integrado (90 días)             [LFT Art. 50 fracc. III]
 *   - 20 días de salario por cada año de antigüedad      [LFT Art. 50 fracc. II]
 *   - Prima de antigüedad: 12 días de salario por año    [LFT Art. 162]
 *
 * Si el equipo está bajo otro régimen (asimilados, honorarios, RESICO, freelance), NO
 * aplica la liquidación LFT — solo aplica para contratos "nomina" (relación laboral
 * subordinada). Por eso este cálculo se hace SOLO sobre los perfiles con contractType="nomina".
 */

const LIMITE_CONTRATO_DETERMINADO_MESES = 6;
const INDEMNIZACION_DIAS_BASE = 90;          // 3 meses
const INDEMNIZACION_DIAS_POR_ANIO = 20;
const PRIMA_ANTIGUEDAD_DIAS_POR_ANIO = 12;
const DIAS_DE_SALARIO_POR_MES = 30;

export interface ProfileForLFT {
  monthlySalary: number;
  contractType: string;        // "nomina" | "asimilados" | "honorarios" | "resico_pf" | "freelance"
  availabilityPercent: number; // 0-100
}

export interface LFTRiskInput {
  team: ProfileForLFT[];
  realMonthsOfProject: number;     // duración real del proyecto en meses
  willTerminateAtEnd: boolean;     // true si el proveedor planea terminar contratos al cierre
}

export interface LFTRiskResult {
  isAtRisk: boolean;                       // true si hay riesgo de conversión a indeterminado
  monthsOverLimit: number;                 // meses excedentes sobre el límite legal de 6
  affectedProfilesCount: number;           // número de perfiles "nomina" expuestos
  estimatedTerminationCost: number;        // costo total estimado de liquidación si los despide
  perProfileBreakdown: Array<{
    monthlySalary: number;
    indemnizacionConstitucional: number;   // 90 días
    primaAntiguedad: number;               // 12 días × años
    indemnizacionAntiguedad: number;       // 20 días × años
    aguinaldoProporcional: number;
    vacacionesProporcionales: number;
    total: number;
  }>;
  recommendation: string;
}

export function computeLFTRisk(input: LFTRiskInput): LFTRiskResult {
  const monthsOverLimit = Math.max(0, input.realMonthsOfProject - LIMITE_CONTRATO_DETERMINADO_MESES);
  const isAtRisk = monthsOverLimit > 0;

  const nominaProfiles = input.team.filter((p) => p.contractType === "nomina");

  if (!isAtRisk || nominaProfiles.length === 0 || !input.willTerminateAtEnd) {
    return {
      isAtRisk: false,
      monthsOverLimit,
      affectedProfilesCount: 0,
      estimatedTerminationCost: 0,
      perProfileBreakdown: [],
      recommendation: !isAtRisk
        ? "Proyecto bajo el límite de 6 meses. Sin riesgo de conversión a indeterminado."
        : nominaProfiles.length === 0
          ? "Equipo bajo regímenes que no son nómina (asimilados/honorarios/freelance). Sin riesgo LFT."
          : "Sin liquidación si el equipo continúa con la empresa después del proyecto.",
    };
  }

  // Años de antigüedad estimados (proyecto + tiempo previo asumido = realMonths/12)
  const yearsOfTenure = input.realMonthsOfProject / 12;

  const perProfileBreakdown = nominaProfiles.map((p) => {
    const dailySalary = (p.monthlySalary / DIAS_DE_SALARIO_POR_MES) * (p.availabilityPercent / 100);

    const indemnizacionConstitucional = dailySalary * INDEMNIZACION_DIAS_BASE;
    const indemnizacionAntiguedad = dailySalary * INDEMNIZACION_DIAS_POR_ANIO * yearsOfTenure;
    const primaAntiguedad = dailySalary * PRIMA_ANTIGUEDAD_DIAS_POR_ANIO * yearsOfTenure;
    // Aguinaldo proporcional: 15 días × meses_trabajados / 12
    const aguinaldoProporcional = dailySalary * 15 * (input.realMonthsOfProject / 12);
    // Vacaciones proporcionales: 12 días × año × prima 25%
    const vacacionesProporcionales = dailySalary * 12 * yearsOfTenure * 1.25;

    const total =
      indemnizacionConstitucional +
      indemnizacionAntiguedad +
      primaAntiguedad +
      aguinaldoProporcional +
      vacacionesProporcionales;

    return {
      monthlySalary: p.monthlySalary,
      indemnizacionConstitucional,
      indemnizacionAntiguedad,
      primaAntiguedad,
      aguinaldoProporcional,
      vacacionesProporcionales,
      total,
    };
  });

  const estimatedTerminationCost = perProfileBreakdown.reduce((acc, p) => acc + p.total, 0);

  return {
    isAtRisk: true,
    monthsOverLimit,
    affectedProfilesCount: nominaProfiles.length,
    estimatedTerminationCost,
    perProfileBreakdown,
    recommendation:
      `El proyecto excede ${LIMITE_CONTRATO_DETERMINADO_MESES} meses (límite legal para contrato determinado). ` +
      `${nominaProfiles.length} perfil(es) en nómina pueden demandar conversión a indeterminado. ` +
      `Si decides terminar contratos al cierre del proyecto, la liquidación estimada es ` +
      `${estimatedTerminationCost.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}. ` +
      `Alternativas: contratar bajo asimilados/honorarios desde el inicio, o continuar la relación laboral con otros proyectos.`,
  };
}
