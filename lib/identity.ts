/**
 * Reglas de la identidad que se pide al crear el primer proyecto.
 *
 * No hay login: la persona se identifica con su nombre y con el lado de la
 * mesa desde el que va a usar el sistema. El correo es opcional y solo sirve
 * para regresarle su llave de acceso si la pierde.
 *
 * Estas funciones viven aparte para que el formulario del navegador y el
 * endpoint validen exactamente igual.
 */
export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 80;
export const CORREO_MAX = 120;

/**
 * Limpia el nombre. Devuelve `false` si quedó demasiado corto para servir
 * como identificación.
 */
export function normalizarNombre(raw: string): string | false {
  const nombre = raw.trim().replace(/\s+/g, " ").slice(0, NOMBRE_MAX);
  if (nombre.length < NOMBRE_MIN) return false;
  return nombre;
}

/**
 * Limpia el correo. Vacío devuelve `null` (es opcional, no es error).
 * Devuelve `false` si trae algo que no parece un correo.
 */
export function normalizarCorreo(raw: string): string | null | false {
  const correo = raw.trim().toLowerCase();
  if (!correo) return null;
  if (correo.length > CORREO_MAX) return false;
  // Suficiente para atajar dedazos; la verificación real sería mandar un correo.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(correo)) return false;
  return correo;
}
