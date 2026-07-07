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
  { term: "Salario mínimo ZLFN", category: "Laboral", definition: "Zona Libre de la Frontera Norte: $440.87 diarios. NO aplica a Fresnillo, Zacatecas. Es exclusivo para municipios fronterizos del norte.", source: "CONASAMI" },
  { term: "Vacaciones Dignas (reforma 2023)", category: "Laboral", definition: "12 días mínimos al primer año, +2 días por año hasta llegar a 20 al quinto, después +2 cada quinquenio (tope 32). Antes de la reforma eran solo 6 días al primer año.", source: "LFT Arts. 76 y 78 - DOF 27-dic-2022" },
  { term: "Prima vacacional", category: "Laboral", definition: "Mínimo 25% sobre el salario de los días de vacaciones que correspondan al trabajador.", source: "LFT Art. 80" },
  { term: "Aguinaldo", category: "Laboral", definition: "Mínimo 15 días de salario, pagaderos antes del 20 de diciembre.", source: "LFT Art. 87" },
  { term: "PTU", category: "Laboral", definition: "Reparto de Utilidades: 10% de la utilidad fiscal anual entre los trabajadores. Tope (Reforma Outsourcing 2021): 3 meses de salario o promedio PTU últimos 3 años, lo que sea mayor.", source: "LFT Art. 117 / 127 fracc. VIII" },
  { term: "CEAV", category: "Laboral / Seguridad social", definition: "Cesantía en Edad Avanzada y Vejez. Cuota patronal escalonada (2023-2030): para 2026 va de 3.150% a 7.513% del SBC según el SBC en UMAs. Cuota obrera fija: 1.125%.", source: "LSS Art. 168 fracc. II - Reforma Pensiones 2020" },

  // Operativo / financiero
  { term: "Capital de trabajo requerido (bache de caja)", category: "Financiero", definition: "El dinero que el proveedor pone de su bolsa en el peor momento del proyecto: cuando ya gastó en sueldos y todavía no le llegan los pagos del cliente. En las pantallas del sistema aparece como 'bache de caja'. NO es el costo total del proyecto; es el hueco temporal de efectivo." },
  { term: "Bache de caja", category: "Financiero", definition: "Otro nombre del capital de trabajo requerido: el mes donde el proveedor lleva más dinero gastado de lo que ha cobrado. Se ve resaltado en la tabla de flujo de efectivo del proyecto. Se reduce negociando más anticipo o pagos parciales más seguidos." },
  { term: "Margen objetivo", category: "Financiero", definition: "Porcentaje de utilidad que el proveedor agrega sobre su costo. Ejemplo: si el costo es $100,000 y el margen es 20%, el precio antes de IVA queda en $125,000 (el costo se divide entre 0.80, para que la utilidad sea el 20% del precio)." },
  { term: "Carga patronal estimada", category: "Financiero", definition: "Factor agregado (~37-43%) sobre el salario bruto que aproxima IMSS+INFONAVIT+ISN+UAZ+provisiones de ley cuando no se desglosa concepto por concepto." },
  { term: "Contingencia", category: "Financiero", definition: "Reserva para imprevistos que se suma a una cotización o al costo de un cambio. La práctica internacional (Project Management Institute) recomienda del 10 al 15% típico, hasta 25% en proyectos complejos." },
  { term: "Overhead administrativo", category: "Financiero", definition: "Los gastos 'invisibles' de operar: contabilidad, facturación, coordinación, oficina. Se agrega como porcentaje al costo de la mano de obra porque nadie trabaja sin ese soporte alrededor." },
  { term: "Línea base (del contrato)", category: "Cambios", definition: "La 'foto' de lo pactado: alcance, precio y fechas acordados. Cuando un cambio es grande, se aprueba una NUEVA línea base, es decir, se actualiza formalmente el acuerdo para que el contrato refleje la realidad." },
  { term: "Tope de protección (cambios sin costo)", category: "Cambios", definition: "Regla del sistema que impide marcar como 'incluido sin costo' un cambio demasiado grande. Protege al proveedor de regalar trabajo que lo puede quebrar; si se activa, el sistema explica la razón." },

  // Modos de desarrollo
  { term: "Tradicional", category: "Modo desarrollo", definition: "Codificación manual con revisión y pruebas estándar. Es el punto de comparación de los demás modos." },
  { term: "Asistido por herramientas generativas", category: "Modo desarrollo", definition: "Uso de herramientas generativas para completar código, generar pruebas y documentar. Reduce ~22% la codificación pero sube ~20% la revisión por verificación de sugerencias." },
  { term: "Bytecoding (por prompts)", category: "Modo desarrollo", definition: "La IA genera el código y el humano verifica y endurece. Prototipo 3.5× más rápido, pero requiere endurecimiento adicional. Suma 1.10 horas-persona vs 1.0 del tradicional." },
  { term: "Low-code", category: "Modo desarrollo", definition: "Plataformas de configuración (formularios, flujos). Muy rápido para sistemas de registros; agrega 20% de sobrecosto por dependencia de plataforma y licenciamiento." },
  { term: "Híbrido", category: "Modo desarrollo", definition: "Mezcla: manual para componentes críticos + asistido/bytecoding para lo repetitivo. Equilibrio entre velocidad y calidad." },
  { term: "Factor de velocidad", category: "Modo desarrollo", definition: "Cuánto se acelera el CALENDARIO respecto al tradicional (1.0). Bytecoding: 1.40, low-code: 1.50. Aunque las horas-persona sean similares, las semanas se acortan." },
  { term: "Aceleración a prototipo", category: "Modo desarrollo", definition: "Cuánto más rápido se llega a una primera versión funcionando respecto al tradicional. Bytecoding: 3.5× más rápido. Es la señal que justifica elegirlo cuando urge enseñar avances." },
  { term: "Endurecimiento (hardening)", category: "Modo desarrollo", definition: "Trabajo de reforzar el código generado por IA: revisión de seguridad, validación de casos límite y limpieza para que sea mantenible. En bytecoding es ~15% del esfuerzo total." },

  // Riesgo y cambios
  { term: "Factor de claridad", category: "Riesgo", definition: "Multiplicador del esfuerzo según qué tan claro está el requerimiento (escala 1-5). Un requerimiento de una frase suelta (1) sube el esfuerzo 80%; uno completo y validado (5) no lo sube nada." },
  { term: "Factor conservador", category: "Riesgo", definition: "Lo que infla el escenario conservador (entre 1.25× y 1.80×). Crece cuando: los requisitos están poco claros, hay más de 2 integraciones, se manejan datos sensibles, hay alta probabilidad de cambios o el cliente está poco disponible." },
  { term: "Cambio de alcance", category: "Cambios", definition: "Tipos: corrección · garantía · ajuste menor · mejora · nuevo alcance. Cada uno con impacto distinto en tiempo, costo, pruebas, capacitación y documentación." },
  { term: "Riesgo agregado", category: "Riesgo", definition: "Combina 5 dimensiones: técnico + requerimientos + fiscal-laboral + flujo de efectivo + cambios. Escala de 0 a 5. Niveles: bajo (menos de 1.5), medio (hasta 3.0), alto (hasta 4.0), crítico (4.0 o más)." },
  { term: "Escenarios (optimista / probable / conservador)", category: "Riesgo", definition: "El mismo proyecto calculado bajo 3 supuestos: optimista = todo sale bien; probable = lo más realista (úsalo para presupuestar); conservador = con tropiezos. Presupuestar con el optimista es la receta clásica del sobrecosto." },

  // Privacidad y datos personales
  { term: "LGPDPPSO", category: "Privacidad", definition: "Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados. Es la ley que aplica al Ayuntamiento (y a cualquier entidad pública) cuando trata datos personales de ciudadanos. Exige aviso de privacidad, derechos ARCO, medidas de seguridad y bitácora.", source: "DOF 26-ene-2017" },
  { term: "LFPDPPP", category: "Privacidad", definition: "Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Aplica al proveedor de software como empresa privada cuando trata datos de empleados, clientes o terceros. Exige aviso de privacidad, consentimiento y medidas de seguridad.", source: "DOF 05-jul-2010" },
  { term: "Datos personales sensibles", category: "Privacidad", definition: "Datos cuya afectación al titular puede causar discriminación o riesgo grave: salud, origen racial, ideología, religión, vida sexual, datos biométricos. Requieren consentimiento expreso y por escrito.", source: "LFPDPPP Art. 3 fracc. VI / LGPDPPSO Art. 3 fracc. X" },
  { term: "Derechos ARCO", category: "Privacidad", definition: "Acceso, Rectificación, Cancelación y Oposición. Son los 4 derechos del titular sobre sus datos personales que tanto el Ayuntamiento como el proveedor deben garantizar mediante un procedimiento documentado.", source: "LFPDPPP Cap. IV / LGPDPPSO Cap. III" },
];

const CATEGORIES = Array.from(new Set(TERMS.map((t) => t.category)));

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" />Glosario</h1>
        <p className="text-muted-foreground">
          {TERMS.length} términos en {CATEGORIES.length} categorías. Está pensado para personas que operan el sistema sin formación técnica ni contable.
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
