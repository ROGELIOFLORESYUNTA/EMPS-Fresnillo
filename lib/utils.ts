import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMXN(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatHours(value: number): string {
  return `${value.toFixed(0)} h`;
}

export function formatWeeks(value: number): string {
  return `${value.toFixed(1)} sem`;
}

export const DEVELOPMENT_MODES = [
  { value: "traditional", label: "Tradicional", description: "Codificación manual con revisión y pruebas estándar." },
  { value: "ai_assisted", label: "Asistido por herramientas generativas", description: "Asistencia generativa para completar código, pruebas y documentación. +25% velocidad." },
  { value: "bytecoding_prompts", label: "Bytecoding (prompts)", description: "IA genera código, humano verifica/endurece. Prototipo 3.5× más rápido." },
  { value: "low_code", label: "Low-code", description: "Plataformas de configuración. Rápido para CRUD; riesgo de licenciamiento y dependencia." },
  { value: "hybrid", label: "Híbrido", description: "Mezcla manual + asistido para componentes críticos." },
] as const;

export const SCENARIOS = [
  { value: "optimistic", label: "Optimista", color: "hsl(142 71% 45%)" },
  { value: "probable", label: "Probable", color: "hsl(217 91% 60%)" },
  { value: "conservative", label: "Conservador", color: "hsl(0 84% 60%)" },
] as const;

export const RISK_LEVELS = {
  bajo: { label: "Bajo", color: "hsl(142 71% 45%)", bg: "bg-green-100 text-green-800" },
  medio: { label: "Medio", color: "hsl(45 93% 47%)", bg: "bg-yellow-100 text-yellow-800" },
  alto: { label: "Alto", color: "hsl(25 95% 53%)", bg: "bg-orange-100 text-orange-800" },
  critico: { label: "Crítico", color: "hsl(0 84% 60%)", bg: "bg-red-100 text-red-800" },
} as const;

// ============================================================
// Etiquetas legibles para valores internos de la BD.
// Regla: el usuario NUNCA debe ver "en_ejecucion", "crud_interno",
// "dev_senior" ni escenarios en inglés. Usar labelOf(mapa, valor).
// ============================================================

export function labelOf(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? value.replace(/_/g, " ");
}

export const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  captura: "En captura",
  estimado: "Estimado",
  aprobado: "Aprobado",
  en_ejecucion: "En ejecución",
  cerrado: "Cerrado",
  archivado: "Archivado",
};

export const PRIORITY_LABELS: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const SYSTEM_TYPE_LABELS: Record<string, string> = {
  crud_interno: "Sistema interno de registros",
  portal_ciudadano: "Portal ciudadano",
  integrador: "Integrador (conecta sistemas)",
  reportes: "Reportes y tableros",
  movil: "Aplicación móvil",
  tramites: "Trámites en línea",
};

export const MODULE_TYPE_LABELS: Record<string, string> = {
  catalogo: "Catálogo",
  transaccional: "Transaccional",
  reporte: "Reporte",
  integracion: "Integración",
  flujo: "Flujo",
};

export const CONTRACT_LABELS: Record<string, string> = {
  nomina: "Nómina",
  asimilados: "Asimilados a salarios",
  honorarios: "Honorarios",
  resico_pf: "RESICO (persona física)",
  freelance: "Freelance",
};

export const LEVEL_LABELS: Record<string, string> = {
  junior: "Junior (aprendiendo)",
  mid: "Medio",
  senior: "Senior (experimentado)",
  lead: "Líder",
};

export const ROLE_LABELS: Record<string, string> = {
  lider_tecnico: "Líder técnico",
  dev_senior: "Desarrollador senior",
  dev_junior: "Desarrollador junior",
  analista: "Analista",
  tester: "Probador (tester)",
  disenador: "Diseñador",
  soporte: "Soporte",
};

export const SCENARIO_LABELS: Record<string, string> = {
  optimistic: "Optimista",
  probable: "Probable",
  conservative: "Conservador",
};

// Guías de las escalas 1-5 (mismos criterios que los manuales del sistema).
// Se muestran JUNTO al campo al capturar, no solo al leer.
export const SCALE_GUIDES = {
  complexity: "1 = formulario simple · 3 = lógica media (validaciones, cálculos) · 5 = lógica de negocio compleja",
  clarity: "1 = solo una frase suelta · 3 = requisito descrito pero sin validar · 5 = requisito completo con criterios de aceptación validados",
  criticality: "1 = si falla, puede esperar al día siguiente · 3 = afecta el trabajo del área · 5 = corta un servicio crítico al ciudadano",
  maturity: "1 = idea apenas platicada · 3 = descrita y revisada con el área · 5 = validada y lista para desarrollar",
} as const;

// Qué significa cada tipo de contrato PARA EL COSTO (cargas patronales).
export const CONTRACT_HELP: Record<string, string> = {
  nomina: "Empleado formal: el proveedor paga IMSS, INFONAVIT, ISN y prestaciones de ley. Es el esquema más caro pero más seguro.",
  asimilados: "Recibe pagos como si fueran salario, sin prestaciones. Retención de ISR, sin IMSS patronal. Riesgo si se usa para trabajo permanente.",
  honorarios: "Profesional independiente que factura sus servicios. Sin cargas patronales, pero sin subordinación (no le puedes fijar horario).",
  resico_pf: "Régimen Simplificado de Confianza: factura con tasas bajas de ISR. Sin cargas patronales para el proveedor.",
  freelance: "Colaborador externo por proyecto. Sin cargas patronales, pero mayor riesgo de rotación y de reclamo laboral si hay subordinación.",
};
