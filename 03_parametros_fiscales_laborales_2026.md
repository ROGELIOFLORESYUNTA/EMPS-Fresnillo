# Parámetros fiscales y laborales 2026

Los parámetros deben guardarse en base de datos o archivo JSON para poder actualizarlos cada año. Última verificación: **1 de mayo de 2026**.

## Parámetros validados con fuente oficial

| Parámetro | Valor | Vigencia | Fuente |
|---|---|---|---|
| IVA general | 16% | 2026-01-01 | LIVA Art. 1 (sin reformas para 2026) |
| ISR personas morales | 30% sobre resultado fiscal | 2026-01-01 | LISR Art. 9 |
| UMA diaria | $117.31 | **2026-02-01** | INEGI - DOF 09-ene-2026 |
| UMA mensual | $3,566.22 | 2026-02-01 | INEGI - DOF 09-ene-2026 |
| UMA anual | $42,794.64 | 2026-02-01 | INEGI - DOF 09-ene-2026 |
| Salario mínimo general diario | $315.04 | 2026-01-01 | CONASAMI - DOF 09-dic-2025 |
| Salario mínimo general mensual (anualizado) | $9,582.47 | 2026-01-01 | CONASAMI - DOF 09-dic-2025 |
| Salario mínimo Zona Libre Frontera Norte diario | $440.87 | 2026-01-01 | CONASAMI - DOF 09-dic-2025 |
| Salario mínimo ZLFN mensual (anualizado) | $13,409.80 | 2026-01-01 | CONASAMI - DOF 09-dic-2025 |
| Impuesto sobre Nóminas Zacatecas | 3.5% | desde 2025-01-01 | Ley de Hacienda Cap. VI Arts. 37-44 - confirmado en LIA Zacatecas 2026 |
| Sobretasa UAZ sobre ISN | 10% | desde 2025-01-01 | SEFIN - confirmado en LIA Zacatecas 2026 (rubro 1.8.2) |

## Notas de aplicación

### UMA 2026
- **Variación:** +3.69% sobre UMA 2025 ($113.14 → $117.31).
- **Vigencia desfasada:** los valores aplican desde el **1 de febrero de 2026**, no desde el 1 de enero. Para movimientos entre 1-31 de enero 2026 aplica la UMA 2025.
- **Uso:** referencia económica federal para multas, créditos, IMSS, INFONAVIT, topes de cotización, etc.

### Salarios mínimos 2026
- **Aumento general:** 13% (compuesto por MIR de $17.01 + ajuste 6.5%).
- **Aumento ZLFN:** 5%.
- **Vigencia:** 1 de enero de 2026.
- **Aplicación geográfica:** Fresnillo, Zacatecas se rige por el **Salario Mínimo General**, NO por el de la Zona Libre de la Frontera Norte (ZLFN solo aplica en municipios fronterizos del norte).

### IVA e ISR
- Sin reformas para 2026; tasas vigentes idénticas a 2025.
- IVA tasa 0% (LIVA Art. 2-A) y exenciones (LIVA Art. 9) no se modelan en el prototipo.

### ISN Zacatecas y sobretasa UAZ
- **ISN 3.5%** vigente desde 2025; confirmado en la Ley de Ingresos del Estado de Zacatecas 2026 (Art. 1 Fracc. 1.5 punto Nº 5). Fundamento: Ley de Hacienda del Estado, Cap. VI, Arts. 37-44.
- **Adicional UAZ 10%** sobre el ISN (no sobre la base de erogaciones). Confirmado en LIA Zacatecas 2026 como rubro presupuestal 1.8.2 (ingreso estimado $311,849,327).
- **Carga efectiva combinada:** ISN+UAZ = 3.5% + (3.5% × 10%) = 3.85% sobre la base gravable.
- **Plazo de pago:** dentro de los primeros 17 días del mes siguiente a las erogaciones.

## Importante (advertencia obligatoria en reportes)

El sistema debe advertir que los cálculos son **estimaciones preliminares**. La determinación oficial depende de:
- Régimen fiscal del proveedor (PM general, RESICO, etc.).
- Deducciones autorizadas y no deducibles.
- Prestaciones reales y SBC (Salario Base de Cotización).
- Clase de riesgo IMSS y movimientos afiliatorios.
- Contratos vigentes y revisión profesional contable/fiscal.

## Reglas de diseño

1. **No hardcodear tasas** en el motor de fórmulas. Todas las tasas se leen desde el repositorio de Parámetros.
2. **Guardar vigencia por fecha** (`effective_from` / `effective_until`) para evitar recalcular un proyecto histórico con tasas nuevas.
3. **Permitir estado o entidad federativa** para parámetros locales (ISN, sobretasas).
4. **Permitir factor de carga patronal estimado** cuando no exista desglose detallado de IMSS/INFONAVIT/RCV.
5. **Guardar fundamento legal y notas** en cada parámetro (campo `source` + `source_url` + `notes`).
6. **Auditar cada cálculo** con snapshot de los parámetros usados (`Estimate.parameters_snapshot` o referencia versionada).

## Cuotas IMSS 2026 (obrero-patronales)

**Base general:** Salario Base de Cotización (SBC). El SBC tiene tope superior de 25 UMAs diarias.

### Enfermedades y Maternidad

| Concepto | Patrón | Obrero | Total | Base | Fundamento |
|---|---|---|---|---|---|
| En especie - cuota fija | 20.40% | — | 20.40% | UMA diaria por día | LSS Art. 106 fracc. I |
| En especie - excedente | 1.10% | 0.40% | 1.50% | (SBC − 3 UMA) | LSS Art. 106 fracc. II |
| En dinero | 0.70% | 0.25% | 0.95% | SBC | LSS Art. 107 |
| Pensionados y beneficiarios | 1.05% | 0.375% | 1.425% | SBC | LSS Art. 25 |

### Riesgos de Trabajo (100% patronal — varía por clase)

| Clase | Tipo de actividad típica | Prima media |
|---|---|---|
| I | Oficinas, administración, software | 0.54355% |
| II | Comercio, servicios ligeros | 1.130658% |
| III | Manufactura ligera | 2.59844% |
| IV | Construcción, manufactura pesada | 4.65325% |
| V | Minería, industrias peligrosas | 7.58875% |

> **Nota proyecto:** Para EMPS-Fresnillo (desarrollo de software), aplicar **Clase I (0.54355%)** como default. Se ajusta anualmente por siniestralidad (LSS Art. 74).

### Invalidez y Vida
- Patrón: 1.75% / Obrero: 0.625% / **Total: 2.375%** (sobre SBC) — LSS Art. 147

### Guarderías y Prestaciones Sociales
- Patrón: 1.00% (sobre SBC) — LSS Art. 211. 100% patronal.

### Retiro
- Patrón: 2.00% (sobre SBC) — LSS Art. 168 fracc. I. 100% patronal. Pago bimestral.

### Cesantía en Edad Avanzada y Vejez (CEAV) — 4° ajuste 2026

Reforma Pensiones 2020 (LSS Art. 168 fracc. II): la cuota patronal se incrementa de forma progresiva 2023→2030 según el SBC en UMAs:

| Nivel SBC en UMAs | Cuota patronal 2026 |
|---|---|
| Hasta 1.00 UMA | 3.150% |
| 1.01 – 1.50 UMA | 3.676% |
| 1.51 – 2.00 UMA | 4.851% |
| 2.01 – 2.50 UMA | 5.556% |
| 2.51 – 3.00 UMA | 6.026% |
| 3.01 – 3.50 UMA | 6.361% |
| 3.51 – 4.00 UMA | 6.613% |
| 4.01 UMA o más | 7.513% |

- Obrero: **1.125%** fijo (sin cambios).
- Pago bimestral junto con Retiro e INFONAVIT.
- Sigue subiendo escalonadamente hasta 2030.

## INFONAVIT 2026

- **Patrón: 5.00%** del SBC — Ley INFONAVIT Art. 29 fracc. II.
- 100% patronal (sin contraparte obrera).
- Pago bimestral, en mismo enero de meses pares (febrero, abril, junio, etc.) junto con RCV.

## Prestaciones laborales mínimas LFT 2026

### Vacaciones (Reforma Vacaciones Dignas — DOF 27-dic-2022, vigente 01-ene-2023)

| Antigüedad | Días laborables |
|---|---|
| 1° año | 12 |
| 2° año | 14 |
| 3° año | 16 |
| 4° año | 18 |
| 5° año | 20 |
| 6° a 10° año | 22 |
| 11° a 15° año | 24 |
| 16° a 20° año | 26 |
| 21° a 25° año | 28 |
| 26° a 30° año | 30 |
| 31° año en adelante | 32 |

Fundamento: LFT Arts. 76 y 78.

### Prima vacacional
- **Mínimo 25%** sobre el salario de los días de vacaciones — LFT Art. 80.

### Aguinaldo
- **Mínimo 15 días** de salario — LFT Art. 87.
- Pago antes del 20 de diciembre.

### Reparto de utilidades (PTU)
- **10%** de la utilidad fiscal anual — LFT Art. 117 / Constitución Art. 123 fracc. IX.
- **Tope (Reforma Outsourcing 2021):** 3 meses de salario o el promedio de PTU de los últimos 3 años, lo que resulte mayor — LFT Art. 127 fracc. VIII.

## Factor de carga patronal estimado (referencia rápida)

Cuando no exista desglose detallado, el motor puede usar un factor agregado:

| Concepto | % aprox. sobre salario bruto |
|---|---|
| IMSS patronal (todos los ramos, Clase I, SBC ~2 UMA) | ≈ 22-25% |
| INFONAVIT patronal | 5.00% |
| ISN Zacatecas + UAZ | 3.85% |
| Provisiones aguinaldo + prima vacacional + vacaciones | ≈ 6-9% |
| **Total carga patronal estimada** | **≈ 37-43%** |

> **Nota:** este factor es solo orientativo. El motor de fórmulas debe permitir cálculo detallado por concepto y modo "factor estimado" como respaldo cuando faltan datos del proveedor.

## Fuentes consultadas (1-mayo-2026)

- INEGI - https://www.inegi.org.mx/temas/uma/
- INEGI Comunicado UMA 2026 - https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf
- DOF UMA 2026 - https://www.dof.gob.mx/nota_detalle.php?codigo=5778072&fecha=09/01/2026
- DOF Salario Mínimo 2026 - https://www.dof.gob.mx/nota_detalle.php?codigo=5775534&fecha=09/12/2025
- LIVA - https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf
- LISR - https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
- SEFIN Zacatecas ISN - https://sefin.zacatecas.gob.mx/wp-content/uploads/2025/01/IMPUESTO-SOBRE-NOMINAS.pdf
- Ley de Ingresos del Estado de Zacatecas 2026 (Congreso) - https://www.congresozac.gob.mx/65/ley&cual=337&tipo=pdf
- LIA Zacatecas 2026 (presupuesto SEFIN) - https://sefin.zacatecas.gob.mx/wp-content/uploads/2026/01/Formato-LIA2026.pdf
- LSS (Ley del Seguro Social) - https://www.imss.gob.mx/sites/all/statics/pdf/leyes/4001.pdf
- Tabla cuotas IMSS 2026 - https://contadormx.com/cuotas-imss-2026-tablas-porcentajes-y-fechas/
- Reforma Vacaciones Dignas 2023 - DOF 27-dic-2022 - https://www.dof.gob.mx/nota_detalle.php?codigo=5675990&fecha=27/12/2022
- Ley INFONAVIT - https://www.diputados.gob.mx/LeyesBiblio/pdf/82.pdf
- LFT - https://www.diputados.gob.mx/LeyesBiblio/pdf/125.pdf
