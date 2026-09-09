from common import RAW, extract_zip_if_needed, list_data_files, read_any_table, normalize_columns
from pathlib import Path

zip_files = list(RAW.glob('*.zip'))
if not zip_files:
    print('No hay ZIP en data/raw. Ejecuta 00_download_datasets.py o coloca los ZIP manualmente.')
    raise SystemExit(0)

for z in zip_files:
    print(f'\n=== ZIP: {z.name} ===')
    base = extract_zip_if_needed(z)
    files = list_data_files(base)
    print(f'Archivos tabulares encontrados: {len(files)}')
    for path in files[:20]:
        try:
            df = normalize_columns(read_any_table(path))
            print(f'- {path.relative_to(RAW)} | filas={len(df)} cols={len(df.columns)}')
            print('  columnas:', ', '.join(list(df.columns)[:25]))
        except Exception as exc:
            print(f'- {path.relative_to(RAW)} | ERROR: {exc}')
