/**
 * Versiones de un parámetro.
 *
 * Un precio se vuelve a consultar y se guarda con otra fecha de vigencia: la
 * versión anterior se cierra (effectiveUntil) pero se conserva como historia.
 * Al calcular, de todas las versiones de una clave cuenta una sola. Función
 * pura: sin Prisma y sin Next.
 */

export interface VersionDeParametro {
  key: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

/**
 * Deja una sola versión por clave: la más nueva que ya empezó y no está
 * vencida. Si ninguna es aplicable hoy, la más nueva. Las claves con una sola
 * fila quedan igual, y el orden de las filas se conserva.
 */
export function unaVersionPorClave<T extends VersionDeParametro>(rows: T[], ahora: Date = new Date()): T[] {
  const aplicable = (r: T) => r.effectiveFrom <= ahora && (!r.effectiveUntil || r.effectiveUntil >= ahora);
  const elegida = new Map<string, T>();
  for (const r of rows) {
    const actual = elegida.get(r.key);
    if (!actual) {
      elegida.set(r.key, r);
      continue;
    }
    const mejor =
      aplicable(r) !== aplicable(actual)
        ? aplicable(r)
        : r.effectiveFrom.getTime() > actual.effectiveFrom.getTime();
    if (mejor) elegida.set(r.key, r);
  }
  return rows.filter((r) => elegida.get(r.key) === r);
}
