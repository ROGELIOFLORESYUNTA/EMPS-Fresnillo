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
