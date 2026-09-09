from common import RAW, PROCESSED, extract_zip_if_needed, list_data_files, read_any_table, normalize_columns, find_col, safe_log1p
from pathlib import Path
import pandas as pd
import numpy as np
import yaml
import re

CONFIG = yaml.safe_load(open('config/dataset_columns.yaml', encoding='utf-8'))

CHANGE_WORDS = re.compile(r'\b(change|changed|modify|modified|update|updated|fix|bug|defect|refactor|maintenance|migrate|migration|improve|enhance|requirement|request)\b', re.I)

def pick_largest_table(zip_keyword: str):
    candidates = []
    for z in RAW.glob('*.zip'):
        if zip_keyword.lower() not in z.name.lower():
            continue
        base = extract_zip_if_needed(z)
        for p in list_data_files(base):
            try:
                df = normalize_columns(read_any_table(p))
                if len(df) > 20 and len(df.columns) >= 3:
                    candidates.append((len(df), p, df))
            except Exception:
                pass
    if not candidates:
        return None, None
    candidates.sort(reverse=True, key=lambda x: x[0])
    return candidates[0][1], candidates[0][2]

# JOSSE
josse_path, josse = pick_largest_table('JOSSE')
if josse is not None:
    print(f'Usando JOSSE: {josse_path}')
    cfg = CONFIG.get('josse', {})
    actual = cfg.get('actual_effort') or find_col(josse.columns, [r'actual.*effort', r'effort.*actual', r'time.*spent', r'worklog', r'effort'])
    expert = cfg.get('expert_estimate') or find_col(josse.columns, [r'expert.*estimate', r'estimat', r'story.*point', r'planned'])
    title = cfg.get('title') or find_col(josse.columns, [r'title', r'summary', r'issue.*summary'])
    desc = cfg.get('description') or find_col(josse.columns, [r'description', r'desc', r'text'])
    issue_type = cfg.get('issue_type') or find_col(josse.columns, [r'issue.*type', r'type', r'category'])
    project = cfg.get('project') or find_col(josse.columns, [r'project', r'repository', r'product'])
    if actual is None:
        print('No se detectó columna de esfuerzo real en JOSSE. Ajusta config/dataset_columns.yaml.')
    else:
        out = pd.DataFrame()
        out['actual_effort'] = pd.to_numeric(josse[actual], errors='coerce')
        if expert and expert != actual:
            out['expert_estimate'] = pd.to_numeric(josse[expert], errors='coerce')
        else:
            out['expert_estimate'] = np.nan
        text = ''
        if title:
            text = josse[title].fillna('').astype(str)
        if desc:
            text = (text.astype(str) + ' ' + josse[desc].fillna('').astype(str)) if not isinstance(text, str) else josse[desc].fillna('').astype(str)
        if isinstance(text, str):
            text = pd.Series([''] * len(josse))
        out['text_length'] = text.str.len()
        out['word_count'] = text.str.split().str.len().fillna(0)
        out['is_change_like'] = text.str.contains(CHANGE_WORDS, regex=True).fillna(False).astype(int)
        out['issue_type'] = josse[issue_type].astype(str) if issue_type else 'unknown'
        out['project'] = josse[project].astype(str) if project else 'unknown'
        out = out.dropna(subset=['actual_effort'])
        out = out[out['actual_effort'] > 0]
        out.to_csv(PROCESSED / 'josse_prepared.csv', index=False)
        print(f'OK JOSSE preparado: {len(out)} filas')
else:
    print('No se encontró JOSSE.')

# SEERA
seera_path, seera = pick_largest_table('SEERA')
if seera is not None:
    print(f'Usando SEERA: {seera_path}')
    cfg = CONFIG.get('seera', {})
    effort = cfg.get('effort') or find_col(seera.columns, [r'^effort$', r'effort', r'actual.*effort', r'person.*hour', r'work.*effort'])
    if effort is None:
        print('No se detectó columna de esfuerzo en SEERA. Ajusta config/dataset_columns.yaml.')
    else:
        df = seera.copy()
        df['effort_target'] = pd.to_numeric(df[effort], errors='coerce')
        df = df.dropna(subset=['effort_target'])
        df = df[df['effort_target'] > 0]
        df.to_csv(PROCESSED / 'seera_prepared.csv', index=False)
        print(f'OK SEERA preparado: {len(df)} filas')
else:
    print('No se encontró SEERA.')
