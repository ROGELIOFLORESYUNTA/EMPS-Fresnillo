/**
 * Colores de las gráficas del resultado.
 *
 * Todos salen del azul marino de la marca (#0F2B4C) y de su azul de acción;
 * el único color de atención es el ámbar, y se reserva para lo que hay que
 * mirar (el peor mes del flujo, lo que se pasa del presupuesto).
 *
 * La rampa de la composición del precio (equipo, herramientas de IA, otros
 * gastos, utilidad, IVA) es un solo tono que va de oscuro a claro y se validó
 * como rampa ordinal con scripts/validate_palette.js del skill de dataviz:
 * luminosidad que sube en cada paso (diferencia mínima 0.06) y el paso más
 * claro con 2.07:1 contra el blanco. El texto dentro de cada pedazo es blanco
 * o tinta según el fondo, con contraste de 5:1 o más.
 */
export const RAMPA_COMPOSICION = {
  equipo: { fondo: "#0F2B4C", texto: "#FFFFFF" },
  ia: { fondo: "#264B7A", texto: "#FFFFFF" },
  otros: { fondo: "#3D6DAA", texto: "#FFFFFF" },
  utilidad: { fondo: "#5D91D4", texto: "#0B1F3A" },
  iva: { fondo: "#8BB7F0", texto: "#0B1F3A" },
} as const;

export const COLORES_FORMAS = {
  /** Carril donde se dibuja cada forma. */
  carril: "#EEF3F9",
  /** Banda de optimista a conservador. */
  banda: "#B4CCEA",
  /** Marca del escenario que se ve. */
  marca: "#0F2B4C",
  /** Lo mismo, en una forma descartada. */
  bandaSilenciada: "#DCE3EC",
  marcaSilenciada: "#7A8799",
} as const;

export const COLORES_FLUJO = {
  /** Cobros al cliente (hacia arriba). */
  cobro: "#3D6DAA",
  /** Gastos del proyecto (hacia abajo). */
  gasto: "#9DAEC5",
  /** Línea del saldo acumulado. */
  saldo: "#0F2B4C",
  /** El peor mes: marca, texto y fondo suave. */
  atencion: "#B45309",
  atencionTexto: "#92400E",
  atencionFondo: "#FEF3C7",
} as const;
