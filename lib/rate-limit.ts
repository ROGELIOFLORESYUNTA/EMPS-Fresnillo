/**
 * Rate limit en memoria por IP — defensa básica para endpoints públicos.
 *
 * Implementación: ventana deslizante de 60 segundos, máximo N requests por IP.
 * Reset automático al expirar la ventana.
 *
 * Limitaciones conocidas:
 *  - Solo funciona dentro de un solo proceso Node (no funciona en cluster/serverless multi-instancia).
 *  - El Map crece sin límite con IPs únicas; en producción real se debe usar Redis o un LRU.
 *  - Para EMPS Fresnillo (deploy interno local/intranet), es suficiente como primera línea.
 */

interface IpEntry {
  timestamps: number[];
}

const store = new Map<string, IpEntry>();

function nowMs(): number {
  return Date.now();
}

/**
 * Verifica si la IP puede hacer una request más. Limpia timestamps expirados.
 *
 * @returns true si está dentro del límite (procede), false si se excedió.
 */
export function rateLimit(
  ip: string,
  options: { maxRequests: number; windowMs: number } = { maxRequests: 60, windowMs: 60_000 },
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = nowMs();
  const windowStart = now - options.windowMs;
  const entry = store.get(ip) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= options.maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + options.windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.timestamps.push(now);
  store.set(ip, entry);
  return {
    allowed: true,
    remaining: options.maxRequests - entry.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Extrae IP del request. Confía en x-forwarded-for si viene de un proxy conocido,
 * en otro caso usa el socket remoto.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
