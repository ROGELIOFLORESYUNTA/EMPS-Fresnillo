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
  /**
   * Personas que participan solo parte del proyecto (sus semanas asignadas son
   * menos que las del proyecto). Sin dato, o vacío, todas participan todo el proyecto.
   */
  participacionParcial?: { semanas: number }[];
  /**
   * Costo del equipo en todo el proyecto, cada persona por los meses que
   * participa. Solo hace falta cuando hay participación parcial; si no, el
   * equipo cuesta costoMensualEquipo × meses.
   */
  costoEquipoProyecto?: number;
  liquidacionLFT: number;
  /** Pericia del equipo con la IA y qué parte de la ganancia nominal del modo se acredita. */
  pericia?: {
    promedio: number;
    conDato: boolean;
    factor: number;
    aplica: boolean;
    eficienciaNominal: number;
    velocidadNominal: number;
  };
  /** Herramientas de IA (o plataforma de armado) del modo, al mes, en pesos sin IVA. */
  herramientas?: {
    asientos: number;
    usdPorAsiento: number;
    sobreconsumo: number;
    tipoCambio: number;
    /** Pesos al mes sin el aumento del escenario. */
    mensualMXN: number;
    descripcion: string;
    nivel?: string;
    asientosAlNivel?: number;
    asientosConPlanPropio?: number;
    usdPlanesPropios?: number;
    /** 1 salvo en el escenario conservador, donde prorratea el aumento anual de los planes. */
    factorAumento?: number;
    aumentoAnual?: number;
  };
  /** Otras herramientas (servidores, dominios) y administración capturadas, al mes. */
  otrosCostos?: {
    herramientasMensual: number;
    administracionMensual: number;
  };
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
// Los meses van a 3 decimales: con 2, rehacer la cuenta a mano se desvia
// hasta doscientos pesos en los proyectos cortos.
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** "8 semanas", "1 semana". */
const semanasEnTexto = (n: number) => `${r2(n)} ${r2(n) === 1 ? "semana" : "semanas"}`;

/** Une una lista en español: "a", "a y b", "a, b y c". */
function unirConY(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

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

  const periciaAplica = !!e.pericia && e.pericia.aplica;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  pasos.push({
    clave: "modo",
    etiqueta: `Horas con la forma de hacerlo elegida (${e.nombreModo})`,
    valor: r2(e.horasModo),
    unidad: "horas",
    operacion:
      e.eficienciaModo === 1
        ? periciaAplica
          ? `${r2(e.horasTrasReparto)} × 1: con la pericia actual del equipo (${r2(e.pericia!.promedio)} de 5) no se acredita ahorro.`
          : "Esta forma de hacerlo no ahorra horas de trabajo."
        : periciaAplica
          ? `${r2(e.horasTrasReparto)} × ${e.eficienciaModo} (ahorro nominal ${pct(1 - e.pericia!.eficienciaNominal)}; con pericia ${r2(e.pericia!.promedio)} de 5 se acredita ${pct(e.pericia!.factor)}: ahorro efectivo ${pct(1 - e.eficienciaModo)})`
          : `${r2(e.horasTrasReparto)} × ${e.eficienciaModo} (esta forma ahorra ${Math.round((1 - e.eficienciaModo) * 100)}% del trabajo)`,
    nota:
      periciaAplica && !e.pericia!.conDato
        ? "No se capturó qué tanto usa la IA el equipo; se asume 3 de 5 (la usa en algunos proyectos). Captúralo en Equipo."
        : undefined,
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
    operacion: `${r2(e.horasEscenario)} horas ÷ (${r2(e.capacidadSemanal)} horas a la semana × velocidad ${e.velocidadModo})${
      periciaAplica && e.pericia!.factor !== 1 ? ` (velocidad nominal ${e.pericia!.velocidadNominal}, ajustada por la pericia del equipo con la IA)` : ""
    }`,
    nota: e.capacidadCalculadaDelEquipo
      ? `Las ${r2(e.capacidadSemanal)} horas salen del equipo capturado: ${e.personas} persona(s) por su disponibilidad × 40 horas.`
      : `Las ${r2(e.capacidadSemanal)} horas a la semana las escribió el usuario, no salen del equipo capturado.`,
  });

  pasos.push({
    clave: "meses",
    etiqueta: "Meses",
    valor: r3(e.meses),
    unidad: "meses",
    operacion: `${r2(e.semanas)} semanas ÷ 4.33`,
  });

  const parciales = e.participacionParcial ?? [];
  const lista = unirConY(parciales.map((p) => semanasEnTexto(p.semanas)));
  pasos.push({
    clave: "costo_mensual",
    etiqueta: "Lo que cuesta el equipo cada mes, con impuestos y cuotas",
    valor: r2(e.costoMensualEquipo),
    unidad: "pesos",
    operacion: `${e.personas} persona(s): sueldo + prestaciones de ley + IMSS + INFONAVIT + impuesto sobre nómina, según el tipo de contrato de cada una.`,
    nota:
      parciales.length === 0
        ? undefined
        : parciales.length === 1
          ? `1 persona participa solo parte del proyecto: ${lista}. Este renglón es el mes con todo el equipo; a esa persona solo se le cuenta el tiempo que participa.`
          : `${parciales.length} persona(s) participan solo parte del proyecto: ${lista}. Este renglón es el mes con todo el equipo; a esas personas solo se les cuenta el tiempo que participan.`,
  });

  const factorAumento = e.herramientas?.factorAumento ?? 1;
  const herramientasMes = (e.herramientas?.mensualMXN ?? 0) * factorAumento;
  if (e.herramientas && herramientasMes > 0) {
    const h = e.herramientas;
    const alNivel = h.asientosAlNivel ?? h.asientos;
    const propios = h.asientosConPlanPropio ?? 0;
    const partes: string[] = [];
    if (alNivel > 0) partes.push(`${alNivel} asiento(s) al nivel ${h.nivel ?? "típico"} × ${h.usdPorAsiento} USD`);
    if (propios > 0) partes.push(`${propios} con plan propio (${r2(h.usdPlanesPropios ?? 0)} USD entre todos)`);
    const aumento = factorAumento > 1 ? ` × ${factorAumento} (planes ${Math.round((h.aumentoAnual ?? 0) * 100)}% más caros al año, prorrateado: solo en este escenario)` : "";
    pasos.push({
      clave: "herramientas",
      etiqueta: "Herramientas de IA del equipo, al mes",
      valor: r2(herramientasMes),
      unidad: "pesos",
      operacion: `(${partes.join(" + ")}) × ${r2(1 + h.sobreconsumo)} de sobreconsumo × ${h.tipoCambio} pesos por dólar${aumento}`,
      nota: `Se cobra por persona, no por equipo. Sin IVA: es acreditable si la plataforma está inscrita en el SAT.${h.descripcion ? ` Canasta típica: ${h.descripcion}` : ""}`,
    });
  }

  const otrosMes = (e.otrosCostos?.herramientasMensual ?? 0) + (e.otrosCostos?.administracionMensual ?? 0);
  if (e.otrosCostos && otrosMes > 0) {
    pasos.push({
      clave: "otros_costos",
      etiqueta: "Otras herramientas y administración, al mes",
      valor: r2(otrosMes),
      unidad: "pesos",
      operacion: `servidores y otras herramientas ${r2(e.otrosCostos.herramientasMensual)} + administración ${r2(e.otrosCostos.administracionMensual)}`,
    });
  }

  const sumandosMes: string[] = [r2(e.costoMensualEquipo).toString()];
  if (herramientasMes > 0) sumandosMes.push(r2(herramientasMes).toString());
  if (otrosMes > 0) sumandosMes.push(r2(otrosMes).toString());
  const mensual = sumandosMes.length > 1 ? `(${sumandosMes.join(" + ")})` : sumandosMes[0];
  // Con personas que participan solo parte del proyecto, el equipo ya no es
  // "un mes × los meses": se suma lo de cada una por sus meses, y lo demás
  // (herramientas, otros costos) sigue yendo por los meses del proyecto.
  const extrasMes = herramientasMes + otrosMes;
  const base =
    parciales.length > 0 && e.costoEquipoProyecto !== undefined
      ? `${r2(e.costoEquipoProyecto)} del equipo (cada persona por los meses que participa)` +
        (extrasMes > 0 ? ` + ${r2(extrasMes)} de herramientas y otros costos al mes × ${r3(e.meses)} meses` : "")
      : `${mensual} × ${r3(e.meses)} meses`;
  pasos.push({
    clave: "costo_directo",
    etiqueta: "Costo del proyecto",
    valor: r2(e.costoTotal),
    unidad: "pesos",
    operacion:
      e.liquidacionLFT > 0
        ? `${base} + ${r2(e.liquidacionLFT)} de liquidación (el proyecto pasa de 6 meses)`
        : base,
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
    nota: "Cada renglón se muestra redondeado; si rehaces la cuenta con calculadora puede darte unos pesos de diferencia (menos de uno por cada mil).",
  });

  return pasos;
}
