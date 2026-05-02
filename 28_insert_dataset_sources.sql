-- Inserts sugeridos para registrar fuentes de datasets.
-- Ejecutar despues de crear estimation_dataset_source.

INSERT INTO estimation_dataset_source (code, name, source_type, source_url, doi, license, description, intended_use)
VALUES
('D1_PUBLIC_JIRA', 'The Public Jira Dataset', 'zenodo', 'https://zenodo.org/records/15719919', '10.5281/zenodo.15719919', NULL, 'Repositorio de issues publicos Jira con proyectos, cambios, comentarios y enlaces.', 'Analizar cambios, ciclo de vida, trazabilidad, retrabajo y riesgo de alcance.'),
('D2_JOSSE', 'JOSSE: Software Development Effort Dataset Annotated with Expert Estimates', 'zenodo', 'https://zenodo.org/records/7022735', '10.5281/zenodo.7022735', NULL, 'Tareas de desarrollo y mantenimiento con esfuerzo real y estimaciones expertas.', 'Comparar esfuerzo real contra estimacion experta y entrenar modelos de esfuerzo por tarea.'),
('D3_SEERA', 'The SEERA Software Cost Estimation Dataset', 'zenodo', 'https://zenodo.org/records/4066438/latest', '10.5281/zenodo.4312777', NULL, 'Dataset de estimacion de costo para entornos con restricciones tecnicas y economicas.', 'Calibrar variables de costo y esfuerzo en contextos restringidos.'),
('D4_ARTICULOS_REVISION', 'Matriz local de articulos revisados', 'local_capture', NULL, NULL, NULL, 'Matriz de revision de literatura con metodo, hallazgos y relacion con variables.', 'Justificar variables y decisiones del modelo.'),
('D5_CONTRATACION_PUBLICA_MX', 'Procedimientos de contratacion publica Mexico', 'csv', 'https://www.datos.gob.mx/dataset/procedimientos_contratacion', NULL, 'Creative Commons Attribution 4.0', 'Datos de procedimientos, proveedor y monto de contrato.', 'Contextualizar contratacion publica y rangos de montos; no estima horas de software.'),
('D6_CASOS_LOCALES_EMPS', 'Casos locales capturados en EMPS-Fresnillo', 'local_capture', NULL, NULL, NULL, 'Estimaciones y resultados reales capturados dentro del sistema.', 'Dataset principal para recalibrar el modelo en contexto municipal.')
ON CONFLICT (code) DO NOTHING;
