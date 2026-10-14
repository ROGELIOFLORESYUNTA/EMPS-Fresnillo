import { describe, it, expect } from "vitest";
import { REPORTES, reportePermitido, reportesDelIndice } from "@/lib/reportes";

describe("reportes por lado (lib/reportes.ts)", () => {
  it("el desarrollador abre el reporte del proveedor y no el del Ayuntamiento", () => {
    expect(reportePermitido("provider", "desarrollador", false)).toBe(true);
    expect(reportePermitido("municipal", "desarrollador", false)).toBe(false);
  });

  it("el Ayuntamiento abre el suyo y no ve la nómina ni la utilidad del proveedor", () => {
    expect(reportePermitido("municipal", "ayuntamiento", false)).toBe(true);
    expect(reportePermitido("provider", "ayuntamiento", false)).toBe(false);
  });

  it("el reporte académico solo con sesión de investigador, en cualquiera de las dos caras", () => {
    for (const lado of ["desarrollador", "ayuntamiento"] as const) {
      expect(reportePermitido("research", lado, false), lado).toBe(false);
      expect(reportePermitido("research", lado, true), lado).toBe(true);
    }
  });

  it("la cotización para el cliente todavía no se puede abrir: sigue en preparación", () => {
    expect(REPORTES.cotizacion.disponible).toBe(false);
    expect(reportePermitido("cotizacion", "desarrollador", true)).toBe(false);
  });

  it("un tipo inventado o con nombre de propiedad de objeto contesta que no", () => {
    for (const tipo of ["", "no-existe", "constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(reportePermitido(tipo, "desarrollador", true), tipo).toBe(false);
      expect(reportePermitido(tipo, "ayuntamiento", true), tipo).toBe(false);
    }
  });

  it("el índice del desarrollador trae el de viabilidad y la cotización en preparación", () => {
    const indice = reportesDelIndice("desarrollador");
    expect(indice.map((r) => r.key)).toEqual(["provider", "cotizacion"]);
    expect(indice.map((r) => r.disponible)).toEqual([true, false]);
  });

  it("el índice del Ayuntamiento trae solo el suyo y ningún índice muestra el académico", () => {
    expect(reportesDelIndice("ayuntamiento").map((r) => r.key)).toEqual(["municipal"]);
    for (const lado of ["desarrollador", "ayuntamiento"] as const) {
      expect(reportesDelIndice(lado).some((r) => r.key === "research"), lado).toBe(false);
    }
  });
});
