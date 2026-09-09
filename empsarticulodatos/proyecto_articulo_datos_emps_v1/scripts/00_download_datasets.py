from pathlib import Path
import requests

RAW = Path('data/raw')
RAW.mkdir(parents=True, exist_ok=True)

DATASETS = {
    'JOSSE_Dataset.zip': 'https://zenodo.org/records/7022735/files/JOSSE_Dataset.zip?download=1',
    'SEERA_Dataset.zip': 'https://zenodo.org/records/4066438/files/The%20SEERA%20Dataset.zip?download=1',
}

for name, url in DATASETS.items():
    dest = RAW / name
    if dest.exists() and dest.stat().st_size > 0:
        print(f'OK existe: {dest}')
        continue
    print(f'Descargando {name}...')
    try:
        with requests.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            with open(dest, 'wb') as f:
                for chunk in r.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
        print(f'OK descargado: {dest}')
    except Exception as exc:
        print(f'No se pudo descargar {name}: {exc}')
        print(f'Descarga manualmente desde: {url}')
