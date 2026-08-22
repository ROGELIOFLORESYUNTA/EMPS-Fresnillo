/**
 * Pruebas del observatorio de comentarios.
 *
 * La más importante es la última: el observatorio NO puede alimentar la
 * validación de la hipótesis. Son testimonios sin verificar, con sesgo de
 * autoselección. Si algún día alguien conecta las dos cosas, esta prueba se
 * pone en rojo antes de que un número inventado llegue a la tesis.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAUSAS,
  CAUSA_ETIQUETA,
  CAUSA_FACTOR_DEL_MOTOR,
  QUIEN_HABLA,
  QUIEN_HABLA_ETIQUETA,
  DESVIACION,
  DESVIACION_ETIQUETA,
  CONFIANZA,
  analisisSchema,
  PROMPT_SISTEMA,
} from "@/lib/observatorio/taxonomia";
import { fechaExpiracionCrudo, DIAS_RETENCION_CRUDO } from "@/lib/observatorio/youtube";
import { costoEstimado } from "@/lib/observatorio/analisis";

describe("taxonomía", () => {
  it("cada causa tiene su explicación en lenguaje llano", () => {
    for (const c of CAUSAS) {
      expect(CAUSA_ETIQUETA[c]).toBeTruthy();
      // "otro" es cajón de sastre y no necesita explicación; el resto sí.
      if (c !== "otro") expect(CAUSA_ETIQUETA[c].length).toBeGreaterThan(20);
    }
  });

  it("cada quien-habla y cada desviación tienen etiqueta", () => {
    for (const q of QUIEN_HABLA) expect(QUIEN_HABLA_ETIQUETA[q]).toBeTruthy();
    for (const d of DESVIACION) expect(DESVIACION_ETIQUETA[d]).toBeTruthy();
  });

  it("las causas que el motor ya modela apuntan a un factor real", () => {
    expect(CAUSA_FACTOR_DEL_MOTOR.cambios_de_alcance).toBe("Control de cambios");
    expect(CAUSA_FACTOR_DEL_MOTOR.requisitos_poco_claros).toBe("Claridad del requerimiento");
    expect(CAUSA_FACTOR_DEL_MOTOR.integraciones).toBe("Número de integraciones");
    // Estas dos no las modela nadie todavía: si algún día se modelan, aquí se nota.
    expect(CAUSA_FACTOR_DEL_MOTOR.cliente_no_disponible).toBeNull();
    expect(CAUSA_FACTOR_DEL_MOTOR.rotacion_del_equipo).toBeNull();
  });

  it("el prompt le dice al modelo las reglas que no se rompen", () => {
    expect(PROMPT_SISTEMA).toContain("Nunca inventes un número");
    expect(PROMPT_SISTEMA).toContain("frase textual");
    // La taxonomía completa tiene que ir dentro del prompt, no solo en el esquema.
    for (const c of CAUSAS) expect(PROMPT_SISTEMA).toContain(c);
  });
});

describe("esquema de salida", () => {
  const valido = {
    esTestimonio: true,
    quienHabla: "freelance",
    duracionDeclaradaMeses: 6,
    montoDeclarado: 80000,
    moneda: "MXN",
    tamanoEquipo: 2,
    desviacion: "mas",
    desviacionPct: 50,
    causas: ["cambios_de_alcance", "requisitos_poco_claros"],
    confianza: "alta",
    citas: { duracionDeclaradaMeses: "nos llevó 6 meses", montoDeclarado: "cobramos 80 mil" },
    razonamiento: "La persona dice cuánto tardó y cuánto cobró, y menciona cambios del cliente.",
  };

  it("acepta un análisis bien formado", () => {
    expect(analisisSchema.safeParse(valido).success).toBe(true);
  });

  it("acepta un comentario que no es testimonio, con todo en nulo", () => {
    const r = analisisSchema.safeParse({
      ...valido,
      esTestimonio: false,
      quienHabla: "desconocido",
      duracionDeclaradaMeses: null,
      montoDeclarado: null,
      moneda: null,
      tamanoEquipo: null,
      desviacion: "no_dice",
      desviacionPct: null,
      causas: [],
      citas: {},
    });
    expect(r.success).toBe(true);
  });

  it("rechaza una causa que no está en la lista cerrada", () => {
    const r = analisisSchema.safeParse({ ...valido, causas: ["el_cliente_era_grosero"] });
    expect(r.success).toBe(false);
  });

  it("rechaza un valor inventado en quien habla", () => {
    expect(analisisSchema.safeParse({ ...valido, quienHabla: "gerente" }).success).toBe(false);
  });

  it("exige el razonamiento y las citas", () => {
    const sinRazonamiento: Record<string, unknown> = { ...valido };
    delete sinRazonamiento.razonamiento;
    expect(analisisSchema.safeParse(sinRazonamiento).success).toBe(false);
  });

  it("las tres confianzas son válidas", () => {
    for (const c of CONFIANZA) {
      expect(analisisSchema.safeParse({ ...valido, confianza: c }).success).toBe(true);
    }
  });
});

describe("retención del texto crudo", () => {
  it("expira a los 30 días, como exige la política de YouTube", () => {
    expect(DIAS_RETENCION_CRUDO).toBe(30);
    const desde = new Date("2026-01-01T00:00:00Z");
    const expira = fechaExpiracionCrudo(desde);
    const dias = (expira.getTime() - desde.getTime()) / (24 * 60 * 60 * 1000);
    expect(dias).toBe(30);
  });
});

describe("costo", () => {
  it("crece con la cantidad y se mantiene en el orden esperado", () => {
    const cien = costoEstimado(100);
    expect(cien).toBeGreaterThan(0);
    expect(costoEstimado(200)).toBeCloseTo(cien * 2, 6);
    // Cien comentarios deben costar centavos, no decenas de dólares.
    expect(cien).toBeLessThan(2);
  });
});

describe("aislamiento: el observatorio no toca la validación de la hipótesis", () => {
  const builder = readFileSync(join(process.cwd(), "lib/research/dataset-builder.ts"), "utf-8");

  it("el constructor del dataset no lee ninguna tabla del observatorio", () => {
    expect(builder).not.toContain("observatorioComentario");
    expect(builder).not.toContain("observatorioFuente");
    expect(builder).not.toContain("Observatorio");
  });

  it("el motor de análisis tampoco importa nada del observatorio", () => {
    const motor = readFileSync(join(process.cwd(), "lib/research/hypothesis-analysis.ts"), "utf-8");
    expect(motor).not.toContain("observatorio");
    expect(motor).not.toContain("Observatorio");
  });

  it("el dataset de investigación sigue saliendo de resultados reales capturados", () => {
    // Si esto cambia, hay que revisar de dónde están saliendo las filas.
    expect(builder).toContain("projectActualResult");
  });
});
