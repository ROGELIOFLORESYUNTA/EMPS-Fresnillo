import { describe, it, expect } from "vitest";
import { hostSinPuerto, hostsAyuntamiento, ladoDelProyecto, ladoDesdeHost, ladoPorOmision, rolDeLado } from "@/lib/lado";

const sinEntorno = {};

describe("lado por host: la misma persona no ve los dos lados", () => {
  it("el host de producción del desarrollador cae en desarrollador", () => {
    expect(ladoDesdeHost("estimacion.hazlatarea.com", sinEntorno)).toBe("desarrollador");
  });
  it("el subdominio de ayuntamientos cae en ayuntamiento, con o sin puerto y sin importar mayúsculas", () => {
    expect(ladoDesdeHost("ayuntamientos.hazlatarea.com", sinEntorno)).toBe("ayuntamiento");
    expect(ladoDesdeHost("Ayuntamientos.Hazlatarea.com:443", sinEntorno)).toBe("ayuntamiento");
    expect(ladoDesdeHost("ayuntamientos.localhost:3003", sinEntorno)).toBe("ayuntamiento");
  });
  it("sin host (llamadas internas de RosbeCloud a 127.0.0.1) cae en desarrollador", () => {
    expect(ladoDesdeHost(null, sinEntorno)).toBe("desarrollador");
    expect(ladoDesdeHost("", sinEntorno)).toBe("desarrollador");
    expect(ladoDesdeHost("127.0.0.1:4001", sinEntorno)).toBe("desarrollador");
    expect(ladoDesdeHost("localhost:3003", sinEntorno)).toBe("desarrollador");
  });
  it("la lista de hosts y el lado por omisión se pueden cambiar por variables de entorno", () => {
    const env = { HOSTS_AYUNTAMIENTO: "muni.ejemplo.mx, otro.ejemplo.mx", LADO_POR_OMISION: "ayuntamiento" };
    expect([...hostsAyuntamiento(env)]).toEqual(["muni.ejemplo.mx", "otro.ejemplo.mx"]);
    expect(ladoDesdeHost("muni.ejemplo.mx", env)).toBe("ayuntamiento");
    expect(ladoDesdeHost("ayuntamientos.hazlatarea.com", env)).toBe("ayuntamiento"); // por omisión del entorno
    expect(ladoDesdeHost("estimacion.hazlatarea.com", env)).toBe("ayuntamiento");
    expect(ladoPorOmision({ LADO_POR_OMISION: "cualquier cosa" })).toBe("desarrollador");
  });
  it("quita el puerto y los corchetes de IPv6", () => {
    expect(hostSinPuerto("[::1]:3003")).toBe("::1");
    expect(hostSinPuerto("Ejemplo.MX:8080")).toBe("ejemplo.mx");
    expect(hostSinPuerto(undefined)).toBe("");
  });
  it("el lado implica el rol y los proyectos viejos son de ayuntamiento", () => {
    expect(rolDeLado("desarrollador")).toBe("proveedor");
    expect(rolDeLado("ayuntamiento")).toBe("operador_municipal");
    expect(ladoDelProyecto(null)).toBe("ayuntamiento");
    expect(ladoDelProyecto("desarrollador")).toBe("desarrollador");
    expect(ladoDelProyecto("lo que sea")).toBe("ayuntamiento");
  });
});
