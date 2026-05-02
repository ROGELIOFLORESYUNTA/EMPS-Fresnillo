# Capturas de pantalla — EMPS-Fresnillo

Generadas automáticamente con Playwright + Chromium · viewport 1440×900 · `fullPage: true`.

Para regenerar: `npm run screenshots` (con dev server corriendo) o `npm run setup && npm run dev` y luego `npm run screenshots`.

## Índice — Evidencia técnica para el artículo

| # | Captura | Página / Endpoint | Qué evidencia |
|---|---|---|---|
| 01 | [01_dashboard.png](01_dashboard.png) | `/` | Vista general: KPIs (proyectos, parámetros, datasets, fuentes vivas, modelos ML), resumen del addendum y atajos. |
| 02 | [02_projects_list.png](02_projects_list.png) | `/projects` | Listado de proyectos con totales estimados y nivel de riesgo agregado. |
| 03 | [03_new_project_form.png](03_new_project_form.png) | `/projects/new` | Wizard paso 1: datos generales, contexto municipal, tipo de sistema, prioridad. |
| 04 | [04_project_detail.png](04_project_detail.png) | `/projects/[id]` | Vista completa: comparador de 5 modos × 3 escenarios, módulos, equipo, cambios, flujo de efectivo, capital de trabajo. |
| 05 | [05_project_modules.png](05_project_modules.png) | `/projects/[id]/modules` | Captura de módulos con complejidad/claridad/criticidad y datos sensibles. |
| 06 | [06_project_team.png](06_project_team.png) | `/projects/[id]/team` | Captura del equipo con salario, disponibilidad, contrato. |
| 07 | [07_project_estimate_wizard.png](07_project_estimate_wizard.png) | `/projects/[id]/estimate` | Configuración de estimación: margen, capacidad, costo detallado vs factor estimado, supuestos de flujo. |
| 08 | [08_reports_hub.png](08_reports_hub.png) | `/projects/[id]/reports` | Hub de los 3 reportes (Ayuntamiento, Proveedor, Académico). |
| 09 | [09_report_municipal.png](09_report_municipal.png) | `/projects/[id]/reports/municipal` | Reporte para Ayuntamiento: alcance, riesgos, qué NO está incluido, checklist de aceptación. |
| 10 | [10_report_provider.png](10_report_provider.png) | `/projects/[id]/reports/provider` | Reporte para Proveedor: costo equipo, capital de trabajo, margen, recomendación de pago. |
| 11 | [11_report_research.png](11_report_research.png) | `/projects/[id]/reports/research` | Reporte académico: 5 modos × 3 escenarios comparados, evidencia para validar/ajustar la hipótesis. |
| 12 | [12_comparator_5_modes.png](12_comparator_5_modes.png) | `/comparator` | Comparador de los 5 modos: distribución por fase, velocidad calendario, multiplicadores per-fase. |
| 13 | [13_parameters_2026.png](13_parameters_2026.png) | `/parameters` | 38 parámetros 2026 agrupados (UMA, IMSS, ISR, IVA, ISN Zacatecas, INFONAVIT, prestaciones LFT). |
| 14 | [14_datasets.png](14_datasets.png) | `/datasets` | Datasets registrados (D1-D7): Public Jira, JOSSE, SEERA, contratación pública, casos locales. |
| 15 | [15_live_sources.png](15_live_sources.png) | `/live-sources` | 8 fuentes vivas (SAT, INEGI, CONASAMI, SEFIN, Zenodo) + parámetros aprobados. |
| 16 | [16_ml_models.png](16_ml_models.png) | `/ml-models` | Modelos ML registrados + pipeline de aprendizaje en 4 fases (addendum 21). |
| 17 | [17_glossary.png](17_glossary.png) | `/glossary` | Glosario de 30 términos agrupados (Fiscal, Laboral, Modos, Riesgo). |
| 18 | [18_audit_log.png](18_audit_log.png) | `/audit` | Bitácora del sistema (RNF-03 auditabilidad). |
| 19 | [19_users_roles.png](19_users_roles.png) | `/users` | 5 roles del sistema (Administrador, Estimador, Ayuntamiento, Proveedor, Auditor). |

## Capturas sugeridas para el documento del artículo

Dependiendo de la sección del artículo:

- **Materiales y Métodos:** 01, 04, 12, 13, 15
- **Resultados:** 04, 09, 10, 11
- **Discusión / Validación:** 11, 12, 16
- **Anexo técnico (evidencia de implementación):** 02-08, 14, 17, 18, 19

## Datos del proyecto demo capturado

- **Nombre:** Demo Sistema CRUD interno
- **Cliente:** Ayuntamiento de Fresnillo
- **Área:** Dirección de Innovación
- **Módulos:** 3 (Catálogo trámites, Alta solicitudes, Reporte mensual)
- **Equipo:** 2 perfiles (Líder técnico senior $45k, Dev mid $28k, 3 meses)
- **Estimaciones generadas:** 15 (5 modos × 3 escenarios)
- **Cambio registrado:** 1 (nuevo alcance — exportación CSV +24h, +$18k)

## Resolución y formato

- Formato: PNG sin compresión adicional
- Viewport: 1440×900
- Modo: `fullPage: true` (captura toda la altura del contenido, no solo viewport)
- Total: ~3 MB para los 19 archivos

Para impresión en Word, recomendado **escalar al 60-75% del ancho de página** y usar el panel "Insertar > Imágenes". El tamaño nativo es legible al 100%.
