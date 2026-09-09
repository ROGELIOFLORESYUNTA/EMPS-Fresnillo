/**
 * "De dónde sale este número": la cadena de cálculo en renglones que cualquiera
 * puede seguir y comprobar con una calculadora.
 *
 * Es una función pura: recibe los valores intermedios que ya calculó el motor y
 * los ordena como pasos con su número, su unidad y la operación que llevó de un
 * paso al siguiente. No inventa nada: si un renglón no cuadra con el total, es
 * que el motor cambió y hay que actualizar esto (hay una prueba que lo vigila).
 */

export interface PasoDeCalculo {
  clave: string;
  /** Cómo se lee en pantalla, sin jerga. */
  etiqueta: string;
  valor: number;
  unidad: "horas" | "puntos" | "factor" | "semanas" | "meses" | "pesos" | "porcentaje";
  /** La operación en palabras, con los números que entran. */
  operacion?: string;
  /** Aviso cuando el dato es un supuesto y no una captura. */
  nota?: string;
}

export interface EntradasExplicacion {
  puntosBase: number;
  factorClaridad: number;
  claridadPromedio: number;
  factorRiesgo: number;
  riesgo: {
    cambios: number;
    clienteAusente: number;
    rotacion: number;
    sinDatoDeCliente: boolean;
  };
  esfuerzoTecnico: number;
  /** totalEffortHours / esfuerzoTecnico: como se reparte entre fases (0.995 hibrido, 1.10 bytecoding...). */
  repartoFases: number;
  horasTrasReparto: number;
  eficienciaModo: number;
  nombreModo: string;
  horasModo: number;
  factorEscenario: number;
  nombreEscenario: string;
  horasEscenario: number;
  capacidadSemanal: number;
  capacidadCalculadaDelEquipo: boolean;
  velocidadModo: number;
  semanas: number;
  meses: number;
  costoMensualEquipo: number;
  personas: number;
  liquidacionLFT: number;
  costoTotal: number;
  margen: number;
  subtotal: number;
  tasaIva: number;
  iva: number;
  total: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
// Los factores van a 4 decimales: con 2, la comprobacion a mano no cuadra.
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export function construirExplicacion(e: EntradasExplicacion): PasoDeCalculo[] {
  const pasos: PasoDeCalculo[] = [];

  pasos.push({
    clave: "puntos_base",
    etiqueta: "Horas base de las piezas del sistema",
    valor: r2(e.puntosBase),
    unidad: "horas",
    operacion: "Cada pieza suma horas por su complejidad, sus pantallas, sus reportes, sus conexiones y si maneja datos personales.",
  });

  pasos.push({
    clave: "claridad",
    etiqueta: "Ajuste por qué tan claro está lo que se quiere",
    valor: r4(e.factorClaridad),
    unidad: "factor",
    operacion: `Claridad promedio ${r2(e.claridadPromedio)} de 5. Entre menos claro, más horas de ir y venir.`,
  });

  const partesRiesgo: string[] = [];
  if (e.riesgo.cambios > 0) partesRiesgo.push(`cambios ${r2(e.riesgo.cambios)}`);
  if (e.riesgo.clienteAusente > 0) partesRiesgo.push(`cliente ausente ${r2(e.riesgo.clienteAusente)}`);
  if (e.riesgo.rotacion > 0) partesRiesgo.push(`rotación del equipo ${r2(e.riesgo.rotacion)}`);
  pasos.push({
    clave: "riesgo",
    etiqueta: "Ajuste por riesgo del proyecto",
    valor: r4(e.factorRiesgo),
    unidad: "factor",
    operacion:
      partesRiesgo.length > 0
        ? `1 + ${partesRiesgo.join(" + ")}`
        : "Sin riesgos registrados: el factor es 1 y no agrega horas.",
    nota: e.riesgo.sinDatoDeCliente
      ? "No se capturó qué tan disponible está el cliente; se asume que sí lo está."
      : undefined,
  });

  pasos.push({
    clave: "esfuerzo_tecnico",
    etiqueta: "Horas de trabajo si se hiciera todo a mano",
    valor: r2(e.esfuerzoTecnico),
    unidad: "horas",
    operacion: `${r2(e.puntosBase)} × ${r4(e.factorClaridad)} × ${r4(e.factorRiesgo)}`,
  });

  pasos.push({
    clave: "reparto_fases",
    etiqueta: "Horas repartidas entre análisis, código, pruebas, documentación, capacitación y soporte",
    valor: r2(e.horasTrasReparto),
    unidad: "horas",
    operacion: `${r2(e.esfuerzoTecnico)} × ${r4(e.repartoFases)} (el reparto de esta forma de hacerlo${e.repartoFases > 1 ? " agrega horas de endurecimiento" : " deja fuera parte de la gestión"})`,
  });

  pasos.push({
    clave: "modo",
    etiqueta: `Horas con la forma de hacerlo elegida (${e.nombreModo})`,
    valor: r2(e.horasModo),
    unidad: "horas",
    operacion:
      e.eficienciaModo === 1
        ? "Esta forma de hacerlo no ahorra horas de trabajo."
        : `${r2(e.horasTrasReparto)} × ${e.eficienciaModo} (esta forma ahorra ${Math.round((1 - e.eficienciaModo) * 100)}% del trabajo)`,
  });

  if (e.factorEscenario !== 1) {
    pasos.push({
      clave: "escenario",
      etiqueta: `Horas en el escenario ${e.nombreEscenario}`,
      valor: r2(e.horasEscenario),
      unidad: "horas",
      operacion: `${r2(e.horasModo)} × ${e.factorEscenario}`,
    });
  }

  pasos.push({
    clave: "semanas",
    etiqueta: "Semanas que va a tardar con este equipo",
    valor: r2(e.semanas),
    unidad: "semanas",
    operacion: `${r2(e.horasEscenario)} horas ÷ (${r2(e.capacidadSemanal)} horas a la semana × velocidad ${e.velocidadModo})`,
    nota: e.capacidadCalculadaDelEquipo
      ? `Las ${r2(e.capacidadSemanal)} horas salen del equipo capturado: ${e.personas} persona(s) por su disponibilidad × 40 horas.`
      : `Las ${r2(e.capacidadSemanal)} horas a la semana las escribió el usuario, no salen del equipo capturado.`,
  });

  pasos.push({
    clave: "meses",
    etiqueta: "Meses",
    valor: r2(e.meses),
    unidad: "meses",
    operacion: `${r2(e.semanas)} semanas ÷ 4.33`,
  });

  pasos.push({
    clave: "costo_mensual",
    etiqueta: "Lo que cuesta el equipo cada mes, con impuestos y cuotas",
    valor: r2(e.costoMensualEquipo),
    unidad: "pesos",
    operacion: `${e.personas} persona(s): sueldo + prestaciones de ley + IMSS + INFONAVIT + impuesto sobre nómina, según el tipo de contrato de cada una.`,
  });

  pasos.push({
    clave: "costo_directo",
    etiqueta: "Costo del proyecto",
    valor: r2(e.costoTotal),
    unidad: "pesos",
    operacion:
      e.liquidacionLFT > 0
        ? `${r2(e.costoMensualEquipo)} × ${r2(e.meses)} meses + ${r2(e.liquidacionLFT)} de liquidación (el proyecto pasa de 6 meses)`
        : `${r2(e.costoMensualEquipo)} × ${r2(e.meses)} meses`,
  });

  pasos.push({
    clave: "subtotal",
    etiqueta: `Precio sin IVA, con ${Math.round(e.margen * 100)}% de utilidad`,
    valor: r2(e.subtotal),
    unidad: "pesos",
    operacion: `${r2(e.costoTotal)} ÷ (1 − ${e.margen})`,
  });

  pasos.push({
    clave: "iva",
    etiqueta: `IVA ${Math.round(e.tasaIva * 100)}%`,
    valor: r2(e.iva),
    unidad: "pesos",
    operacion: `${r2(e.subtotal)} × ${e.tasaIva}`,
  });

  pasos.push({
    clave: "total",
    etiqueta: "Lo que se paga",
    valor: r2(e.total),
    unidad: "pesos",
    operacion: `${r2(e.subtotal)} + ${r2(e.iva)}`,
  });

  return pasos;
}
