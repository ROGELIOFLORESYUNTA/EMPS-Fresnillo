-- Addendum EMPS-Fresnillo: migracion aditiva para PostgreSQL
-- No borra tablas existentes. Agrega soporte para datasets, ML, escenarios de productividad y fuentes vivas.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dev_mode_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO dev_mode_catalog (code, name, description)
VALUES
('traditional', 'Desarrollo tradicional', 'Estimacion basada en analisis, programacion manual, revision, pruebas y despliegue convencional.'),
('ai_assisted', 'Desarrollo asistido por herramientas generativas', 'Uso de asistentes para completar codigo, generar pruebas, documentar o refactorizar.'),
('bytecoding_prompts', 'Bytecoding o codificacion con prompts', 'Construccion rapida mediante instrucciones en lenguaje natural, generacion de codigo y ajuste iterativo.'),
('low_code', 'Low-code o configuracion', 'Construccion con plataformas, plantillas, formularios y configuracion.'),
('hybrid', 'Hibrido', 'Combinacion de desarrollo tradicional, asistencia generativa y componentes configurables.')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS scenario_productivity_factor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dev_mode_code TEXT NOT NULL REFERENCES dev_mode_catalog(code),
    scenario_name TEXT NOT NULL,
    requirements_factor NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    coding_factor NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    review_factor NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    testing_factor NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    refactor_factor NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    documentation_factor NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    maintenance_risk_factor NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    min_multiplier NUMERIC(8,4) NOT NULL DEFAULT 0.7000,
    max_multiplier NUMERIC(8,4) NOT NULL DEFAULT 1.5000,
    evidence_level TEXT NOT NULL DEFAULT 'expert_assumption',
    source_note TEXT,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimation_dataset_source (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_url TEXT,
    doi TEXT,
    license TEXT,
    description TEXT,
    intended_use TEXT,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dataset_import_batch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_source_id UUID NOT NULL REFERENCES estimation_dataset_source(id),
    imported_by TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_version TEXT,
    file_name TEXT,
    file_hash TEXT,
    rows_imported INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS external_task_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID REFERENCES dataset_import_batch(id),
    external_id TEXT,
    project_key TEXT,
    issue_type TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    priority TEXT,
    story_points NUMERIC(12,4),
    expert_estimate_hours NUMERIC(12,4),
    actual_effort_hours NUMERIC(12,4),
    cycle_time_days NUMERIC(12,4),
    change_count INTEGER,
    comment_count INTEGER,
    link_count INTEGER,
    raw_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_task_record_project_key ON external_task_record(project_key);
CREATE INDEX IF NOT EXISTS idx_external_task_record_issue_type ON external_task_record(issue_type);
CREATE INDEX IF NOT EXISTS idx_external_task_record_raw_json ON external_task_record USING GIN(raw_json);

CREATE TABLE IF NOT EXISTS training_case (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_kind TEXT NOT NULL,
    source_record_id UUID,
    project_type TEXT,
    module_count INTEGER,
    user_story_count INTEGER,
    integration_count INTEGER,
    screen_count INTEGER,
    report_count INTEGER,
    sensitive_data BOOLEAN DEFAULT FALSE,
    requirements_clarity NUMERIC(5,2),
    stakeholder_availability NUMERIC(5,2),
    change_volatility NUMERIC(5,2),
    team_experience NUMERIC(5,2),
    dev_mode_code TEXT REFERENCES dev_mode_catalog(code),
    estimated_effort_hours NUMERIC(14,4),
    actual_effort_hours NUMERIC(14,4),
    estimated_cost_mxn NUMERIC(14,2),
    actual_cost_mxn NUMERIC(14,2),
    change_count INTEGER,
    maintenance_months INTEGER,
    fiscal_labor_risk_score NUMERIC(6,2),
    raw_features JSONB,
    label_quality TEXT DEFAULT 'unknown',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_case_dev_mode ON training_case(dev_mode_code);
CREATE INDEX IF NOT EXISTS idx_training_case_source_kind ON training_case(source_kind);
CREATE INDEX IF NOT EXISTS idx_training_case_raw_features ON training_case USING GIN(raw_features);

CREATE TABLE IF NOT EXISTS ml_model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_key TEXT UNIQUE NOT NULL,
    model_name TEXT NOT NULL,
    target_variable TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    training_dataset_notes TEXT,
    feature_schema JSONB,
    model_artifact_path TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    trained_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ml_model_metric (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES ml_model_registry(id),
    dataset_split TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC(14,6) NOT NULL,
    sample_size INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ml_prediction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ml_model_registry(id),
    project_id UUID,
    estimate_id UUID,
    target_variable TEXT NOT NULL,
    predicted_min NUMERIC(14,4),
    predicted_value NUMERIC(14,4),
    predicted_max NUMERIC(14,4),
    confidence_score NUMERIC(6,2),
    input_features JSONB,
    explanation JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_source_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key TEXT UNIQUE NOT NULL,
    source_name TEXT NOT NULL,
    category TEXT NOT NULL,
    official_priority INTEGER NOT NULL DEFAULT 1,
    source_url TEXT NOT NULL,
    refresh_frequency TEXT NOT NULL DEFAULT 'manual',
    parser_type TEXT NOT NULL DEFAULT 'manual_review',
    requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_source_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_source_id UUID NOT NULL REFERENCES live_source_registry(id),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    content_hash TEXT,
    http_status INTEGER,
    extracted_text TEXT,
    extracted_json JSONB,
    change_detected BOOLEAN DEFAULT FALSE,
    review_status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS fiscal_parameter_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_key TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'MX',
    value_numeric NUMERIC(14,6),
    value_text TEXT,
    unit TEXT,
    valid_from DATE,
    valid_to DATE,
    source_snapshot_id UUID REFERENCES live_source_snapshot(id),
    approval_status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_parameter_key_validity ON fiscal_parameter_version(parameter_key, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS parameter_change_review (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_snapshot_id UUID REFERENCES live_source_snapshot(id),
    parameter_key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    risk_level TEXT NOT NULL DEFAULT 'medium',
    decision TEXT NOT NULL DEFAULT 'pending',
    reviewer_notes TEXT,
    decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS project_actual_result (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    estimate_id UUID,
    actual_start_date DATE,
    actual_end_date DATE,
    actual_effort_hours NUMERIC(14,4),
    actual_total_cost_mxn NUMERIC(14,2),
    actual_change_count INTEGER,
    actual_maintenance_cost_mxn NUMERIC(14,2),
    was_completed BOOLEAN,
    main_deviation_reason TEXT,
    lessons_learned TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estimation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID,
    reviewer_role TEXT,
    feedback_type TEXT,
    feedback_text TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
