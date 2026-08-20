import { describe, it, expect } from "vitest";
import { valorLegible, fuenteLegible, nombreLegible, categorizar, ORDEN_CATEGORIAS, CATEGORIAS } from "@/lib/parameter-labels";

describe("valorLegible", () => {
  it("convierte fracciones a porcentaje, que es como se leen", () => {
    expect(valorLegible("0.16", "rate").valor).toBe("16%");
    expect(valorLegible("0.3", "rate").valor).toBe("30%");
  });

  it("no pierde dígitos en cuotas pequeñas del IMSS", () => {
    expect(valorLegible("0.00625", "rate").valor).toBe("0.625%");
  });

  it("los pesos salen como pesos", () => {
    expect(valorLegible("117.31", "MXN").valor).toContain("117.31");
    expect(valorLegible("117.31", "MXN").unidad).toBe("pesos");
  });

  it("las tablas no intentan mostrarse como número", () => {
    expect(valorLegible(null, "json").valor).toBe("tabla");
    expect(valorLegible("[1,2]", "table").valor).toBe("tabla");
  });

  it("singular y plural donde corresponde", () => {
    expect(valorLegible("1", "veces_UMA").unidad).toBe("vez la UMA");
    expect(valorLegible("25", "veces_UMA").unidad).toBe("veces la UMA");
  });
});

describe("fuenteLegible", () => {
  it("no muestra nombres de archivos internos como fundamento", () => {
    const r = fuenteLegible("EMPS Fresnillo v7 (31_seed_parametros_control_cambios_2026.json)");
    expect(r).not.toContain(".json");
    expect(r).toContain("Calibración propia");
  });

  it("respeta los fundamentos legales de verdad", () => {
    expect(fuenteLegible("LISR Artículo 9 (vigente 2026)")).toBe("LISR Artículo 9 (vigente 2026)");
  });
});

describe("nombreLegible", () => {
  it("traduce las claves que nadie entendería", () => {
    expect(nombreLegible("CHANGE_ARTIFACT_WEIGHTS")).not.toMatch(/Change|Artifact/);
    expect(nombreLegible("IMSS_EYM_ESPECIE_CUOTA_FIJA_PATRON")).toContain("Enfermedad y maternidad");
  });

  it("no truena con una clave que todavía no tiene nombre", () => {
    expect(nombreLegible("PARAMETRO_NUEVO_CUALQUIERA")).toBe("Parametro Nuevo Cualquiera");
  });
});

describe("orden y agrupación", () => {
  it("los impuestos federales van antes que la calibración propia", () => {
    expect(ORDEN_CATEGORIAS.indexOf("FED")).toBeLessThan(ORDEN_CATEGORIAS.indexOf("CHANGE"));
  });

  it("cada categoría del orden tiene su etiqueta", () => {
    for (const cat of ORDEN_CATEGORIAS) expect(CATEGORIAS[cat]).toBeTruthy();
  });

  it("el tope del SBC y los recursos no caen en Otros", () => {
    expect(categorizar("SBC_TOPE_UMA")).toBe("IMSS");
    expect(categorizar("RESOURCE_ADMIN_OVERHEAD_DEFAULT")).toBe("RECURSOS");
    expect(categorizar("DEPRECIACION_COMPUTO_ANUAL")).toBe("RECURSOS");
  });
});
