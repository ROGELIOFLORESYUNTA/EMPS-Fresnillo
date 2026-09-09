from common import TABLES, FIGURES, GENERATED
from pathlib import Path
import pandas as pd

def df_to_latex(df, caption, label):
    return df.to_latex(index=False, float_format=lambda x: f'{x:.3f}', caption=caption, label=label, escape=False)

metrics_path = TABLES / 'model_metrics.csv'
summary_lines = []
if metrics_path.exists():
    metrics = pd.read_csv(metrics_path)
    (GENERATED / 'tables.tex').write_text(df_to_latex(metrics, 'Métricas de modelos de estimación de esfuerzo.', 'tab:model_metrics'), encoding='utf-8')
    best = metrics.sort_values(['dataset','RMSE']).groupby('dataset').head(1)
    for _, row in best.iterrows():
        summary_lines.append(
            f"Para {row['dataset']}, el mejor modelo según RMSE fue {row['modelo']} "
            f"(RMSE={row['RMSE']:.3f}, MAE={row['MAE']:.3f}, R2={row['R2']:.3f})."
        )
else:
    (GENERATED / 'tables.tex').write_text('% No se generaron tablas de métricas.\n', encoding='utf-8')
    summary_lines.append('No se generaron métricas porque los datasets no fueron cargados o no se identificaron columnas suficientes.')

change_path = TABLES / 'josse_change_like_stats.csv'
if change_path.exists():
    change = pd.read_csv(change_path)
    (GENERATED / 'change_stats.tex').write_text(df_to_latex(change, 'Esfuerzo observado por tareas con términos asociados a cambio o mantenimiento en JOSSE.', 'tab:change_like'), encoding='utf-8')
else:
    (GENERATED / 'change_stats.tex').write_text('% No se generó tabla de cambio/mantenimiento.\n', encoding='utf-8')

figs = sorted(FIGURES.glob('*.png'))
fig_tex = []
for f in figs:
    fig_tex.append(f"""
\\begin{{figure}}[t]
  \\centering
  \\includegraphics[width=0.95\\linewidth]{{../outputs/figures/{f.name}}}
  \\caption{{{f.stem.replace('_', ' ')}}}
  \\label{{fig:{f.stem}}}
\\end{{figure}}
""")
(GENERATED / 'figures.tex').write_text('\n'.join(fig_tex), encoding='utf-8')
(GENERATED / 'results_summary.tex').write_text('\n\n'.join(summary_lines) + '\n', encoding='utf-8')
print('Assets LaTeX generados en article/generated/')
