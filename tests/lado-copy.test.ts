import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { LADOS } from "@/lib/lado";
import { COPIA, type CopiaDeLado } from "@/lib/lado-copy";

const RAIZ = path.resolve(__dirname, "..");

/** Todos los textos de una cara, para revisarlos de un golpe. */
function textosDe(c: CopiaDeLado): string[] {
  return [c.marca, c.submarca ?? "", c.siglas, c.titulo, c.descripcion, c.pie, c.pieFuentes ?? "", c.ogAlt, c.etiquetaDeLado, ...c.menu.map((m) => m.label)];
}

describe("textos por lado (lib/lado-copy.ts)", () => {
  it("hay textos para las dos caras y los obligatorios no están vacíos", () => {
    for (const lado of LADOS) {
      const c = COPIA[lado];
      expect(c, lado).toBeDefined();
      for (const campo of ["marca", "siglas", "titulo", "descripcion", "pie", "ogImage", "ogAlt", "etiquetaDeLado"] as const) {
        expect(c[campo].trim().length, `${lado}.${campo}`).toBeGreaterThan(0);
      }
      expect(c.menu.length, `${lado}.menu`).toBeGreaterThan(0);
    }
  });

  it("la marca del desarrollador no es la del Ayuntamiento", () => {
    expect(COPIA.desarrollador.marca).toBe("Cotizador de software");
    expect(COPIA.ayuntamiento.marca).toBe("EMPS Fresnillo");
    expect(COPIA.desarrollador.titulo).not.toBe(COPIA.ayuntamiento.titulo);
  });

  it("el título cabe en la pestaña y en la vista previa (60 caracteres o menos; el nuevo, menos)", () => {
    for (const lado of LADOS) expect(COPIA[lado].titulo.length, lado).toBeLessThanOrEqual(60);
    expect(COPIA.desarrollador.titulo.length).toBeLessThan(60);
  });

  it("el pie del desarrollador dice quién lo hizo y que los parámetros tienen fuente", () => {
    expect(COPIA.desarrollador.pie).toBe(
      "Hecho en la Universidad Autónoma de Zacatecas como parte de una tesis de Ingeniería de Software. Los parámetros tienen fuente y fecha.",
    );
    // El del Ayuntamiento conserva el texto de siempre, con el párrafo de los valores vigentes.
    expect(COPIA.ayuntamiento.pie).toContain("Estimador Municipal de Proyectos de Software");
    expect(COPIA.ayuntamiento.pieFuentes).toContain("Diario Oficial de la Federación");
  });

  it("cada cara tiene su propia imagen de vista previa, PNG y dentro de /public", () => {
    const rutas = LADOS.map((l) => COPIA[l].ogImage);
    expect(new Set(rutas).size).toBe(LADOS.length);
    for (const ruta of rutas) {
      expect(ruta.startsWith("/"), ruta).toBe(true);
      expect(ruta.endsWith(".png"), ruta).toBe(true);
      expect(existsSync(path.join(RAIZ, "public", ruta)), `public${ruta}`).toBe(true);
    }
  });

  it("el menú del desarrollador es Cotizar, Mis proyectos, Fuentes y Cómo funciona", () => {
    expect(COPIA.desarrollador.menu.map((m) => m.label)).toEqual(["Cotizar", "Mis proyectos", "Fuentes", "Cómo funciona"]);
    expect(COPIA.desarrollador.menu.map((m) => m.href)).toEqual(["/cotizar", "/projects", "/fuentes", "/como-funciona"]);
    // La acción principal es una sola y es Cotizar.
    expect(COPIA.desarrollador.menu.filter((m) => m.principal).map((m) => m.label)).toEqual(["Cotizar"]);
  });

  it("el menú del Ayuntamiento no cambió", () => {
    expect(COPIA.ayuntamiento.menu.map((m) => m.label)).toEqual(["Inicio", "Mis proyectos", "Tutorial", "Glosario"]);
    expect(COPIA.ayuntamiento.menu.some((m) => m.principal)).toBe(false);
  });

  it("ningún texto lleva raya larga, emoji ni destellos", () => {
    // Las rayas se arman con su código de carácter para que este archivo tampoco las lleve.
    const rayas = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
    const emoji = /\p{Extended_Pictographic}/u;
    for (const lado of LADOS) {
      for (const t of textosDe(COPIA[lado])) {
        expect(rayas.some((r) => t.includes(r)) || emoji.test(t), `${lado}: ${t}`).toBe(false);
      }
    }
  });
});
