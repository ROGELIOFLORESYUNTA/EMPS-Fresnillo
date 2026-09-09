"""Genera 3 diagramas PNG para la guia de defensa (docs/img/).

1. diagrama_pipeline.png : de donde vienen los datos y como se convierten en articulo
2. diagrama_carpetas.png : mapa de que hay en cada carpeta del proyecto
3. diagrama_relacion.png : como se conecta documento previo -> articulo -> sistema EMPS

Estilo: cajas simples, texto en espanol, sin adornos.
"""
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

IMG = Path("docs/img")
IMG.mkdir(parents=True, exist_ok=True)

AZUL = "#dbeafe"
VERDE = "#dcfce7"
AMARILLO = "#fef9c3"
NARANJA = "#ffedd5"
GRIS = "#f1f5f9"
BORDE = "#334155"


def caja(ax, x, y, w, h, titulo, lineas, color):
    rect = mpatches.FancyBboxPatch(
        (x, y), w, h, boxstyle="round,pad=0.02",
        facecolor=color, edgecolor=BORDE, linewidth=1.4,
    )
    ax.add_patch(rect)
    ax.text(x + w / 2, y + h - 0.09, titulo, ha="center", va="top",
            fontsize=11, fontweight="bold", color="#0f172a")
    cuerpo = "\n".join(lineas)
    ax.text(x + w / 2, y + h / 2 - 0.05, cuerpo, ha="center", va="center",
            fontsize=8.5, color="#1e293b")


def flecha(ax, x1, y1, x2, y2, etiqueta="", offset=0.06):
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle="-|>", color=BORDE, linewidth=1.6),
    )
    if etiqueta:
        ax.text((x1 + x2) / 2, (y1 + y2) / 2 + offset, etiqueta,
                ha="center", va="bottom", fontsize=8, style="italic", color="#475569")


# ============================================================
# 1) PIPELINE: de internet al articulo
# ============================================================
fig, ax = plt.subplots(figsize=(13, 4.2))
ax.set_xlim(0, 13)
ax.set_ylim(0, 4.2)
ax.axis("off")

caja(ax, 0.2, 1.4, 1.9, 1.6, "Internet\n(Zenodo)",
     ["JOSSE y SEERA", "publicados por", "investigadores"], AZUL)
caja(ax, 2.5, 1.4, 1.9, 1.6, "data/raw/",
     ["los 2 ZIP", "descargados", "(sin modificar)"], AMARILLO)
caja(ax, 4.8, 1.4, 1.9, 1.6, "Extracción",
     ["JOSSE: SQLite", "SEERA: ARFF", "se leen con Python"], NARANJA)
caja(ax, 7.1, 1.4, 1.9, 1.6, "data/processed/",
     ["CSVs limpios:", "23,186 tareas", "120 proyectos"], AMARILLO)
caja(ax, 9.4, 1.4, 1.9, 1.6, "outputs/",
     ["tablas (CSV)", "figuras (PNG)", "de los modelos"], VERDE)
caja(ax, 11.5, 1.4, 1.3, 1.6, "article/",
     ["main.pdf", "(el artículo)"], VERDE)

flecha(ax, 2.1, 2.2, 2.5, 2.2)
flecha(ax, 4.4, 2.2, 4.8, 2.2)
flecha(ax, 6.7, 2.2, 7.1, 2.2)
flecha(ax, 9.0, 2.2, 9.4, 2.2)
flecha(ax, 11.3, 2.2, 11.5, 2.2)

# etiquetas de los scripts debajo de cada flecha (fuera de las cajas)
for cx, txt in [(2.3, "script 00"), (4.6, "script 01"), (6.9, "script 02b"),
                (9.2, "scripts 03 y 03b"), (11.4, "script 04b")]:
    ax.text(cx, 1.25, txt, ha="center", va="top", fontsize=8,
            style="italic", color="#475569")

ax.text(6.5, 3.7, "De dónde salen los datos y cómo se convierten en el artículo",
        ha="center", fontsize=13, fontweight="bold")
ax.text(6.5, 0.55, "Cada flecha es un script de Python que está en la carpeta scripts/. "
                   "El script 05 verifica al final que todos los números sean correctos (26/26).",
        ha="center", fontsize=9, color="#475569")
plt.tight_layout()
plt.savefig(IMG / "diagrama_pipeline.png", dpi=140, bbox_inches="tight")
plt.close()

# ============================================================
# 2) MAPA DE CARPETAS
# ============================================================
fig, ax = plt.subplots(figsize=(11, 6.6))
ax.set_xlim(0, 11)
ax.set_ylim(0, 6.6)
ax.axis("off")

ax.text(5.5, 6.3, "Mapa del proyecto: empsarticulodatos / proyecto_articulo_datos_emps_v1",
        ha="center", fontsize=12.5, fontweight="bold")

filas = [
    ("data/raw/", "LAS BASES DE DATOS originales: JOSSE_Dataset.zip y SEERA_Dataset.zip,\ntal como se bajaron de Zenodo (más sus carpetas extraídas)", AMARILLO),
    ("data/processed/", "Los CSV ya limpios que usan los modelos:\njosse_prepared.csv, josse_expert_subset.csv, seera_prepared.csv, seera_estimate_deviation.csv", AMARILLO),
    ("scripts/", "TODO EL CÓDIGO (13 archivos Python):\n00 descarga · 01 inspecciona · 02b extrae · 03 modelos · 03b hipótesis · 04b tablas LaTeX · 05 verifica · 06 diagramas", NARANJA),
    ("outputs/", "LOS RESULTADOS: tables/ (6 tablas CSV con las métricas)\ny figures/ (las 6 gráficas PNG que aparecen en el artículo)", VERDE),
    ("article/", "EL ARTÍCULO: main.pdf (para entregar), articulo_editable.docx (para editar tú),\nmain.tex (la fuente), references.bib (las citas)", AZUL),
    ("docs/", "LAS GUÍAS: esta guía de defensa (.md y .docx), la selección de datasets,\nla metodología y las imágenes de apoyo (img/)", GRIS),
]
y = 5.75
for nombre, desc, color in filas:
    caja(ax, 0.4, y - 0.78, 2.6, 0.82, nombre, [], color)
    ax.text(3.35, y - 0.37, desc, ha="left", va="center", fontsize=9, color="#1e293b")
    y -= 0.92

plt.tight_layout()
plt.savefig(IMG / "diagrama_carpetas.png", dpi=140, bbox_inches="tight")
plt.close()

# ============================================================
# 3) RELACION: documento previo -> articulo -> sistema
# ============================================================
fig, ax = plt.subplots(figsize=(12, 4.8))
ax.set_xlim(0, 12)
ax.set_ylim(0, 4.8)
ax.axis("off")

caja(ax, 0.3, 1.5, 3.2, 2.0, "1. Documento previo\n(Seminario)",
     ["Tu entrega anterior (.docx):", "introducción, literatura y", "métodos, PERO sin resultados.", "La maestra pidió resultados."], GRIS)
caja(ax, 4.4, 1.5, 3.2, 2.0, "2. Este artículo\n(main.pdf)",
     ["La MISMA investigación,", "ahora CON resultados reales:", "JOSSE + SEERA, modelos,", "tablas, figuras y veredictos."], AZUL)
caja(ax, 8.5, 1.5, 3.2, 2.0, "3. Sistema EMPS-Fresnillo\n(en línea)",
     ["estimacion.hazlatarea.com", "El prototipo que captura", "casos municipales reales", "para la fase 2 de la tesis."], VERDE)

flecha(ax, 3.5, 2.5, 4.4, 2.5, "evolucionó a")
flecha(ax, 7.6, 2.5, 8.5, 2.5, "justifica y alimenta a")

ax.annotate("", xy=(5.9, 1.45), xytext=(10.1, 1.45),
            arrowprops=dict(arrowstyle="-|>", color="#16a34a", linewidth=1.6,
                            connectionstyle="arc3,rad=0.25"))
ax.text(8.0, 0.55, "cuando el sistema junte 15+ casos reales, esos datos\nvalidarán la hipótesis localmente (trabajo futuro del artículo)",
        ha="center", fontsize=8.5, style="italic", color="#166534")

ax.text(6.0, 4.35, "Cómo se conecta todo: documento, artículo y sistema",
        ha="center", fontsize=13, fontweight="bold")
plt.tight_layout()
plt.savefig(IMG / "diagrama_relacion.png", dpi=140, bbox_inches="tight")
plt.close()

print("OK: 3 diagramas en docs/img/")
