// zod/v4 (incluido en zod 3.25) porque es lo que espera zodOutputFormat del
// SDK. El resto del proyecto sigue en la version 3; conviven sin problema.
import * as z from "zod/v4";

/**
 * Vocabulario cerrado del observatorio de comentarios.
 *
 * Vive aparte porque lo usan cuatro lugares que tienen que decir lo mismo: el
 * prompt que analiza cada comentario, el esquema de salida estructurada que lo
 * valida, la pantalla que lo muestra y la prueba automatica.
 *
 * Las causas se eligieron para que coincidan con lo que el motor de estimacion
 * ya modela (claridad, cambios, integraciones, flujo de efectivo,
 * mantenimiento). Asi lo que la gente nombra en sus testimonios se puede
 * comparar contra lo que el sistema pregunta.
 */

export const CAUSAS = [
  "cambios_de_alcance",
  "requisitos_poco_claros",
  "cliente_no_disponible",
  "subestimacion_inicial",
  "problemas_tecnicos",
  "integraciones",
  "mantenimiento_no_contemplado",
  "pagos_o_flujo_de_efectivo",
  "rotacion_del_equipo",
  "otro",
] as const;
export type Causa = (typeof CAUSAS)[number];

export const CAUSA_ETIQUETA: Record<Causa, string> = {
  cambios_de_alcance: "El cliente pidió cambios a medio camino",
  requisitos_poco_claros: "No estaba claro qué había que hacer",
  cliente_no_disponible: "El cliente no aparecía para resolver dudas",
  subestimacion_inicial: "Se calculó de menos desde el principio",
  problemas_tecnicos: "Se atoraron en algo técnico",
  integraciones: "Conectar con otros sistemas costó más de lo previsto",
  mantenimiento_no_contemplado: "Nadie cotizó el mantenimiento posterior",
  pagos_o_flujo_de_efectivo: "Problemas de cobro o de aguantar sin cobrar",
  rotacion_del_equipo: "Se fue gente del equipo",
  otro: "Otra causa",
};

/** Qué factor del motor toca cada causa. Sirve para cerrar el círculo: si una
 *  causa se repite mucho y el motor no la modela, ahí hay algo que agregar. */
export const CAUSA_FACTOR_DEL_MOTOR: Record<Causa, string | null> = {
  cambios_de_alcance: "Control de cambios",
  requisitos_poco_claros: "Claridad del requerimiento",
  cliente_no_disponible: null,
  subestimacion_inicial: "Escenario conservador",
  problemas_tecnicos: "Complejidad del módulo",
  integraciones: "Número de integraciones",
  mantenimiento_no_contemplado: "Costo de mantenimiento",
  pagos_o_flujo_de_efectivo: "Flujo de efectivo",
  rotacion_del_equipo: null,
  otro: null,
};

export const QUIEN_HABLA = ["empleado", "freelance", "dueno", "cliente", "desconocido"] as const;
export type QuienHabla = (typeof QUIEN_HABLA)[number];

export const QUIEN_HABLA_ETIQUETA: Record<QuienHabla, string> = {
  empleado: "Trabaja para alguien más",
  freelance: "Trabaja por su cuenta",
  dueno: "Dueño de la empresa que desarrolla",
  cliente: "Le hicieron el sistema",
  desconocido: "No se sabe",
};

export const DESVIACION = ["mas", "igual", "menos", "no_dice"] as const;
export type Desviacion = (typeof DESVIACION)[number];

export const DESVIACION_ETIQUETA: Record<Desviacion, string> = {
  mas: "Costó o tardó más de lo estimado",
  igual: "Salió como se había estimado",
  menos: "Costó o tardó menos",
  no_dice: "No lo menciona",
};

export const CONFIANZA = ["alta", "media", "baja"] as const;
export type Confianza = (typeof CONFIANZA)[number];

/**
 * Lo que devuelve el modelo por cada comentario.
 *
 * Se declara con zod porque es lo que el SDK convierte a esquema de salida
 * estructurada (zodOutputFormat), y porque el resto del proyecto ya valida
 * con zod. La validacion ocurre del lado de la API: el modelo no puede
 * devolver un campo fuera de estas listas.
 */
export const analisisSchema = z.object({
  esTestimonio: z
    .boolean()
    .describe(
      "true SOLO si quien escribe cuenta una experiencia propia y concreta con un proyecto de software. Una opinion, una pregunta, una broma, un consejo general o publicidad es false.",
    ),
  quienHabla: z.enum(QUIEN_HABLA),
  duracionDeclaradaMeses: z
    .number()
    .nullable()
    .describe("Duracion que la persona declara, convertida a meses. null si no la dice."),
  montoDeclarado: z
    .number()
    .nullable()
    .describe("Cantidad de dinero que declara, como numero. null si no la dice."),
  moneda: z.string().nullable().describe("MXN, USD, EUR... null si no se sabe."),
  tamanoEquipo: z.number().int().nullable(),
  desviacion: z.enum(DESVIACION),
  desviacionPct: z
    .number()
    .nullable()
    .describe("Solo si la persona da datos suficientes para calcularlo. 50 significa 50% mas."),
  causas: z.array(z.enum(CAUSAS)),
  confianza: z
    .enum(CONFIANZA)
    .describe("baja cuando estas deduciendo en vez de leer el dato tal cual."),
  citas: z
    .record(z.string(), z.string())
    .describe(
      "Por cada campo con dato, la frase textual del comentario de donde salio. La clave es el nombre del campo.",
    ),
  razonamiento: z.string().describe("Dos o tres lineas explicando como llegaste a lo anterior."),
});

export type AnalisisComentario = z.infer<typeof analisisSchema>;

export const PROMPT_SISTEMA = `Analizas comentarios públicos de internet para una investigación sobre estimación de proyectos de software.

Tu trabajo es leer UN comentario y extraer únicamente lo que la persona realmente dijo sobre un proyecto de software que ella vivió.

Reglas que no se rompen:

1. Si el comentario no cuenta una experiencia propia y concreta con un proyecto de software, marca esTestimonio en false y deja todo lo demás vacío. Opiniones, preguntas, bromas, consejos generales y publicidad NO son testimonios.
2. Nunca inventes un número que no esté en el texto. Si no lo dice, va null.
3. Cada dato que extraigas debe venir acompañado de la frase textual del comentario de donde lo sacaste, en el campo citas. Si no puedes citar la frase, entonces el dato no está y va null.
4. Si estás deduciendo en lugar de leer el dato tal cual, la confianza es baja.
5. Convierte las duraciones a meses (dos semanas = 0.5, un año y medio = 18).
6. En causas, elige solo las que la persona menciona o describe. Si no habla de por qué salió mal, deja la lista vacía. No elijas "otro" para rellenar.
7. El comentario puede estar en cualquier idioma. Responde siempre con las claves del esquema, que están en español.

Estas son las causas y lo que significa cada una:
${CAUSAS.map((c) => `- ${c}: ${CAUSA_ETIQUETA[c]}`).join("\n")}

Y así se clasifica a quien escribe:
${QUIEN_HABLA.map((q) => `- ${q}: ${QUIEN_HABLA_ETIQUETA[q]}`).join("\n")}`;
