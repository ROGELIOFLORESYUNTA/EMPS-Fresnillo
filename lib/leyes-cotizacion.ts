/**
 * Las leyes que conviene tener a la mano al cotizar un sistema.
 *
 * No son valores del cálculo (esos viven en la tabla Parameter y salen en
 * /fuentes con su fuente): son los artículos que respaldan cosas que una
 * cotización dice o promete, como cobrar honorarios, dejar fijo el precio,
 * de quién es el código o cuándo se cierra un trato por correo. Cada artículo
 * lleva una frase llana de lo que significa para una cotización, escrita
 * después de leer el texto vigente en el sitio de la Cámara de Diputados.
 *
 * Archivo de datos puros (sin Node ni Prisma), para poder probarlo.
 */

export type ClaveDeLey = "CCF" | "LFDA" | "LFPC" | "CCom" | "LAASSP";

export interface ArticuloDeLey {
  /** Como se cita: "2613", "83 bis". */
  articulo: string;
  /** Qué significa para una cotización, en una frase. */
  significa: string;
}

export interface LeyDeLaCotizacion {
  clave: ClaveDeLey;
  nombre: string;
  /** PDF oficial en el sitio de la Cámara de Diputados. */
  url: string;
  articulos: ArticuloDeLey[];
}

/** Dirección del PDF vigente de una ley en el sitio de la Cámara de Diputados. */
export const urlDeLey = (clave: ClaveDeLey) => `https://www.diputados.gob.mx/LeyesBiblio/pdf/${clave}.pdf`;

export const LEYES_DE_LA_COTIZACION: readonly LeyDeLaCotizacion[] = [
  {
    clave: "CCF",
    nombre: "Código Civil Federal",
    url: urlDeLey("CCF"),
    articulos: [
      { articulo: "2613", significa: "Cobras tus honorarios aunque el resultado no sea el que esperaban, salvo que pacten otra cosa." },
      { articulo: "2615", significa: "Respondes ante tu cliente por negligencia, impericia o dolo, no por cualquier resultado que no dependía de ti." },
      { articulo: "2626", significa: "Si cierras un precio fijo, no puedes pedir un aumento después, aunque suban los costos." },
      { articulo: "2627", significa: "Lo mismo si el cliente cambia el diseño: solo lo cobras si lo autoriza por escrito y con su precio." },
    ],
  },
  {
    clave: "LFDA",
    nombre: "Ley Federal del Derecho de Autor",
    url: urlDeLey("LFDA"),
    articulos: [
      { articulo: "30", significa: "Quien hace el código puede ceder sus derechos o dar licencias de uso, exclusivas o no: di cuál das en la cotización." },
      { articulo: "31", significa: "Si cedes los derechos, el contrato debe fijar tu pago o una participación en los ingresos; no puedes renunciar a eso." },
      { articulo: "83", significa: "Si no pactan otra cosa, quien encarga una obra y la paga se queda con los derechos patrimoniales." },
      { articulo: "83 bis", significa: "Solo habla de obras musicales, donde quien participa, pagado, tiene derecho a regalías; no cubre el software." },
      { articulo: "103", significa: "El programa hecho por un empleado en su trabajo es de su patrón, salvo pacto; si trabajas por tu cuenta, deja escrito de quién es el código." },
    ],
  },
  {
    clave: "LFPC",
    nombre: "Ley Federal de Protección al Consumidor",
    url: urlDeLey("LFPC"),
    articulos: [
      { articulo: "59", significa: "Si tu cliente es consumidor final, el presupuesto va por escrito antes de empezar, con su costo y cuánto tiempo vale." },
      { articulo: "62", significa: "Das factura o comprobante de lo que hiciste, con su precio y la garantía que ofrezcas." },
    ],
  },
  {
    clave: "CCom",
    nombre: "Código de Comercio",
    url: urlDeLey("CCom"),
    articulos: [
      { articulo: "78", significa: "Entre comerciantes, quedas obligado en los términos que aceptaste, sin que importen las formalidades: lo que cotizas obliga." },
      { articulo: "80", significa: "Si tu cliente acepta por correo o por internet, el trato queda cerrado desde que recibes su aceptación." },
      { articulo: "83", significa: "Si no pactan fecha de pago, la deuda se puede exigir a los diez días: fija fechas en la cotización." },
      { articulo: "93", significa: "Un mensaje de datos, como un PDF por correo, cumple cuando la ley pide forma escrita si se guarda íntegro y se puede consultar." },
      { articulo: "362", significa: "Si te pagan tarde, corre interés desde el día siguiente al vencimiento: el que pactaron o, si no hay, 6 % anual." },
    ],
  },
  {
    clave: "LAASSP",
    nombre: "Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público",
    url: urlDeLey("LAASSP"),
    articulos: [
      { articulo: "74", significa: "Si le vendes al gobierno, el contrato solo se puede ampliar hasta 20 % y al mismo precio; no se cambian precios ni anticipos." },
      { articulo: "75", significa: "Si le vendes al gobierno, te penalizan por atraso y respondes por defectos y vicios ocultos." },
    ],
  },
] as const;

/** Cuántos artículos hay en total, para el conteo del grupo. */
export const TOTAL_DE_ARTICULOS = LEYES_DE_LA_COTIZACION.reduce((n, l) => n + l.articulos.length, 0);
