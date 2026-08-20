/**
 * Lista única de roles del visitante.
 *
 * Se usa en tres lugares que deben decir lo mismo: el formulario de identidad
 * al crear el primer proyecto, la pantalla "Mi cuenta" y la validación del
 * endpoint PUT /api/workspace/me.
 *
 * El motor de recomendación (lib/engine/recommendation.ts) solo distingue
 * operador_municipal / proveedor / neutral, pero aquí guardamos el detalle
 * porque el estudio agrupa por este campo.
 */
export interface RoleOption {
  value: string;
  /** Texto largo, para la pantalla de cuenta. */
  label: string;
  /** Texto corto, para el formulario de alta de proyecto. */
  short: string;
}

export const ROLES: RoleOption[] = [
  {
    value: "operador_municipal",
    label: "Trabajo en un Ayuntamiento (Catastro, Tesorería, Obras, etc.)",
    short: "Trabajo en el Ayuntamiento y voy a presupuestar",
  },
  {
    value: "proveedor",
    label: "Soy desarrollador / proveedor de software",
    short: "Soy proveedor y voy a cotizar",
  },
  {
    value: "investigador",
    label: "Soy investigador o profesor",
    short: "Soy investigador o profesor",
  },
  {
    value: "explorando",
    label: "Solo estoy curioseando para ver de qué se trata",
    short: "Solo estoy viendo cómo funciona",
  },
  { value: "otro", label: "Otro", short: "Otro" },
];

export const ROLES_VALIDOS = new Set(ROLES.map((r) => r.value));

export function etiquetaDeRol(role: string | null | undefined): string | null {
  if (!role) return null;
  return ROLES.find((r) => r.value === role)?.label ?? role;
}
