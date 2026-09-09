from pathlib import Path
import zipfile
import pandas as pd
import numpy as np
import re

ROOT = Path('.')
RAW = ROOT / 'data' / 'raw'
PROCESSED = ROOT / 'data' / 'processed'
TABLES = ROOT / 'outputs' / 'tables'
FIGURES = ROOT / 'outputs' / 'figures'
GENERATED = ROOT / 'article' / 'generated'

for p in [RAW, PROCESSED, TABLES, FIGURES, GENERATED]:
    p.mkdir(parents=True, exist_ok=True)

def extract_zip_if_needed(zip_path: Path) -> Path:
    out = RAW / zip_path.stem
    if out.exists() and any(out.rglob('*')):
        return out
    out.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(out)
    return out

def list_data_files(base: Path):
    exts = {'.csv', '.xlsx', '.xls', '.arff', '.json'}
    return [p for p in base.rglob('*') if p.suffix.lower() in exts]

def read_any_table(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == '.csv':
        for enc in ['utf-8', 'latin1', 'cp1252']:
            try:
                return pd.read_csv(path, encoding=enc)
            except Exception:
                pass
        return pd.read_csv(path, errors='ignore')
    if suffix in ['.xlsx', '.xls']:
        return pd.read_excel(path)
    if suffix == '.json':
        return pd.read_json(path)
    if suffix == '.arff':
        import arff
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            data = arff.load(f)
        cols = [a[0] for a in data['attributes']]
        return pd.DataFrame(data['data'], columns=cols)
    raise ValueError(f'Formato no soportado: {path}')

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [re.sub(r'[^a-zA-Z0-9]+', '_', str(c).strip().lower()).strip('_') for c in df.columns]
    return df

def find_col(cols, patterns):
    cols = list(cols)
    for pat in patterns:
        rx = re.compile(pat, re.I)
        for c in cols:
            if rx.search(c):
                return c
    return None

def safe_log1p(x):
    return np.log1p(pd.to_numeric(x, errors='coerce').clip(lower=0))

def effort_metrics(y_true, y_pred):
    from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = root_mean_squared_error(y_true, y_pred)
    denom = np.maximum(np.abs(y_true), 1e-9)
    mape = np.mean(np.abs((y_true - y_pred) / denom)) * 100
    r2 = r2_score(y_true, y_pred)
    return {'MAE': mae, 'RMSE': rmse, 'MAPE_pct': mape, 'R2': r2}
