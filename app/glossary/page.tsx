import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

const TERMS: Array<{ term: string; category: string; definition: string; source?: string }> = [
  // Fiscal
  { term: "IVA trasladado", category: "Fiscal", definition: "Impuesto al Valor Agregado del 16% que el proveedor cobra al cliente sobre el subtotal. Es un impuesto indirecto que el proveedor entera al SAT.", source: "LIVA Art. 1" },
  { term: "IVA acreditable", category: "Fiscal", definition: "El IVA que el proveedor pagó a sus propios proveedores y que puede restar (acreditar) contra el IVA trasladado, antes de enterarlo al SAT.", source: "LIVA Art. 4" },
  { term: "ISR personas morales", category: "Fiscal", definition: "Impuesto Sobre la Renta del 30% que aplica sobre el resultado fiscal del ejercicio (utilidad fiscal menos pérdidas anteriores) para empresas constituidas como persona moral.", source: "LISR Art. 9" },
  { term: "ISN Zacatecas", category: "Fiscal estatal", definition: "Impuesto sobre Nóminas del Estado de Zacatecas: 3.5% sobre las erogaciones por remuneraciones al trabajo personal subordinado.", source: "Ley de Hacienda Cap. VI Arts. 37-44" },
  { term: "Sobretasa UAZ", category: "Fiscal estatal", definition: "10% adicional sobre el ISN destinado a la Universidad Autónoma de Zacatecas. Carga combinada efectiva: 3.5% × 1.10 = 3.85%.", source: "SEFIN Zacatecas" },
  { term: "RESICO PF", category: "Fiscal", definition: "Régimen Simplificado de Confianza para Personas Físicas. Tasas de ISR del 1% al 2.5% según ingresos. Exime de IVA cuando los ingresos no superan el umbral.", source: "LISR Sección IV" },

  // Laboral
  { term: "UMA", category: "Laboral", definition: "Unidad de Medida y Actualización. Referencia económica federal usada en lugar del salario mínimo para multas, créditos, topes de cotización IMSS/INFONAVIT, etc. Para 2026: $117.31 diaria, vigente desde el 1 de febrero.", source: "INEGI - DOF 09-ene-2026" },
  { term: "SBC", category: "Laboral", definition: "Salario Base de Cotización. Es el salario integrado que se reporta al IMSS, e incluye el salario diario más prestaciones como aguinaldo proporcional, prima vacacional y bonos. Tope superior: 25 UMAs diarias.", source: "LSS Art. 27" },
  { term: "Salario mínimo general 2026", category: "Laboral", definition: "$315.04 diarios ($9,582.47 mensuales). Aumento del 13% sobre 2025. Vigente desde el 1 de enero de 2026.", source: "CONASAMI - DOF 09-dic-2025" },
  { term: "Salario mínimo ZLFN", category: "Laboral", definition: "Zona Libre de la Frontera Norte: $440.87 diarios. NO aplica a Fresnillo, Zacatecas — es exclusivo para municipios fronterizos del norte.", source: "CONASAMI" },
  { term: "Vacaciones Dignas (reforma 2023)", category: "Laboral", definition: "12 días mínimos al primer año, +2 días por año hasta llegar a 20 al quinto, después +2 cada quinquenio (tope 32). Antes de la reforma eran solo 6 días al primer año.", source: "LFT Arts. 76 y 78 - DOF 27-dic-2022" },
  { term: "Prima vacacional", category: "Laboral", definition: "Mínimo 25% sobre el salario de los días de vacaciones que correspondan al trabajador.", source: "LFT Art. 80" },
  { term: "Aguinaldo", category: "Laboral", definition: "Mínimo 15 días de salario, pagaderos antes del 20 de diciembre.", source: "LFT Art. 87" },
  { term: "PTU", category: "Laboral", definition: "Reparto de Utilidades: 10% de la utilidad fiscal anual entre los trabajadores. Tope (Reforma Outsourcing 2021): 3 meses de salario o promedio PTU últimos 3 años, lo que sea mayor.", source: "LFT Art. 117 / 127 fracc. VIII" },
  { term: "CEAV", category: "Laboral / Seguridad social", definition: "Cesantía en Edad Avanzada y Vejez. Cuota patronal escalonada (2023-2030): para 2026 va de 3.150% a 7.513% del SBC según el SBC en UMAs. Cuota obrera fija: 1.125%.", source: "LSS Art. 168 fracc. II - Reforma Pensiones 2020" },

  // Operativo / financiero
  { term: "Capital de trabajo requerido", category: "Financiero", definition: "Valor absoluto del saldo acumulado mínimo cuando es negativo. Representa cuánto efectivo necesita el proveedor para cubrir egresos antes de cobrar.", source: "07_motor_formulas.md §7" },
  { term: "Margen objetivo", category: "Financiero", definition: "Porcentaje de utilidad bruta que se espera del proyecto. Se aplica como subtotal = total_cost / (1 − margen).", source: "07_motor_formulas.md §5" },
  { term: "Carga patronal estimada", category: "Financiero", definition: "Factor agregado (~37-43%) sobre el salario bruto que aproxima IMSS+INFONAVIT+ISN+UAZ+provisiones LFT cuando no se desglosa por concepto.", source: "03_parametros_fiscales_laborales_2026.md" },

  // Modos de desarrollo
  { term: "Tradicional", category: "Modo desarrollo", definition: "Codificación manual con revisión y pruebas estándar. Línea base del modelo.", source: "Addendum 22" },
  { term: "Asistido por herramientas generativas (ai_assisted)", category: "Modo desarrollo", definition: "Uso de herramientas generativas para completar código, generar pruebas y documentar. Reduce ~22% la codificación pero sube ~20% la revisión por verificación de sugerencias.", source: "Addendum 22" },
  { term: "Bytecoding (bytecoding_prompts)", category: "Modo desarrollo", definition: "IA genera el código y el humano verifica/endurece. Prototipo 3.5× más rápido pero requiere hardening adicional. Suma 1.10 horas-persona vs 1.0 del tradicional.", source: "07_motor_formulas.md §3.bis" },
  { term: "Low-code", category: "Modo desarrollo", definition: "Plataformas de configuración (formularios, flujos). Muy rápido para CRUD; agrega 20% overhead por dependencia de plataforma y licenciamiento.", source: "Addendum 22" },
  { term: "Híbrido", category: "Modo desarrollo", definition: "Mezcla manual para componentes críticos + asistido/bytecoding para boilerplate. Equilibrio entre velocidad y calidad.", source: "Addendum 22" },
  { term: "velocity_factor", category: "Modo desarrollo", definition: "Multiplicador de velocidad calendario respecto a tradicional (1.0). Bytecoding: 1.40, low_code: 1.50. Modela que aunque las horas-persona sean similares o mayores, el calendario se acelera.", source: "07_motor_formulas.md §3.bis" },
  { term: "prototype_speedup", category: "Modo desarrollo", definition: "Cuánto más rápido se llega a un prototipo funcional respecto al tradicional. Bytecoding: 3.5× más rápido. Esta es la señal que justifica elegir bytecoding.", source: "07_motor_formulas.md §3.bis" },
  { term: "hardening", category: "Modo desarrollo", definition: "Endurecimiento del código generado por IA: revisión de seguridad, validación de edge cases, refactor para mantenibilidad. En bytecoding es 0.15 del esfuerzo total.", source: "Addendum 22" },

  // Riesgo y cambios
  { term: "factor de claridad", category: "Riesgo", definition: "Multiplicador del esfuerzo según la madurez del requerimiento (escala 1-5). Requerimientos incompletos (1) suben el esfuerzo 80%; requerimientos listos (5) lo dejan en 1.0×.", source: "07_motor_formulas.md §1" },
  { term: "factor conservador", category: "Riesgo", definition: "Multiplicador del escenario conservador (1.25-1.80) que crece con: claridad <3, integraciones >2, datos sensibles, probabilidad cambios >0.3, baja disponibilidad del cliente.", source: "07_motor_formulas.md §3" },
  { term: "Cambio de alcance", category: "Cambios", definition: "Tipos: corrección · garantía · ajuste menor · mejora · nuevo alcance. Cada uno con impacto en tiempo, costo, pruebas, capacitación y documentación.", source: "07_motor_formulas.md §8" },
  { term: "Riesgo agregado", category: "Riesgo", definition: "Suma de 5 dimensiones (técnico + requerimientos + fiscal + flujo de efectivo + cambios). Tope 5.0. Niveles: bajo <1.5, medio <3.0, alto <4.0, crítico ≥4.0.", source: "07_motor_formulas.md §9" },
];

const CATEGORIES = Array.from(new Set(TERMS.map((t) => t.category)));

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" />Glosario</h1>
        <p className="text-muted-foreground">
          {TERMS.length} términos en {CATEGORIES.length} categorías. Diseñado para usuarios no técnicos (RNF-01).
        </p>
      </div>

      {CATEGORIES.map((cat) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{cat}</CardTitle>
            <CardDescription>{TERMS.filter((t) => t.category === cat).length} términos</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {TERMS.filter((t) => t.category === cat).map((t) => (
              <div key={t.term} className="border-l-4 border-primary/30 pl-4 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{t.term}</h3>
                  {t.source && <Badge variant="outline" className="text-xs">{t.source}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{t.definition}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
