from common import PROCESSED, TABLES, FIGURES, effort_metrics
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.dummy import DummyRegressor

results = []

def run_dataset(name, path, target, feature_cols, categorical_cols=None):
    if not path.exists():
        print(f'No existe {path}; se omite {name}.')
        return None
    df = pd.read_csv(path)
    df = df.dropna(subset=[target])
    df = df[df[target] > 0]
    if len(df) < 30:
        print(f'{name}: pocas filas ({len(df)}).')
        return None
    categorical_cols = categorical_cols or []
    numeric_cols = [c for c in feature_cols if c not in categorical_cols]
    X = df[feature_cols].copy()
    y = np.log1p(df[target].astype(float))
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
    pre = ColumnTransformer([
        ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('scaler', StandardScaler())]), numeric_cols),
        ('cat', Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('oh', OneHotEncoder(handle_unknown='ignore'))]), categorical_cols),
    ])
    models = {
        'baseline_media': DummyRegressor(strategy='mean'),
        'regresion_lineal': LinearRegression(),
        'bosque_aleatorio': RandomForestRegressor(n_estimators=200, random_state=42, min_samples_leaf=3),
    }
    pred_frame = pd.DataFrame({'actual_log_effort': y_test})
    for mname, model in models.items():
        pipe = Pipeline([('pre', pre), ('model', model)])
        pipe.fit(X_train, y_train)
        pred = pipe.predict(X_test)
        metrics = effort_metrics(y_test, pred)
        metrics.update({'dataset': name, 'modelo': mname, 'n_train': len(X_train), 'n_test': len(X_test)})
        results.append(metrics)
        pred_frame[f'pred_{mname}'] = pred
    return pred_frame

# JOSSE
josse_path = PROCESSED / 'josse_prepared.csv'
if josse_path.exists():
    josse = pd.read_csv(josse_path)
    features = ['expert_estimate', 'text_length', 'word_count', 'is_change_like', 'issue_type', 'project']
    features = [c for c in features if c in josse.columns]
    cats = [c for c in ['issue_type', 'project'] if c in features]
    pred = run_dataset('JOSSE', josse_path, 'actual_effort', features, cats)
    if pred is not None:
        # Scatter en la escala log en que se entrena/evalua: legible con cola larga.
        plt.figure(figsize=(7,5))
        x = pred['actual_log_effort']
        y = pred['pred_regresion_lineal']
        plt.scatter(x, y, alpha=0.25, s=10)
        lo = min(float(x.min()), float(y.min()))
        hi = max(float(x.max()), float(y.max()))
        plt.plot([lo, hi], [lo, hi], color='black', linewidth=1)
        plt.xlabel('log(1 + esfuerzo real en horas)')
        plt.ylabel('log(1 + esfuerzo predicho en horas)')
        plt.title('JOSSE: esfuerzo real vs predicho (regresión lineal, prueba)')
        plt.tight_layout()
        plt.savefig(FIGURES / 'actual_vs_predicted_josse.png', dpi=180)
        plt.close()
        plt.figure(figsize=(7,5))
        np.log1p(josse['actual_effort']).hist(bins=40)
        plt.xlabel('log(1 + esfuerzo real)')
        plt.ylabel('Frecuencia')
        plt.title('Distribución del esfuerzo en JOSSE')
        plt.tight_layout()
        plt.savefig(FIGURES / 'effort_distribution_josse.png', dpi=180)
        plt.close()
        if 'is_change_like' in josse.columns:
            change_stats = josse.groupby('is_change_like')['actual_effort'].agg(['count','median','mean','std']).reset_index()
            change_stats.to_csv(TABLES / 'josse_change_like_stats.csv', index=False)

# SEERA
seera_path = PROCESSED / 'seera_prepared.csv'
if seera_path.exists():
    seera = pd.read_csv(seera_path)
    numeric = seera.select_dtypes(include=[np.number]).columns.tolist()
    numeric = [c for c in numeric if c != 'effort_target']
    # Reduce columnas numéricas para evitar sobreajuste extremo en datasets pequeños.
    numeric = numeric[:25]
    if numeric:
        pred = run_dataset('SEERA', seera_path, 'effort_target', numeric, [])
        plt.figure(figsize=(7,5))
        np.log1p(seera['effort_target']).hist(bins=25)
        plt.xlabel('log(1 + esfuerzo real)')
        plt.ylabel('Frecuencia')
        plt.title('Distribución del esfuerzo en SEERA')
        plt.tight_layout()
        plt.savefig(FIGURES / 'effort_distribution_seera.png', dpi=180)
        plt.close()

metrics_df = pd.DataFrame(results)
if len(metrics_df):
    metrics_df = metrics_df[['dataset','modelo','n_train','n_test','MAE','RMSE','MAPE_pct','R2']]
    metrics_df.to_csv(TABLES / 'model_metrics.csv', index=False)
    print(metrics_df)
else:
    print('No se generaron métricas. Revisa datasets y configuración de columnas.')
