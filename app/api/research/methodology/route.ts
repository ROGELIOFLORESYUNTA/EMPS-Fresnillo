/**
 * GET /api/research/methodology
 *
 * Devuelve el documento metodológico estructurado para renderizarlo en la
 * UI. Operacionaliza la hipótesis y explica cómo se validan los resultados.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hypothesis: {
      original:
        "Una estimación temprana mejora cuando integra esfuerzo técnico, modo de desarrollo, cambios y viabilidad fiscal-laboral antes de comprometer precio, calendario y mantenimiento.",
      operationalized:
        "Si se integran las 4 dimensiones, el MAPE (Mean Absolute Percentage Error) entre horas estimadas y horas reales debe ser menor (≤15% para ser 'preciso' según estándar IFPUG) y la varianza del error debe explicarse mayoritariamente por esas dimensiones.",
    },
    variables: {
      dependent: {
        name: "MAPE de horas (mape_hours)",
        formula: "mean(|estimado − real| / real × 100)",
        thresholds: {
          preciso: "≤ 15%",
          aceptable: "15% – 30%",
          impreciso: "> 30%",
        },
        source: "IFPUG Counting Practices Manual + Conte/Dunsmore/Shen 1986",
      },
      independent: [
        {
          group: "VI 1 — Esfuerzo técnico integrado",
          features: ["clarity_avg", "n_modules", "n_integrations", "criticality_avg"],
          why: "Mide cuánto detalle técnico se capturó al estimar.",
        },
        {
          group: "VI 2 — Modo de desarrollo declarado",
          features: ["dev_mode (categórica one-hot)"],
          why: "El modo determina factores de productividad y hardening.",
        },
        {
          group: "VI 3 — Cambios anticipados",
          features: ["changes_anticipated_ratio"],
          why: "¿Se anticiparon los cambios que efectivamente ocurrieron?",
        },
        {
          group: "VI 4 — Viabilidad fiscal-laboral",
          features: ["fiscal_detailed"],
          why: "¿Se desglosó IMSS/INFONAVIT/ISN o se usó factor agregado?",
        },
      ],
    },
    decisionRule: {
      cumplida: "R² ≥ 0.35 Y al menos 2 predictores con p < 0.05",
      parcialmente_cumplida: "R² entre 0.15 y 0.35, O solo 1 predictor significativo",
      no_cumplida: "R² < 0.15 Y ningún predictor significativo",
      datos_insuficientes: "N < 15 proyectos con resultado real capturado",
    },
    methods: [
      {
        name: "Estadística descriptiva",
        purpose: "Resumen del comportamiento del MAPE (media, mediana, dispersión).",
        library: "simple-statistics (pure JS).",
      },
      {
        name: "Correlación de Pearson (con p-value aproximado)",
        purpose: "Mide la fuerza y dirección de la relación entre cada VI y MAPE.",
        library: "simple-statistics. p-value: aproximación t-student.",
      },
      {
        name: "Regresión multivariable lineal",
        purpose: "Identifica qué VIs explican mejor el MAPE de manera conjunta.",
        library: "ml-regression-multivariate-linear (mljs).",
      },
      {
        name: "Random Forest (clasificación binaria precisa sí/no)",
        purpose: "Predice si una estimación caerá dentro del umbral del 15% y reporta feature importance.",
        library: "ml-random-forest (mljs).",
      },
      {
        name: "Red neuronal MLP (1 capa oculta)",
        purpose: "Demuestra capacidad de predicción no-lineal. NO es la evidencia principal del artículo por riesgo de sobreajuste con N<100.",
        library: "Implementación propia en TypeScript (~80 líneas, sin dependencias nativas).",
      },
    ],
    externalValidation: {
      pythonNotebook: "entregable-investigacion/notebooks/validar_hipotesis.ipynb",
      steps: [
        "Descargar el CSV desde /investigacion/validacion-hipotesis (botón 'Descargar dataset').",
        "Instalar Python 3.11+ con: pip install pandas scikit-learn matplotlib jupyter",
        "Abrir el notebook con: jupyter notebook validar_hipotesis.ipynb",
        "Apuntar el notebook al CSV descargado y ejecutar todas las celdas.",
        "Comparar R², MAPE y feature importance con los reportados por el sistema. Deben coincidir (±0.01).",
      ],
    },
    references: [
      "IFPUG (2010). Function Point Counting Practices Manual v4.3.",
      "Boehm, B. (1981). Software Engineering Economics.",
      "Conte, Dunsmore & Shen (1986). Software Engineering Metrics and Models.",
      "Jorgensen & Shepperd (2007). A systematic review of software development cost estimation studies.",
      "PMBOK 7th Edition (2021). Project Management Body of Knowledge.",
    ],
  });
}
