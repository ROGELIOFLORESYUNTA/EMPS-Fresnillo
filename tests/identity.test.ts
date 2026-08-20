import { describe, it, expect } from "vitest";
import { normalizarNombre, normalizarCorreo } from "@/lib/identity";
import { ROLES, ROLES_VALIDOS, etiquetaDeRol } from "@/lib/roles";

describe("normalizarNombre", () => {
  it("limpia espacios sobrantes", () => {
    expect(normalizarNombre("  María   Hernández  ")).toBe("María Hernández");
  });

  it("rechaza lo que no alcanza a identificar a nadie", () => {
    expect(normalizarNombre("")).toBe(false);
    expect(normalizarNombre("   ")).toBe(false);
    expect(normalizarNombre("a")).toBe(false);
  });

  it("recorta nombres larguísimos en vez de rechazarlos", () => {
    const largo = normalizarNombre("x".repeat(200));
    expect(largo).toBe("x".repeat(80));
  });
});

describe("normalizarCorreo", () => {
  it("es opcional: vacío no es error", () => {
    expect(normalizarCorreo("")).toBeNull();
    expect(normalizarCorreo("   ")).toBeNull();
  });

  it("acepta y normaliza a minúsculas", () => {
    expect(normalizarCorreo("  Maria@Fresnillo.Gob.MX ")).toBe("maria@fresnillo.gob.mx");
  });

  it("atrapa dedazos comunes", () => {
    expect(normalizarCorreo("maria")).toBe(false);
    expect(normalizarCorreo("maria@")).toBe(false);
    expect(normalizarCorreo("maria@fresnillo")).toBe(false);
    expect(normalizarCorreo("maria @fresnillo.gob.mx")).toBe(false);
  });
});

describe("roles", () => {
  it("el motor de recomendación reconoce los dos lados de la mesa", () => {
    expect(ROLES_VALIDOS.has("operador_municipal")).toBe(true);
    expect(ROLES_VALIDOS.has("proveedor")).toBe(true);
  });

  it("cada rol trae texto corto para el alta y largo para la cuenta", () => {
    for (const r of ROLES) {
      expect(r.short.length).toBeGreaterThan(0);
      expect(r.label.length).toBeGreaterThan(0);
    }
  });

  it("etiquetaDeRol tolera nulos", () => {
    expect(etiquetaDeRol(null)).toBeNull();
    expect(etiquetaDeRol("proveedor")).toContain("proveedor");
  });
});
