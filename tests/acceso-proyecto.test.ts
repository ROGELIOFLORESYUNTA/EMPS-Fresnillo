import { describe, it, expect } from "vitest";
import type { Prisma } from "@prisma/client";
import { filtroDeLado } from "@/lib/acceso-proyecto";
import { LADOS, ladoDelProyecto } from "@/lib/lado";

/**
 * Evalúa a mano el fragmento de Prisma contra lo guardado en Project.lado.
 * Solo cubre lo que usa filtroDeLado (igualdad y OR): así se prueba la regla
 * sin base de datos.
 */
function coincide(filtro: Prisma.ProjectWhereInput, ladoGuardado: string | null): boolean {
  if (filtro.OR) return filtro.OR.some((f) => coincide(f, ladoGuardado));
  return filtro.lado === ladoGuardado;
}

describe("filtroDeLado: cada lado solo ve sus proyectos", () => {
  it("ayuntamiento ve los suyos y los proyectos viejos, que no traen lado", () => {
    expect(filtroDeLado("ayuntamiento")).toEqual({ OR: [{ lado: "ayuntamiento" }, { lado: null }] });
  });

  it("desarrollador ve solo los marcados como desarrollador", () => {
    expect(filtroDeLado("desarrollador")).toEqual({ lado: "desarrollador" });
  });

  it("un proyecto se ve en un solo lado, el mismo que dice ladoDelProyecto", () => {
    for (const guardado of [null, "ayuntamiento", "desarrollador"]) {
      const ladosQueLoVen = LADOS.filter((lado) => coincide(filtroDeLado(lado), guardado));
      expect(ladosQueLoVen).toEqual([ladoDelProyecto(guardado)]);
    }
  });
});
