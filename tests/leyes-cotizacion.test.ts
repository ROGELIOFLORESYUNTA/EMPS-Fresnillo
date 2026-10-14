import { describe, it, expect } from "vitest";
import { LEYES_DE_LA_COTIZACION, TOTAL_DE_ARTICULOS, urlDeLey } from "@/lib/leyes-cotizacion";

describe("leyes de la cotización (lib/leyes-cotizacion.ts)", () => {
  const articulosDe = (clave: string) => LEYES_DE_LA_COTIZACION.find((l) => l.clave === clave)!.articulos.map((a) => a.articulo);

  it("están las cinco leyes y los artículos que se pidieron", () => {
    expect(LEYES_DE_LA_COTIZACION.map((l) => l.clave)).toEqual(["CCF", "LFDA", "LFPC", "CCom", "LAASSP"]);
    expect(articulosDe("CCF")).toEqual(["2613", "2615", "2626", "2627"]);
    expect(articulosDe("LFDA")).toEqual(["30", "31", "83", "83 bis", "103"]);
    expect(articulosDe("LFPC")).toEqual(["59", "62"]);
    expect(articulosDe("CCom")).toEqual(["78", "80", "83", "93", "362"]);
    expect(articulosDe("LAASSP")).toEqual(["74", "75"]);
    expect(TOTAL_DE_ARTICULOS).toBe(18);
  });

  it("cada ley apunta al PDF oficial de la Cámara de Diputados", () => {
    for (const l of LEYES_DE_LA_COTIZACION) {
      expect(l.url).toBe(`https://www.diputados.gob.mx/LeyesBiblio/pdf/${l.clave}.pdf`);
      expect(urlDeLey(l.clave)).toBe(l.url);
    }
  });

  it("cada artículo trae una sola frase llana, corta y sin jerga de abogado", () => {
    for (const l of LEYES_DE_LA_COTIZACION) {
      for (const a of l.articulos) {
        const frase = a.significa.trim();
        expect(frase.length, `${l.clave} ${a.articulo}`).toBeGreaterThan(20);
        // una sola oración: termina en punto y no hay otro punto en medio (salvo "6 %" y similares)
        expect(frase.endsWith("."), `${l.clave} ${a.articulo}`).toBe(true);
        expect(frase.slice(0, -1).includes(". "), `${l.clave} ${a.articulo}`).toBe(false);
        expect(frase.split(/\s+/).length, `${l.clave} ${a.articulo}`).toBeLessThanOrEqual(30);
        expect(frase, `${l.clave} ${a.articulo}`).not.toMatch(/—|–/);
      }
    }
  });
});
