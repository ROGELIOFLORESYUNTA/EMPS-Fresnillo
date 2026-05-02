# Addendum 26. Consultas SQL para reportes de datasets y ML

Estas consultas sirven para demostrar que el sistema si esta trabajando con una base de datos, datasets, casos y resultados comparables.

## Datasets registrados

```sql
SELECT code, name, source_type, doi, intended_use, last_checked_at
FROM estimation_dataset_source
ORDER BY code;
```

## Importaciones realizadas

```sql
SELECT s.code, s.name, b.source_version, b.file_name, b.rows_imported, b.status, b.imported_at
FROM dataset_import_batch b
JOIN estimation_dataset_source s ON s.id = b.dataset_source_id
ORDER BY b.imported_at DESC;
```

## Casos de entrenamiento por origen

```sql
SELECT source_kind, dev_mode_code, COUNT(*) AS total_cases
FROM training_case
GROUP BY source_kind, dev_mode_code
ORDER BY source_kind, dev_mode_code;
```

## Comparacion de estimado contra real

```sql
SELECT
    p.project_id,
    p.estimate_id,
    p.actual_effort_hours,
    p.actual_total_cost_mxn,
    p.actual_change_count,
    p.main_deviation_reason
FROM project_actual_result p
ORDER BY p.created_at DESC;
```

## Modelos ML aprobados

```sql
SELECT model_key, model_name, target_variable, algorithm, status, trained_at, approved_at
FROM ml_model_registry
WHERE status = 'approved'
ORDER BY trained_at DESC;
```

## Metricas de modelos

```sql
SELECT m.model_key, mm.dataset_split, mm.metric_name, mm.metric_value, mm.sample_size
FROM ml_model_metric mm
JOIN ml_model_registry m ON m.id = mm.model_id
ORDER BY m.model_key, mm.dataset_split, mm.metric_name;
```

## Fuentes vivas con cambios pendientes

```sql
SELECT r.source_key, r.source_name, s.checked_at, s.change_detected, s.review_status
FROM live_source_snapshot s
JOIN live_source_registry r ON r.id = s.live_source_id
WHERE s.change_detected = TRUE OR s.review_status = 'pending'
ORDER BY s.checked_at DESC;
```

## Parametros vigentes por ano

```sql
SELECT parameter_key, parameter_name, jurisdiction, value_numeric, value_text, unit, valid_from, valid_to, approval_status
FROM fiscal_parameter_version
WHERE approval_status = 'approved'
ORDER BY parameter_key, valid_from DESC;
```
