/**
 * Cuánto tardan en llegar a una cifra.
 *
 * Nadie sabía cuánto tarda una persona en pasar de "creé el proyecto" a "ya
 * tengo un número", ni cuántos se quedan a medio camino. Esta función lo
 * saca de la bitácora que ya se guarda (project_created, estimate_run,
 * option_chosen, cotizacion_rapida). Es pura: recibe eventos planos y
 * devuelve medianas y conteos; no toca la base.
 */
export interface EventoPlano {
  eventType: string;
  payloadJson: string | null;
  createdAt: Date;
}

export interface ResumenTiempo {
  proyectos: number;
  medianaMinutosACifra: number | null;
}

export interface TiempoPrimeraCifra {
  proyectosCreados: number;
  conCifra: number;
  sinCifra: number;
  conEleccion: number;
  conCifraSinEleccion: number;
  medianaMinutosACifra: number | null;
  medianaMinutosAEleccion: number | null;
  rapida: ResumenTiempo & { medianaSegundosEnLlenar: number | null };
  completo: ResumenTiempo;
}

interface Rastro {
  creado: Date | null;
  primeraCifra: Date | null;
  primeraEleccion: Date | null;
  rapida: boolean;
  segundosEnLlenar: number | null;
}

export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const minutos = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60000;

export function tiempoPrimeraCifra(eventos: EventoPlano[]): TiempoPrimeraCifra {
  const rastros = new Map<string, Rastro>();
  const de = (id: string): Rastro => {
    let r = rastros.get(id);
    if (!r) {
      r = { creado: null, primeraCifra: null, primeraEleccion: null, rapida: false, segundosEnLlenar: null };
      rastros.set(id, r);
    }
    return r;
  };

  const ordenados = [...eventos].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const ev of ordenados) {
    let payload: Record<string, unknown> = {};
    try {
      payload = ev.payloadJson ? JSON.parse(ev.payloadJson) : {};
    } catch {
      continue;
    }
    const projectId = typeof payload.projectId === "string" ? payload.projectId : null;
    if (!projectId) continue;
    const r = de(projectId);
    switch (ev.eventType) {
      case "project_created":
        if (!r.creado) r.creado = ev.createdAt;
        if (payload.origen === "cotizacion_rapida") r.rapida = true;
        break;
      case "estimate_run":
        if (!r.primeraCifra) r.primeraCifra = ev.createdAt;
        break;
      case "option_chosen":
        if (!r.primeraEleccion) r.primeraEleccion = ev.createdAt;
        break;
      case "cotizacion_rapida":
        r.rapida = true;
        if (typeof payload.segundosEnLlenar === "number") r.segundosEnLlenar = payload.segundosEnLlenar;
        break;
    }
  }

  // Solo cuentan los proyectos de los que se vio nacer (tienen project_created).
  const creados = [...rastros.values()].filter((r) => r.creado);
  const conCifra = creados.filter((r) => r.primeraCifra && r.creado);
  const conEleccion = creados.filter((r) => r.primeraEleccion && r.creado);
  const aCifra = (rs: Rastro[]) => rs.map((r) => minutos(r.creado!, r.primeraCifra!));
  const rapida = conCifra.filter((r) => r.rapida);
  const completo = conCifra.filter((r) => !r.rapida);

  return {
    proyectosCreados: creados.length,
    conCifra: conCifra.length,
    sinCifra: creados.length - conCifra.length,
    conEleccion: conEleccion.length,
    conCifraSinEleccion: conCifra.filter((r) => !r.primeraEleccion).length,
    medianaMinutosACifra: mediana(aCifra(conCifra)),
    medianaMinutosAEleccion: mediana(conEleccion.map((r) => minutos(r.creado!, r.primeraEleccion!))),
    rapida: {
      proyectos: creados.filter((r) => r.rapida).length,
      medianaMinutosACifra: mediana(aCifra(rapida)),
      medianaSegundosEnLlenar: mediana(creados.filter((r) => r.rapida && r.segundosEnLlenar != null).map((r) => r.segundosEnLlenar!)),
    },
    completo: {
      proyectos: creados.filter((r) => !r.rapida).length,
      medianaMinutosACifra: mediana(aCifra(completo)),
    },
  };
}
