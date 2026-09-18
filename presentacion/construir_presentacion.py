# -*- coding: utf-8 -*-
"""
Genera la presentacion de tesis (PowerPoint 16:9 con guion en las notas),
el guion en Word y el archivo de referencias. Se puede volver a correr cuando
cambien las capturas o las cifras.

Uso: python presentacion/construir_presentacion.py
"""
import io
import os
import re
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image
from docx import Document
from docx.shared import Pt as DPt

AQUI = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(AQUI, "capturas")
ART = os.path.join(AQUI, "..", "empsarticulodatos", "proyecto_articulo_datos_emps_v1")
FIG = os.path.join(ART, "outputs", "figures")

# Paleta del sistema (app/globals.css), sobria y sin colores de plantilla
AZUL = RGBColor(0x0B, 0x49, 0xB0)
AZUL_OSCURO = RGBColor(0x08, 0x2F, 0x6E)
OSCURO = RGBColor(0x0F, 0x17, 0x2A)
GRIS = RGBColor(0x5B, 0x66, 0x7A)
GRIS_CLARO = RGBColor(0xE2, 0xE8, 0xF0)
FONDO = RGBColor(0xF5, 0xF7, 0xFA)
BLANCO = RGBColor(0xFF, 0xFF, 0xFF)
VERDE = RGBColor(0x15, 0x80, 0x3D)
AMBAR = RGBColor(0xB4, 0x53, 0x09)
FUENTE = "Calibri"

ANCHO = Inches(13.333)
ALTO = Inches(7.5)
MARGEN = Inches(0.6)

prs = Presentation()
prs.slide_width = ANCHO
prs.slide_height = ALTO
BLANK = prs.slide_layouts[6]

# ---------------------------------------------------------------- utilidades

def fondo(slide, color=FONDO):
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = color


def caja(slide, left, top, width, height, fill=None, line=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shp.adjustments[0] = 0.04
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid()
        shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(1)
    shp.shadow.inherit = False
    return shp


def texto(slide, left, top, width, height, partes, size=18, color=OSCURO, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, espacio=1.15):
    """partes: str o lista de (texto, {size,color,bold}) por parrafo; un parrafo por elemento."""
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.08)
    tf.margin_top = tf.margin_bottom = Inches(0.04)
    if isinstance(partes, str):
        partes = [(partes, {})]
    first = True
    for item in partes:
        t, o = (item, {}) if isinstance(item, str) else item
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = o.get("align", align)
        p.line_spacing = espacio
        p.space_after = Pt(o.get("after", 6))
        r = p.add_run()
        r.text = t
        f = r.font
        f.name = FUENTE
        f.size = Pt(o.get("size", size))
        f.bold = o.get("bold", bold)
        f.color.rgb = o.get("color", color)
    return tb


def vinetas(slide, left, top, width, height, items, size=18, color=OSCURO):
    partes = []
    for it in items:
        partes.append(("•  " + it, {"size": size, "color": color, "after": 8}))
    return texto(slide, left, top, width, height, partes, size=size, color=color)


def titulo(slide, t, sub=None):
    texto(slide, MARGEN, Inches(0.35), ANCHO - 2 * MARGEN, Inches(0.9), t, size=30, color=AZUL_OSCURO, bold=True)
    barra = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, MARGEN + Inches(0.08), Inches(1.18), Inches(1.2), Inches(0.06))
    barra.fill.solid(); barra.fill.fore_color.rgb = AZUL; barra.line.fill.background()
    if sub:
        texto(slide, MARGEN, Inches(1.3), ANCHO - 2 * MARGEN, Inches(0.6), sub, size=16, color=GRIS)


def fuente(slide, t):
    texto(slide, MARGEN, ALTO - Inches(0.95), ANCHO - 2 * MARGEN - Inches(1.6), Inches(0.55), t, size=10, color=GRIS)


def pie(slide, n):
    texto(slide, ANCHO - MARGEN - Inches(1.5), ALTO - Inches(0.5), Inches(1.5), Inches(0.3), f"{n}", size=10, color=GRIS, align=PP_ALIGN.RIGHT)
    texto(slide, MARGEN, ALTO - Inches(0.5), Inches(6), Inches(0.3), "EMPS Fresnillo  |  Seminario de Tesis 2026  |  UAZ", size=10, color=GRIS)


def imagen(slide, ruta, left, top, max_w, max_h, borde=True):
    im = Image.open(ruta)
    w, h = im.size
    esc = min(max_w / w, max_h / h)
    ancho, alto = int(w * esc), int(h * esc)
    pic = slide.shapes.add_picture(ruta, left, top, width=ancho, height=alto)
    if borde:
        pic.line.color.rgb = GRIS_CLARO
        pic.line.width = Pt(0.75)
    return pic


def cifras(slide, top, datos, left=None, width=None, size_num=40):
    """datos: lista de (numero, leyenda). Se reparten en columnas iguales."""
    left = MARGEN if left is None else left
    width = (ANCHO - 2 * MARGEN) if width is None else width
    n = len(datos)
    gap = Inches(0.25)
    w = int((width - gap * (n - 1)) / n)
    for i, (num, ley) in enumerate(datos):
        x = left + i * (w + gap)
        caja(slide, x, top, w, Inches(2.0), fill=BLANCO, line=GRIS_CLARO)
        texto(slide, x + Inches(0.15), top + Inches(0.15), w - Inches(0.3), Inches(0.9), num, size=size_num, color=AZUL, bold=True)
        texto(slide, x + Inches(0.15), top + Inches(1.0), w - Inches(0.3), Inches(0.95), ley, size=13, color=OSCURO)


def notas(slide, t):
    slide.notes_slide.notes_text_frame.text = t


GUION = []  # (numero, titulo, notas) para el Word


def nueva(t_titulo, t_notas, sub=None):
    s = prs.slides.add_slide(BLANK)
    fondo(s)
    n = len(prs.slides)
    if t_titulo:
        titulo(s, t_titulo, sub)
    pie(s, n)
    notas(s, t_notas)
    GUION.append((n, t_titulo or "Portada", t_notas))
    return s


# ---------------------------------------------------------------- diapositivas

# 1. Portada
s = prs.slides.add_slide(BLANK)
fondo(s, AZUL_OSCURO)
franja = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.35), ALTO)
franja.fill.solid(); franja.fill.fore_color.rgb = AZUL; franja.line.fill.background()
imagen(s, os.path.join(CAP, "logo_emps.png"), Inches(0.9), Inches(0.7), Inches(1.1), Inches(1.1), borde=False)
texto(s, Inches(2.2), Inches(0.75), Inches(9), Inches(1.0), [("Universidad Autónoma de Zacatecas", {"size": 18, "color": BLANCO, "bold": True}), ("Ingeniería en Software  |  Seminario de Tesis  |  Agosto a diciembre de 2026", {"size": 14, "color": GRIS_CLARO})])
texto(s, Inches(0.9), Inches(2.3), Inches(11.5), Inches(2.4), [
    ("Estimación temprana de esfuerzo, tiempo y costo en proyectos de software para gobiernos municipales", {"size": 32, "color": BLANCO, "bold": True}),
    ("Propuesta metodológica para el control de cambios, con referencia a Fresnillo, Zacatecas", {"size": 20, "color": GRIS_CLARO}),
])
texto(s, Inches(0.9), Inches(5.0), Inches(7.5), Inches(1.9), [
    ("Rogelio Flores Rodríguez", {"size": 20, "color": BLANCO, "bold": True}),
    ("Matrícula 22304084  |  Semestre 8, grupo D, modalidad semiescolarizada", {"size": 14, "color": GRIS_CLARO}),
    ("Directora de tesis: Dra. Julieta Guadalupe Rodríguez Ruiz", {"size": 14, "color": GRIS_CLARO}),
    ("Sistema en línea: estimacion.hazlatarea.com", {"size": 14, "color": GRIS_CLARO}),
])
esc = caja(s, Inches(10.6), Inches(5.0), Inches(1.9), Inches(1.9), fill=None, line=GRIS_CLARO)
texto(s, Inches(10.6), Inches(5.55), Inches(1.9), Inches(0.8), "Escudo UAZ\n(colocar aquí)", size=11, color=GRIS_CLARO, align=PP_ALIGN.CENTER)
notas(s, "Buenas tardes. Soy Rogelio Flores Rodríguez, alumno de octavo semestre de Ingeniería en Software en la Universidad Autónoma de Zacatecas, y esta es la presentación de avance de mi tesis en el Seminario de Tesis, con la dirección de la doctora Julieta Guadalupe Rodríguez Ruiz. El tema es la estimación temprana de esfuerzo, tiempo y costo de software para gobiernos municipales, con un sistema que ya funciona en línea y que voy a mostrar. La presentación dura unos veinte minutos: primero el problema y lo que cambió con la inteligencia artificial, luego la hipótesis y lo que ya demostré con datos públicos, después el sistema, y al final cómo lo voy a validar con ayuntamientos y proveedores y cómo se va a decidir el modelo. Nota para el video: antes de grabar, colocar el escudo de la UAZ en el recuadro de la derecha.")
GUION.append((1, "Portada", s.notes_slide.notes_text_frame.text))

# 2. El problema
s = nueva("El problema, en una frase por lado", "Empiezo por el problema, porque la tesis nació de una mesa con dos lados. De un lado está el Ayuntamiento: una dirección de Catastro, de Tesorería o de Innovación que necesita un sistema y recibe cotizaciones que no puede comparar, y que no sabe si el proveedor que le cotizó barato va a poder terminar. Del otro lado está el proveedor, muchas veces un desarrollador independiente o una empresa de tres o cuatro personas, que sabe programar pero no sabe cuánto cobrar: cobra caro y pierde el contrato, o cobra barato, se queda sin dinero a la mitad y no termina. Los datos públicos dicen que eso no es una impresión: en el dataset SEERA, ocho de cada diez proyectos costaron más esfuerzo del estimado, con una desviación mediana de más de cincuenta y ocho por ciento; y en las estimaciones de expertos de proyectos de Jira, solo cuatro de cada diez cayeron dentro de más o menos quince por ciento del valor real. Estimar mal no es la excepción: es lo normal.")
caja(s, MARGEN, Inches(1.9), Inches(5.9), Inches(2.6), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(0.2), Inches(2.0), Inches(5.5), Inches(2.4), [("El Ayuntamiento", {"size": 20, "color": AZUL, "bold": True}), ("Recibe cotizaciones que no puede comparar y no sabe si el proveedor que cotizó barato va a poder terminar.", {"size": 16})])
caja(s, MARGEN + Inches(6.2), Inches(1.9), Inches(5.9), Inches(2.6), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(6.4), Inches(2.0), Inches(5.5), Inches(2.4), [("El proveedor", {"size": 20, "color": AZUL, "bold": True}), ("Sabe programar, pero no sabe cuánto cobrar: si cobra caro pierde el contrato; si cobra barato se queda sin dinero a la mitad.", {"size": 16})])
cifras(s, Inches(4.75), [("8 de 10", "proyectos costaron más esfuerzo del estimado (SEERA, 120 proyectos, desviación mediana +58.6 %)"), ("4 de 10", "estimaciones de expertos caen dentro de más o menos 15 % del real (4,329 tareas de Jira)")])
fuente(s, "Fuente: artículo propio con los datasets públicos SEERA (120 proyectos, 42 organizaciones) y tareas de Jira con estimación experta (n = 4,329). Métricas MdMRE y PRED(15).")

# 3. Lo que cambio
s = nueva("Lo que cambió mientras hacía la tesis", "Cuando empecé, hace año y medio, la pregunta era cuántas horas de programación lleva un sistema. Hoy la pregunta es otra, porque la forma de hacer software cambió mes con mes. En 2024, seis de cada diez desarrolladores usaban inteligencia artificial; en 2025, casi ocho; en 2026, ocho y medio, y lo nuevo no es el asistente que completa una línea, sino el agente que hace la tarea completa: la encuesta de JetBrains de agosto de este año, con quince mil profesionales, dice que nueve de cada diez usan agentes de código cada semana y siete de cada diez todos los días. GitHub reporta que cuarenta y uno por ciento del código nuevo ya se genera con inteligencia artificial. Esto no es una moda de programadores: Gartner valuó el mercado de agentes de código en diez mil millones de dólares en abril. Para la tesis significa una cosa: un modelo de estimación que asuma que las horas de programación son el centro del costo ya nació viejo.", sub="Uso de inteligencia artificial para programar, por año")
cifras(s, Inches(2.0), [("62 %", "2024"), ("78 %", "2025"), ("84 %", "2026"), ("90 %", "usa agentes de código cada semana; 68 % todos los días (2026)")])
vinetas(s, MARGEN, Inches(4.35), ANCHO - 2 * MARGEN, Inches(1.9), [
    "41 % del código nuevo se reporta como generado con inteligencia artificial (GitHub Octoverse, octubre 2025).",
    "El mercado de agentes de código para empresas vale ya diez mil millones de dólares al año (Gartner, mayo 2026).",
    "Un modelo de estimación que asume que las horas de programación son el centro del costo ya nació viejo.",
], size=16)
fuente(s, "Fuentes: Stack Overflow Developer Survey 2024, 2025 y 2026 (49,000 respuestas en 2026); JetBrains, adopción de agentes, agosto 2026 (15,000 profesionales); GitHub Octoverse 2025; Gartner, 20 de mayo de 2026.")

# 4. Pero no es igual para todos
s = nueva("Pero la ganancia no es igual para todos", "Ahora la otra cara, porque una tesis no puede repetir el folleto. La inteligencia artificial no hace a todos más rápidos ni hace todo mejor. El estudio más citado del año pasado, de METR, midió con un ensayo controlado a desarrolladores experimentados en sus propios repositorios: tardaron diecinueve por ciento más con inteligencia artificial, y creían que habían sido veinte por ciento más rápidos. GitClear analizó seiscientos veintitrés millones de cambios de código y encontró que la duplicación subió ochenta y uno por ciento y la refactorización cayó setenta. Veracode probó más de ciento cincuenta modelos: cuarenta y cinco por ciento del código que generan trae una falla de seguridad, y esa cifra lleva dos años sin mejorar. Y LinearB, con ocho millones de solicitudes de cambio, encontró que las hechas con inteligencia artificial se fusionan en treinta días solo una de cada tres veces, contra ocho de cada diez sin ella. La conclusión para estimar es clara: la ganancia depende de la forma de hacerlo y de la pericia de quien usa la herramienta. Por eso el sistema las trata como dos variables separadas, no como un descuento parejo.")
cifras(s, Inches(1.9), [("-19 %", "de velocidad en desarrolladores experimentados con IA en su propio código; creían ser 20 % más rápidos (METR, 2025)"), ("+81 % y -70 %", "duplicación de código y refactorización, en 623 millones de cambios (GitClear, enero 2026)"), ("45 %", "del código generado trae una falla de seguridad; dos años sin mejorar (Veracode, marzo 2026)"), ("33 % y 84 %", "solicitudes de cambio fusionadas en 30 días, con IA y sin IA (LinearB, 8.1 millones de PRs, 2026)")], size_num=26)
caja(s, MARGEN, Inches(4.35), ANCHO - 2 * MARGEN, Inches(1.5), fill=BLANCO, line=AZUL)
texto(s, MARGEN + Inches(0.3), Inches(4.5), ANCHO - 2 * MARGEN - Inches(0.6), Inches(1.3), [("La ganancia depende de la forma de hacerlo y de la pericia de quien usa la herramienta.", {"size": 20, "color": AZUL_OSCURO, "bold": True}), ("Por eso el sistema las cobra y las acredita por separado, en vez de aplicar un descuento parejo.", {"size": 16})])
fuente(s, "Fuentes: METR, julio 2025 y actualización de febrero 2026; GitClear, The Maintainability Gap, enero 2026; Veracode, GenAI Code Security, marzo 2026; LinearB, Software Engineering Benchmarks 2026.")

# 5. Los detalles ya no llevan ticket
s = nueva("Los detalles ya no llevan ticket", "Hay algo que aprendí haciendo el sistema y que los números de 2026 confirman: construir el sistema es más rápido, pero lo que más cambió es el detalle. El ajuste chico, que este texto no se ve bien, que este campo debe validar, antes era un ticket, una espera y a veces un cobro aparte. Hoy se resuelve en la misma sesión. Atlassian lo midió en tres mil cuatrocientos repositorios: adoptar inteligencia artificial subió diecinueve por ciento las solicitudes de cambio terminadas y ahorró de dos a cuatro horas por desarrollador a la semana, y el efecto fue mayor en los repositorios chicos, que son justo los de un proveedor municipal. Un estudio de julio en una empresa real con ochocientos desarrolladores midió el doble de rendimiento por persona, aunque también el doble de carga para quien revisa. Y de ocho mil solicitudes de corrección hechas por agentes, dos de cada tres se aceptaron. Para la tesis esto tiene dos consecuencias. La primera es para el que cobra: el desarrollador que sigue cobrando el mantenimiento como si cada detalle costara un día se va a quedar sin clientes, porque llega otro y lo hace en una tarde. La segunda es para el sistema: por eso los rangos de costo de cada cambio ahora se ajustan por la forma de hacerlo. Con casi todo con inteligencia artificial y un equipo que la domina, una corrección menor lleva de una hora y media a cinco, no de dos a ocho, y la pantalla lo dice.")
imagen(s, os.path.join(CAP, "11_preguntas_del_patron.png"), Inches(7.0), Inches(1.9), Inches(5.75), Inches(4.4))
vinetas(s, MARGEN, Inches(1.9), Inches(6.2), Inches(3.3), [
    "Atlassian, 3,400 repositorios: +19 % de solicitudes de cambio terminadas y 2 a 4 horas ahorradas por persona a la semana; más efecto en repositorios chicos (37 % a 51 %).",
    "Empresa real con 802 desarrolladores: 2.09 veces el rendimiento por persona, con el doble de carga para quien revisa.",
    "De 8,106 correcciones hechas por agentes, 65 % se aceptaron (Codex 82 %, Cursor 68 %, Claude Code 57 %).",
], size=15)
caja(s, MARGEN, Inches(5.25), Inches(6.2), Inches(1.15), fill=BLANCO, line=AZUL)
texto(s, MARGEN + Inches(0.2), Inches(5.35), Inches(5.8), Inches(1.0), "Quien sigue cobrando cada detalle como un día de trabajo se queda sin clientes. El sistema ya ajusta los rangos de cada cambio por la forma de hacerlo.", size=15, color=AZUL_OSCURO, bold=True)
fuente(s, "Fuentes: Atlassian, mayo 2026 (cuasi experimento con emparejamiento por propensión); arXiv 2607.01904, julio 2026; arXiv 2602.00164, enero 2026. Captura: tarjeta de cambios del sistema con las horas ajustadas.")

# 6. Pregunta e hipotesis
s = nueva("Pregunta e hipótesis", "Con ese terreno, esta es la pregunta de investigación: si se puede estimar desde el inicio, con las variables que un Ayuntamiento y un proveedor sí conocen, el costo y el tiempo de un sistema municipal con un error útil para decidir. La hipótesis del sistema es que la estimación temprana mejora cuando en una misma base de datos y en un mismo cálculo se integran los requerimientos, los cambios, la forma de hacerlo, el equipo, las obligaciones fiscales y laborales, el flujo de efectivo y el mantenimiento. Y las tres hipótesis operacionales del artículo, que ya se probaron con datos públicos, son: uno, que el juicio experto por sí solo es insuficiente; dos, que las tareas de cambio tienen una distribución de esfuerzo distinta; y tres, que las variables tempranas superan a la línea base del promedio. Adelanto que la segunda no se confirmó, y eso también es un resultado.")
caja(s, MARGEN, Inches(1.9), ANCHO - 2 * MARGEN, Inches(1.25), fill=BLANCO, line=AZUL)
texto(s, MARGEN + Inches(0.25), Inches(2.0), ANCHO - 2 * MARGEN - Inches(0.5), Inches(1.1), [("Pregunta", {"size": 13, "color": GRIS, "bold": True}), ("¿Se puede estimar desde el inicio, con las variables que un Ayuntamiento y un proveedor sí conocen, el costo y el tiempo de un sistema municipal con un error útil para decidir?", {"size": 17, "color": AZUL_OSCURO, "bold": True})])
caja(s, MARGEN, Inches(3.35), Inches(5.9), Inches(2.9), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(0.2), Inches(3.45), Inches(5.5), Inches(2.7), [("Hipótesis del sistema", {"size": 13, "color": GRIS, "bold": True}), ("La estimación temprana mejora cuando en una misma base de datos y en un mismo cálculo se integran requerimientos, cambios, forma de hacerlo, equipo, obligaciones fiscales y laborales, flujo de efectivo y mantenimiento.", {"size": 15})])
caja(s, MARGEN + Inches(6.2), Inches(3.35), Inches(5.9), Inches(2.9), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(6.4), Inches(3.45), Inches(5.5), Inches(2.7), [("Hipótesis del artículo (ya probadas con datos públicos)", {"size": 13, "color": GRIS, "bold": True}), ("H1. El juicio experto por sí solo es insuficiente: la mayoría de las estimaciones se sale de más o menos 15 %.", {"size": 14}), ("H2. Las tareas de cambio o mantenimiento tienen una distribución de esfuerzo distinta.", {"size": 14}), ("H3. Las variables tempranas superan a la línea base del promedio (R2 positivo, menor MAE).", {"size": 14})])
fuente(s, "Fuentes: Actividad 1, Radiografía de mi tesis (agosto 2026); addendum 25 de validación científica; artículo con SEERA y tareas de Jira (septiembre 2026).")

# 7. Lo que ya se demostro
s = nueva("Lo que ya se demostró con datos públicos", "Estos son los resultados del artículo, con dos datasets públicos que no hice yo: ciento veinte proyectos completos de cuarenta y dos organizaciones, y veintitrés mil tareas de Jira de trescientos setenta y un proyectos de código abierto, de las cuales cuatro mil trescientas veintinueve traían estimación experta. La gráfica de la izquierda compara la estimación del experto con el esfuerzo real; la diagonal sería la estimación perfecta. La correlación es alta, el experto sí ordena qué es grande y qué es chico, pero no dimensiona: solo cuarenta por ciento cae dentro de más o menos quince por ciento. La de la derecha son los proyectos completos: ochenta y uno por ciento subestimados. Con las variables que se conocen al inicio, un bosque aleatorio alcanzó un R cuadrado de cero punto ochenta y uno en los proyectos completos, contra cero de la línea base. La segunda hipótesis no se confirmó: detectar cambios por palabras clave en el texto de la tarea no separa nada, con un valor p de cero punto cincuenta y siete; por eso el sistema captura los cambios de forma estructurada y no los adivina del texto. Todo esto está verificado por un script independiente, veintiséis de veintiséis comprobaciones. Nota para el video: antes de citar el nombre del dataset de tareas de Jira, confirmar cómo se llama en la fuente de Zenodo, porque el nombre corto que usamos en el artículo no aparece en la literatura.")
imagen(s, os.path.join(FIG, "josse_expert_vs_actual.png"), MARGEN, Inches(1.85), Inches(4.3), Inches(3.1))
imagen(s, os.path.join(FIG, "seera_estimate_vs_actual.png"), MARGEN + Inches(4.5), Inches(1.85), Inches(4.3), Inches(3.1))
vinetas(s, MARGEN + Inches(9.0), Inches(1.85), Inches(3.2), Inches(4.4), [
    "Tareas de Jira con estimación experta (n = 4,329): correlación 0.79, pero solo 40 % dentro de más o menos 15 %.",
    "Proyectos completos (SEERA, n = 120): 81 % subestimados; desviación mediana +58.6 %.",
    "Con variables tempranas, bosque aleatorio R2 = 0.81 (SEERA); regresión lineal R2 = 0.39 (Jira).",
    "H2 no se confirmó: p = 0.57. Los cambios se capturan estructurados, no se adivinan del texto.",
], size=13)
texto(s, MARGEN, Inches(5.05), Inches(8.8), Inches(1.0), "Izquierda: estimación experta contra esfuerzo real por tarea. Derecha: estimación contra real por proyecto. La diagonal es la estimación perfecta.", size=12, color=GRIS)
fuente(s, "Fuente: artículo propio, septiembre 2026; datasets públicos en Zenodo; verificación independiente 26 de 26 (scripts/05_verify_results.py).")

# 8. Que es EMPS
s = nueva("EMPS Fresnillo: el sistema que ya funciona", "Este es el sistema. Se llama EMPS Fresnillo, Estimador Municipal de Proyectos de Software, está en línea en estimacion punto hazlatarea punto com, no pide cuenta ni contraseña, y contesta cuatro cosas que cualquier patrón entiende: cuánto va a costar, cuánto va a tardar, si le alcanza con el dinero que tiene, y con qué forma de hacerlo. Está hecho para los dos lados de la mesa: al del Ayuntamiento le dice si el proveedor va a poder; al proveedor le dice cuánto cobrar sin quedarse sin dinero. Lo construí con Next.js y una base de datos relacional; el motor de cálculo es determinista y auditable, y cada estimación guarda la copia de los parámetros con que se calculó.", sub="Cuánto cuesta, cuánto tarda, si alcanza y con qué forma de hacerlo. Sin cuenta ni contraseña.")
imagen(s, os.path.join(CAP, "01_portada.png"), MARGEN, Inches(1.95), Inches(7.6), Inches(4.5))
vinetas(s, MARGEN + Inches(7.9), Inches(1.95), Inches(4.3), Inches(4.4), [
    "En línea: estimacion.hazlatarea.com",
    "Para los dos lados: el Ayuntamiento que cuida el presupuesto y el proveedor que cuida su utilidad.",
    "Motor determinista y auditable: cada estimación guarda los parámetros con que se calculó.",
    "Cotización en un minuto o proyecto completo en cinco pasos.",
    "Next.js 15, Prisma, MariaDB en el servidor; 206 pruebas automáticas.",
], size=15)
fuente(s, "Captura del sistema, septiembre 2026.")

# 9. Como se calcula
s = nueva("De dónde sale el número: la cadena de cálculo", "Lo que más pedían quienes probaron las primeras versiones era saber de dónde salía el número. Por eso cada resultado trae su cadena de cálculo, renglón por renglón, con la operación en palabras. Empieza por las horas base de las piezas del sistema, que salen de su complejidad, sus pantallas, sus reportes, sus conexiones y si manejan datos personales. Se ajustan por qué tan claro está lo que se quiere y por el riesgo del proyecto. Luego entra la forma de hacerlo, que ahorra horas según la pericia del equipo; las semanas salen de dividir entre la capacidad del equipo y su velocidad; y el costo mensual suma sueldos con todas sus cargas, herramientas de inteligencia artificial, otras herramientas y administración. Sobre el costo va la utilidad y el IVA. Cualquiera puede rehacer la cuenta con una calculadora y le va a dar, con menos de un peso por cada mil de diferencia por el redondeo.")
imagen(s, os.path.join(CAP, "04_cadena_de_calculo.png"), MARGEN, Inches(1.5), Inches(7.4), Inches(5.3))
vinetas(s, MARGEN + Inches(7.7), Inches(1.6), Inches(4.5), Inches(5.0), [
    "Horas base de las piezas: complejidad, pantallas, reportes, conexiones, datos personales.",
    "Ajustes por claridad de lo que se quiere y por riesgo del proyecto (cambios, cliente ausente, rotación).",
    "Forma de hacerlo: ahorra horas según la pericia del equipo con la IA.",
    "Semanas = horas entre capacidad del equipo por velocidad. Meses = semanas entre 4.33.",
    "Costo = (sueldos con cargas + herramientas de IA + otras herramientas + administración) por meses.",
    "Utilidad, IVA y total. Cada renglón sale del anterior.",
], size=14)
fuente(s, "Captura: cadena de cálculo del proyecto de ejemplo, forma híbrida, escenario probable.")

# 10. Cinco formas de hacerlo
s = nueva("La forma de hacerlo pesa más que el precio", "Este es el hallazgo que sostiene la tesis. El mismo proyecto, con el mismo equipo, se calcula en cinco formas de hacerlo: todo a mano, con ayuda de inteligencia artificial, híbrido, casi todo con inteligencia artificial, y con plataformas de armado sin programar. En el proyecto de ejemplo, un sistema integral de trámites con ocho piezas y cuatro personas, hacerlo a mano cuesta dos millones novecientos mil pesos, casi todo con inteligencia artificial seiscientos cuarenta y cinco mil, y con plataforma de armado trescientos diez mil. Nueve veces de diferencia. Por eso el sistema no da un precio: da tres tarjetas, la recomendada, la elegida y la más segura, y dice cuáles formas sirven para este proyecto y cuáles no. Una plataforma de armado no sirve para un sistema con datos personales y cuatro conexiones externas, aunque sea la más barata, y el sistema lo descarta con la razón. Y hacer casi todo con inteligencia artificial no se recomienda a un equipo que nunca la ha usado. La recomendación depende del proyecto y del equipo, no solo del precio.")
imagen(s, os.path.join(CAP, "05_tres_opciones.png"), MARGEN, Inches(1.5), Inches(7.2), Inches(5.0))
for i, (num, ley) in enumerate([("$2.93 M", "todo a mano (30.8 semanas)"), ("$0.65 M", "casi todo con IA (8.4 semanas)"), ("$0.31 M", "plataforma de armado (4.4 semanas)")]):
    y = Inches(1.55) + i * Inches(0.72)
    caja(s, MARGEN + Inches(7.5), y, Inches(4.7), Inches(0.62), fill=BLANCO, line=GRIS_CLARO)
    texto(s, MARGEN + Inches(7.6), y + Inches(0.05), Inches(1.7), Inches(0.5), num, size=22, color=AZUL, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    texto(s, MARGEN + Inches(9.3), y + Inches(0.05), Inches(2.85), Inches(0.5), ley, size=13, anchor=MSO_ANCHOR.MIDDLE)
vinetas(s, MARGEN + Inches(7.5), Inches(3.8), Inches(4.7), Inches(2.6), [
    "Mismo proyecto, mismo equipo: nueve veces de diferencia entre la forma más cara y la más barata.",
    "No todas sirven para todos: se descartan por conexiones, datos personales, criticidad, claridad y pericia del equipo.",
    "Tres tarjetas: la recomendada, la que elegiste y la más segura.",
], size=14)
fuente(s, "Cifras del proyecto de ejemplo (8 piezas, 4 personas técnicas, pericia 3.5 de 5), escenario probable, septiembre 2026.")

# 11. Herramientas y pericia
s = nueva("Las herramientas de IA se cobran y la pericia se acredita", "Aquí está lo que cambió en el motor este mes, y sale de la investigación de precios que hice el nueve de septiembre con las páginas oficiales. Las herramientas se cobran por persona, no por equipo, porque así las licencian: un asiento por cada persona técnica. Con ayuda de inteligencia artificial son unos treinta dólares al mes por persona, híbrido cien, casi todo con inteligencia artificial doscientos cincuenta, y la plataforma de armado cuarenta más veinte por cada usuario final mientras se use el sistema. Como en la vida real cada quien trae su plan, hay tres niveles, básico, típico y máximo, se elige por proyecto, y cada persona puede traer su propio plan. Y la pericia: los ahorros publicados están calibrados para quien usa la herramienta a diario y sabe dar instrucciones; a quien nunca la ha usado solo se le acredita treinta y cinco por ciento del ahorro, porque un modelo muy potente en manos de quien no sabe pedirle las cosas no ahorra tiempo, y eso es exactamente lo que METR midió. Todo entra al costo, al precio y al flujo con el mismo número, sin IVA porque es acreditable, y se puede actualizar cuando los planes suban de precio, que suben.")
imagen(s, os.path.join(CAP, "06b_niveles.png"), MARGEN, Inches(1.5), Inches(7.3), Inches(2.3))
imagen(s, os.path.join(CAP, "06_herramientas_ia.png"), MARGEN, Inches(3.95), Inches(7.3), Inches(2.7))
vinetas(s, MARGEN + Inches(7.6), Inches(1.5), Inches(4.6), Inches(5.2), [
    "Por persona, no por equipo: un asiento por cada persona técnica.",
    "Precio típico por persona al mes: con ayuda de IA 30 USD, híbrido 100, casi todo con IA 250, plataforma de armado 40 más 20 por usuario final.",
    "Tres niveles por proyecto (básico, típico, máximo) y plan propio por persona.",
    "Pericia del equipo: nivel 4 acredita 100 % del ahorro; nivel 1 solo 35 %.",
    "Los planes suben: 15 % anual, solo en el escenario conservador.",
    "Sin IVA (acreditable), a 16.92 pesos por dólar, todo editable y con fuente.",
], size=13)
fuente(s, "Fuentes: páginas de precios de GitHub Copilot, Cursor, Claude y Microsoft Power Apps (9 de septiembre de 2026); Banxico FIX; METR 2025, Google 2024, Peng y otros 2023 para la pericia.")

# 12. Nomina e impuestos
s = nueva("Lo que el desarrollador no ve: nómina, cuotas, impuestos y flujo", "Un desarrollador puede saber programar muy bien y no saber lo que cuesta una nómina. El sistema lo pone en el número: sobre el sueldo van las cuotas patronales del IMSS por ramo, el INFONAVIT, el impuesto sobre nómina de Zacatecas de tres punto cinco por ciento más el diez por ciento para la UAZ, las prestaciones de ley, y si el proyecto pasa de seis meses con gente en nómina, la liquidación que obliga la Ley Federal del Trabajo. Y después está el flujo: el proveedor paga la nómina cada mes pero cobra por anticipo, entregas y pago final, así que hay un mes en el que ya pagó y el cliente no le ha terminado de pagar. En el ejemplo son casi veinte mil pesos que tiene que poner de su bolsa; en proyectos más grandes son cientos de miles. Ese es el mes en el que los proyectos se quedan sin dinero y se abandonan. El sistema lo calcula, lo muestra y le dice al Ayuntamiento si el proveedor va a aguantar.")
imagen(s, os.path.join(CAP, "10_resumen_financiero.png"), MARGEN, Inches(1.5), Inches(12.1), Inches(2.3))
vinetas(s, MARGEN, Inches(4.0), Inches(6.0), Inches(2.6), [
    "IMSS por ramo, INFONAVIT, impuesto sobre nómina de Zacatecas (3.5 % más 10 % UAZ), prestaciones de ley.",
    "Liquidación de la Ley Federal del Trabajo si el proyecto pasa de seis meses con gente en nómina.",
    "El tipo de contrato sí cambia las cargas: honorarios y freelance no pagan IMSS.",
], size=14)
vinetas(s, MARGEN + Inches(6.2), Inches(4.0), Inches(6.0), Inches(2.6), [
    "Flujo mes a mes: se paga la nómina cada mes, se cobra por anticipo, entregas y pago final.",
    "El bache de caja es el mes en que el proveedor ya pagó y el cliente no le ha terminado de pagar.",
    "Ese mes es donde los proyectos se abandonan; el sistema lo muestra a los dos lados.",
], size=14)
fuente(s, "Parámetros fiscales y laborales 2026 verificados contra DOF, CONASAMI, IMSS, INFONAVIT y Secretaría de Finanzas de Zacatecas; todos en la pantalla Fuentes del sistema.")

# 13. Dos lados de la mesa
s = nueva("Dos lados de la misma mesa", "El mismo cálculo se redacta distinto según quién lo lee. El reporte para el Ayuntamiento contesta con veredicto: si va a terminar a tiempo, si el proveedor va a aguantar con su dinero, qué método va a usar, cuánto cuesta cada cambio si lo pide a medio camino y qué no está incluido. Y trae una lista de qué exigir en el contrato. El proveedor ve lo suyo: cuánto cobrar, cuánto va a poner de su bolsa y en qué mes, cuál opción le conviene según su utilidad y su riesgo, y la recomendación con las razones, incluidas las opciones que se descartaron aunque fueran más baratas. Es un mismo número contado desde los dos lados, y eso es lo que permite que se sienten a negociar con la misma información.")
imagen(s, os.path.join(CAP, "07_reporte_municipal.png"), MARGEN, Inches(1.5), Inches(6.0), Inches(4.0))
imagen(s, os.path.join(CAP, "12_recomendacion.png"), MARGEN + Inches(6.2), Inches(1.5), Inches(6.0), Inches(4.0))
texto(s, MARGEN, Inches(5.6), Inches(6.0), Inches(0.9), [("Para el Ayuntamiento", {"size": 15, "color": AZUL, "bold": True}), ("¿Va a terminar a tiempo? ¿El proveedor va a aguantar? ¿Qué método usa? ¿Cuánto cuesta cada cambio? ¿Qué no está incluido?", {"size": 13})])
texto(s, MARGEN + Inches(6.2), Inches(5.6), Inches(6.0), Inches(0.9), [("Para el proveedor", {"size": 15, "color": AZUL, "bold": True}), ("¿Cuánto cobrar? ¿Cuánto pongo de mi bolsa y en qué mes? ¿Cuál opción me conviene y por qué se descartaron las otras?", {"size": 13})])
fuente(s, "Capturas: reporte para el Ayuntamiento y recuadro de recomendación para el proveedor, proyecto de ejemplo.")

# 14. Cotizar en un minuto
s = nueva("Cotizar en un minuto y llevárselo", "Para que la gente lo use, la barrera de entrada tiene que ser cero. Cotizar en un minuto pide tres cosas con las palabras de cualquiera: qué sistema necesitas, qué partes debe tener, y cuánto dinero tienes y para cuándo; más quién va a resolver dudas del lado del cliente y si el equipo ya programa con inteligencia artificial. Con eso crea el proyecto con valores típicos, corre las quince estimaciones en menos de un segundo y cae en la pantalla del resultado, con la invitación a afinar. Y el resultado se puede compartir con un enlace de solo lectura que no pide cuenta, para que el jefe de área se lo mande a su director o al proveedor. El sistema mide cuánto tarda cada persona en llegar a su primera cifra, y esa es una de las métricas del piloto.")
imagen(s, os.path.join(CAP, "02_cotizar.png"), MARGEN, Inches(1.5), Inches(6.0), Inches(3.9))
imagen(s, os.path.join(CAP, "14_vista_compartida.png"), MARGEN + Inches(6.2), Inches(1.5), Inches(6.0), Inches(3.9))
vinetas(s, MARGEN, Inches(5.5), ANCHO - 2 * MARGEN, Inches(1.1), [
    "Tres preguntas en lenguaje llano; quince estimaciones en menos de un segundo; sin cuenta ni contraseña.",
    "Enlace de solo lectura para llevar el resultado al director o al proveedor. El sistema mide el tiempo a la primera cifra.",
], size=14)
fuente(s, "Capturas: Cotizar en un minuto y vista compartida de solo lectura.")

# 15. Todo con fuente
s = nueva("Todo con fuente y todo editable", "Un sistema así solo sirve si se le puede creer. Por eso la pantalla de Fuentes muestra los sesenta y cuatro parámetros que usa el cálculo: cuotas del IMSS e INFONAVIT, impuesto sobre nómina, salario mínimo y UMA, IVA e ISR, los factores por forma de hacerlo, los precios de las herramientas de inteligencia artificial y el tipo de cambio, cada uno con su fundamento legal o su fuente, la dirección de consulta y la fecha desde la que rige. Quien estima puede ajustar cualquier valor para sus propias estimaciones sin afectar a los demás, incluidas las tablas de precios, y cada estimación guarda la copia exacta de los parámetros con que se calculó, para que se pueda reproducir meses después aunque los valores hayan cambiado.")
imagen(s, os.path.join(CAP, "08_fuentes.png"), MARGEN, Inches(1.5), Inches(7.6), Inches(4.9))
vinetas(s, MARGEN + Inches(7.9), Inches(1.6), Inches(4.3), Inches(4.8), [
    "64 parámetros con fundamento legal o fuente, dirección y fecha de vigencia.",
    "Fiscales y laborales 2026: DOF, CONASAMI, IMSS, INFONAVIT, Secretaría de Finanzas de Zacatecas.",
    "Factores por forma de hacerlo, precios de herramientas de IA y tipo de cambio, con fecha de consulta.",
    "Editable por quien estima, sin afectar a los demás; las tablas se editan campo por campo.",
    "Cada estimación guarda la copia de sus parámetros: se puede reproducir meses después.",
], size=14)
fuente(s, "Captura: pantalla Fuentes del sistema.")

# 16. Validacion
s = nueva("Cómo se va a validar: piloto en dos olas", "Ahora lo que sigue, que es lo que le pido al seminario que revise. La validación es un piloto en dos olas. La primera con ayuntamientos: Fresnillo primero, con la Dirección de Innovación, y después municipios cercanos de Zacatecas a través de las redes de tesoreros e innovación. La segunda con desarrolladores y empresas pequeñas que cotizan a gobiernos. Cada persona usa el sistema con un proyecto real o con el ejemplo, y al pie del resultado contesta cuatro preguntas en treinta segundos: qué tan creíble le pareció la cifra, cuánto pensaba antes de verla, qué forma de hacerlo usaría y qué le faltó. Eso ya está en el sistema y se separa por lado de la mesa. Además se mide sin preguntar: cuánto tarda cada persona en llegar a su primera cifra, cuántos empiezan y no terminan, y qué forma de hacerlo eligen. Y cuando un proyecto termina, se captura lo que costó de verdad. Con quince casos terminados, el sistema calcula solo las mismas métricas del artículo, error mediano y proporción dentro de quince por ciento, y da un veredicto sobre la hipótesis.")
imagen(s, os.path.join(CAP, "09_encuesta_piloto.png"), MARGEN, Inches(1.5), Inches(6.2), Inches(3.1))
imagen(s, os.path.join(CAP, "15_panel_investigador.png"), MARGEN + Inches(6.4), Inches(1.5), Inches(5.8), Inches(3.1))
caja(s, MARGEN, Inches(4.75), Inches(5.9), Inches(1.75), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(0.2), Inches(4.8), Inches(5.5), Inches(1.7), [("Ola 1: ayuntamientos", {"size": 14, "color": AZUL, "bold": True}), ("Fresnillo (Dirección de Innovación) y municipios cercanos de Zacatecas. Sesión de 30 minutos, proyecto real o ejemplo, encuesta de salida.", {"size": 13})])
caja(s, MARGEN + Inches(6.2), Inches(4.75), Inches(5.9), Inches(1.75), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(6.4), Inches(4.8), Inches(5.5), Inches(1.7), [("Ola 2: desarrolladores y empresas pequeñas", {"size": 14, "color": AZUL, "bold": True}), ("Cotización rápida de un proyecto real y comparación con lo que cobrarían. Se mide credibilidad, cifra esperada, forma elegida y tiempo a la primera cifra.", {"size": 13})])
fuente(s, "Qué se mide: credibilidad (1 a 5), desviación entre lo esperado y lo calculado, forma elegida, tiempo a la primera cifra, abandono, y estimado contra real. Con 15 casos terminados: MdMRE y PRED(15), igual que en el artículo.")

# 17. Como se difunde
s = nueva("Cómo llega a los ayuntamientos y a los proveedores", "Sobre la difusión, hay un dato que ayuda a entender el hueco: Llave MX, la identidad digital del gobierno federal, está integrada en doscientos cuarenta y dos sistemas, y solo ocho son municipales, en un país con dos mil cuatrocientos sesenta y nueve municipios. Y el diagnóstico nacional de CIAPEM de este año dice que solo tres de cada diez gobiernos estatales y municipales concilian su recaudación en un solo sistema. Los municipios chicos compran software a proveedores chicos, y ninguno de los dos tiene con qué estimar. Por eso el plan es ir por las redes que ya existen: CIAPEM, que este año convocó un seminario sobre inteligencia artificial para gobiernos municipales, y las asociaciones de tesoreros e innovación de Zacatecas; empezar por Fresnillo, que es el caso de referencia de la tesis; y para los proveedores, la puerta es la cotización rápida y el enlace compartible, que no piden cuenta. La barrera de entrada es cero y eso es deliberado.")
cifras(s, Inches(1.6), [("8 de 242", "sistemas integrados a Llave MX son municipales (ATDT, diciembre 2025), en un país con 2,469 municipios"), ("3 de 10", "gobiernos estatales y municipales concilian su recaudación en un solo sistema (CIAPEM y tapi, 2026)"), ("48 % y 46 %", "de las empresas mexicanas usa IA, y no puede demostrar el retorno (Strand Partners para AWS, agosto 2026)")], size_num=28)
vinetas(s, MARGEN, Inches(3.95), ANCHO - 2 * MARGEN, Inches(2.5), [
    "Fresnillo primero (caso de referencia), luego municipios cercanos por CIAPEM y las redes de tesoreros e innovación de Zacatecas.",
    "Proveedores: cotización rápida y enlace compartible como puerta de entrada; comunidades de desarrolladores locales.",
    "Sin cuenta ni contraseña, en lenguaje de patrón, con el ejemplo público para ver cómo funciona antes de capturar nada.",
], size=15)
fuente(s, "Fuentes: ATDT, 7 de diciembre de 2025; CIAPEM y tapi, Diagnóstico Nacional 2026 de recaudación digital; Strand Partners para AWS, 13 de agosto de 2026.")

# 18. El modelo se decide con datos
s = nueva("El modelo se decide con datos, no antes", "Sobre el modelo: no voy a decir hoy cuál es el modelo que lo va a predecir todo, porque sería mentir. Hoy el motor es determinista y auditable, y esa es una virtud, no una limitación: cada número se puede rehacer a mano. Lo que ya está listo es el método para elegir el modelo cuando haya datos: con quince casos terminados, el sistema entrena y compara una regresión multivariable, un bosque aleatorio y una red neuronal, con las mismas variables tempranas del artículo más las nuevas que este año se volvieron indispensables, la forma de hacerlo, la pericia del equipo y el costo de las herramientas, y da un veredicto con criterios fijados de antemano: R cuadrado de cero punto treinta y cinco y error de quince por ciento. Eso está en la literatura más reciente: un artículo de marzo en Frontiers dice que los modelos clásicos, COCOMO, puntos de función e historias, fallan por razones estructurales cuando quien escribe es un modelo; y una propuesta de agosto, ACEM, plantea que el costo se descompone en tokens, supervisión humana e infraestructura. Mi tesis entra ahí: con datos de ayuntamientos reales, que hoy no existen en ningún lado.")
caja(s, MARGEN, Inches(1.6), Inches(5.9), Inches(2.4), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(0.2), Inches(1.7), Inches(5.5), Inches(2.2), [("Hoy", {"size": 14, "color": GRIS, "bold": True}), ("Motor determinista y auditable: cada número se rehace a mano con la cadena de cálculo. Cero casos reales terminados todavía.", {"size": 15})])
caja(s, MARGEN + Inches(6.2), Inches(1.6), Inches(5.9), Inches(2.4), fill=BLANCO, line=AZUL)
texto(s, MARGEN + Inches(6.4), Inches(1.7), Inches(5.5), Inches(2.2), [("Con 15 casos terminados", {"size": 14, "color": AZUL, "bold": True}), ("El sistema entrena y compara regresión multivariable, bosque aleatorio y red neuronal, y da veredicto con criterios fijados de antemano: R2 de 0.35 y error de 15 %.", {"size": 15})])
vinetas(s, MARGEN, Inches(4.2), ANCHO - 2 * MARGEN, Inches(2.2), [
    "Variables: las tempranas del artículo más la forma de hacerlo, la pericia del equipo y el costo de las herramientas.",
    "Marco 2026: los modelos clásicos fallan por razones estructurales cuando quien escribe es un modelo (Frontiers in AI, marzo 2026); el costo se descompone en tokens, supervisión humana e infraestructura (ACEM, agosto 2026).",
    "No se promete un modelo; se promete el método para elegirlo con datos de ayuntamientos reales, que hoy no existen en ningún lado.",
], size=14)
fuente(s, "Fuentes: Alaswad, Poovammal y Aljaddouh, Frontiers in Artificial Intelligence, 23 de marzo de 2026; El-Ramly, ACEM, arXiv 2608.02582, agosto 2026; lib/research/hypothesis-analysis.ts del sistema.")

# 19. Limites y riesgos
s = nueva("Límites y riesgos, dichos de frente", "Los límites, dichos de frente. Uno: todavía no hay casos reales terminados, así que la validación del sistema es lo que sigue, no lo que ya pasó; lo que sí está probado es la hipótesis con datos públicos. Dos: los precios de las herramientas y los factores de productividad cambian mes con mes; por eso todos son parámetros con fecha, editables, y no constantes del código. Tres: el sistema estima, no dictamina; la determinación fiscal y laboral oficial requiere revisión profesional, y lo dice en cada pantalla. Cuatro: la encuesta la contesta quien quiere, así que hay sesgo de quien responde, y por eso también se miden cosas sin preguntar, como el tiempo y el abandono. Y cinco: la evidencia de 2026 sobre inteligencia artificial es contradictoria y en parte de proveedores interesados; en la tesis se separa lo que viene de ensayos controlados de lo que viene de encuestas y folletos.")
vinetas(s, MARGEN, Inches(1.6), ANCHO - 2 * MARGEN, Inches(4.8), [
    "Todavía no hay casos reales terminados: la validación del sistema es lo que sigue; la hipótesis sí está probada con datos públicos.",
    "Los precios de las herramientas y los factores de productividad cambian mes con mes: por eso son parámetros con fecha, editables, no constantes del código.",
    "El sistema estima, no dictamina: la determinación fiscal y laboral requiere revisión profesional, y lo dice en cada pantalla.",
    "La encuesta la contesta quien quiere: hay sesgo de respuesta; por eso también se mide sin preguntar (tiempo, abandono, decisión).",
    "La evidencia de 2026 sobre IA es contradictoria y en parte de proveedores interesados: se separa lo que viene de ensayos controlados de lo que viene de encuestas y folletos.",
], size=17)

# 20. Cronograma
s = nueva("Cronograma del seminario, agosto a diciembre de 2026", "El cronograma del semestre. Agosto: radiografía de la tesis y matriz de seguimiento, entregadas. Septiembre: el sistema con el cobro de herramientas de inteligencia artificial, la pericia del equipo, la cotización rápida, el enlace compartible y la encuesta del piloto, todo desplegado en el servidor; es lo que acabo de mostrar. Octubre: primera ola del piloto con Fresnillo y municipios cercanos. Noviembre: segunda ola con desarrolladores y empresas pequeñas, y análisis de la encuesta y de las métricas de uso. Diciembre: resultados, escritura del capítulo de validación y presentación final. Lo que no depende de mí es cuántos proyectos terminan dentro del semestre; por eso el piloto mide credibilidad y tiempo a la primera cifra, que sí se pueden tener en estas fechas, y deja sembrada la captura del resultado real para después.")
etapas = [("Agosto", "Radiografía de la tesis y matriz de seguimiento. Entregado.", VERDE), ("Septiembre", "Sistema con herramientas de IA, pericia, cotización rápida, enlace compartible y encuesta del piloto, desplegado. Hecho.", VERDE), ("Octubre", "Ola 1 del piloto: Fresnillo y municipios cercanos.", AZUL), ("Noviembre", "Ola 2: desarrolladores y empresas pequeñas. Análisis de encuesta y métricas de uso.", AZUL), ("Diciembre", "Resultados, capítulo de validación y presentación final.", AZUL)]
w = int((ANCHO - 2 * MARGEN - Inches(0.2) * 4) / 5)
for i, (mes, desc, col) in enumerate(etapas):
    x = MARGEN + i * (w + Inches(0.2))
    caja(s, x, Inches(1.7), w, Inches(3.6), fill=BLANCO, line=GRIS_CLARO)
    barra = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(1.7), w, Inches(0.12)); barra.fill.solid(); barra.fill.fore_color.rgb = col; barra.line.fill.background()
    texto(s, x + Inches(0.15), Inches(1.95), w - Inches(0.3), Inches(0.6), mes, size=18, color=col, bold=True)
    texto(s, x + Inches(0.15), Inches(2.55), w - Inches(0.3), Inches(2.6), desc, size=14)
texto(s, MARGEN, Inches(5.5), ANCHO - 2 * MARGEN, Inches(0.9), "Lo que no depende del alumno es cuántos proyectos terminan dentro del semestre; por eso el piloto mide credibilidad y tiempo a la primera cifra, que sí se pueden tener en estas fechas, y deja sembrada la captura del resultado real.", size=14, color=GRIS)

# 21. Cierre
s = nueva("Lo que se pide", "Cierro con lo que pido. Al jurado, retroalimentación sobre el instrumento del piloto: las cuatro preguntas, las métricas y el umbral de quince casos. A los ayuntamientos, treinta minutos para probarlo con un proyecto real; sin cuenta, sin instalación. A los proveedores, cotizar un proyecto real y decirme si la cifra se acerca a lo que cobrarían. La tesis parte de una idea sencilla: los tiempos ya cambiaron, y el que cotiza como antes, o compra como antes, va a perder. Este sistema es una forma de que los dos lados de la mesa vean el mismo número, con todo lo que trae adentro, antes de firmar. Gracias.")
caja(s, MARGEN, Inches(1.6), Inches(3.9), Inches(3.2), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(0.2), Inches(1.7), Inches(3.5), Inches(3.0), [("Al jurado", {"size": 16, "color": AZUL, "bold": True}), ("Retroalimentación sobre el instrumento del piloto: las cuatro preguntas, las métricas y el umbral de 15 casos.", {"size": 14})])
caja(s, MARGEN + Inches(4.1), Inches(1.6), Inches(3.9), Inches(3.2), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(4.3), Inches(1.7), Inches(3.5), Inches(3.0), [("A los ayuntamientos", {"size": 16, "color": AZUL, "bold": True}), ("Treinta minutos para probarlo con un proyecto real. Sin cuenta, sin instalación.", {"size": 14})])
caja(s, MARGEN + Inches(8.2), Inches(1.6), Inches(3.9), Inches(3.2), fill=BLANCO, line=GRIS_CLARO)
texto(s, MARGEN + Inches(8.4), Inches(1.7), Inches(3.5), Inches(3.0), [("A los proveedores", {"size": 16, "color": AZUL, "bold": True}), ("Cotizar un proyecto real y decir si la cifra se acerca a lo que cobrarían.", {"size": 14})])
caja(s, MARGEN, Inches(5.0), ANCHO - 2 * MARGEN, Inches(1.4), fill=AZUL_OSCURO)
texto(s, MARGEN + Inches(0.3), Inches(5.15), ANCHO - 2 * MARGEN - Inches(0.6), Inches(1.1), "Los tiempos ya cambiaron. El que cotiza como antes, o compra como antes, va a perder. Este sistema es una forma de que los dos lados de la mesa vean el mismo número, con todo lo que trae adentro, antes de firmar.", size=18, color=BLANCO, bold=True, anchor=MSO_ANCHOR.MIDDLE)

# 22 y 23. Referencias
REFERENCIAS = [
    "Stack Overflow. Developer Survey 2024, 2025 y 2026. survey.stackoverflow.co. Consultado el 18 de septiembre de 2026.",
    "JetBrains. AI coding agent adoption 2026. blog.jetbrains.com/research/2026/08/ai-coding-agent-adoption-2026. Agosto de 2026.",
    "GitHub. Octoverse 2025. github.blog. 31 de octubre de 2025.",
    "Gartner. Enterprise AI coding agents market. Comunicado del 20 de mayo de 2026.",
    "DORA. State of AI-assisted Software Development 2025 y ROI report 2026. dora.dev.",
    "METR. Measuring the impact of early-2025 AI on experienced open-source developer productivity (julio 2025) y Uplift update (24 de febrero de 2026). metr.org.",
    "GitClear. The Maintainability Gap: AI code quality 2023 to 2026. Enero de 2026.",
    "Veracode. GenAI Code Security, actualización de primavera 2026. 24 de marzo de 2026.",
    "LinearB. Software Engineering Benchmarks 2026. linearb.io.",
    "Atlassian. AI-native SDLC: paying off per developer per week. 31 de mayo de 2026.",
    "arXiv 2607.01904. Longitudinal study of a 2x productivity mandate, 802 developers, 196,212 PRs. Julio de 2026.",
    "arXiv 2602.00164. Empirical study of agent-authored bug-fixing pull requests. Enero de 2026.",
    "Alaswad, Poovammal y Aljaddouh. Toward LLM-aware software effort estimation. Frontiers in Artificial Intelligence. 23 de marzo de 2026.",
    "El-Ramly, M. ACEM: A Cost Estimation Model for Agentic Software Engineering. arXiv 2608.02582. Agosto de 2026.",
    "Shetty y otros. Story Point Estimation Using Large Language Models. arXiv 2603.06276. Marzo de 2026.",
    "SEERA dataset. PROMISE, ACM, 2020. Zenodo. Y dataset de tareas de Jira con estimación experta (Zenodo; confirmar nombre en la fuente).",
    "Strand Partners para AWS. Desbloqueando el potencial de la IA en México 2026. 13 de agosto de 2026.",
    "ATDT. Llave MX y Repositorio Nacional de Tecnología para gobiernos estatales y municipales. 7 de diciembre de 2025.",
    "CIAPEM y tapi. Diagnóstico Nacional 2026 de recaudación digital. ciapem.org. 2026.",
    "Code for America. Government AI Landscape Assessment, segunda edición. 1 de mayo de 2026.",
    "BID Lab y Red de Innovación Local. GovTech Connect. 2026.",
    "Páginas de precios consultadas el 9 de septiembre de 2026: GitHub Copilot, Cursor, Anthropic Claude, Microsoft Power Apps, Google Gemini Code Assist. Banxico, tipo de cambio FIX.",
    "Flores Rodríguez, R. Artículo: Estimación temprana de esfuerzo, tiempo y costo en proyectos de software para gobiernos municipales. Análisis cuantitativo preliminar con datasets públicos. Septiembre de 2026.",
    "Flores Rodríguez, R. Actividad 1, Radiografía de mi tesis. Seminario de Tesis, UAZ. Agosto de 2026.",
    "Leyes: LIVA, LISR, LSS, LFT, LINFONAVIT; DOF, CONASAMI, IMSS; Secretaría de Finanzas de Zacatecas (impuesto sobre nómina 2026).",
]
mitad = (len(REFERENCIAS) + 1) // 2
for k, bloque in enumerate((REFERENCIAS[:mitad], REFERENCIAS[mitad:])):
    s = nueva("Referencias" + (" (1 de 2)" if k == 0 else " (2 de 2)"), "Referencias consultadas, con fecha. Las cifras de la presentación se pueden rastrear a cada una." if k == 0 else "Continúan las referencias. Las fuentes de precios y de tipo de cambio llevan fecha de consulta porque cambian con frecuencia.")
    vinetas(s, MARGEN, Inches(1.5), ANCHO - 2 * MARGEN, Inches(5.3), bloque, size=12, color=OSCURO)

# ---------------------------------------------------------------- salida

def revisar_texto():
    """Sin guiones largos, flechas ni emojis: lo que delata texto de IA."""
    prohibidos = re.compile(u"[–—→←➔➡\U0001F300-\U0001FAFF☀-➿]")
    malos = []
    for i, sl in enumerate(prs.slides, 1):
        for shp in sl.shapes:
            if shp.has_text_frame and prohibidos.search(shp.text_frame.text):
                malos.append((i, shp.text_frame.text[:60]))
        if prohibidos.search(sl.notes_slide.notes_text_frame.text):
            malos.append((i, "notas"))
    return malos

malos = revisar_texto()
if malos:
    raise SystemExit("Hay caracteres que delatan texto de IA: %r" % malos)

salida = os.path.join(AQUI, "tesis_emps_2026.pptx")
prs.save(salida)
print("pptx:", salida, "|", len(prs.slides), "diapositivas")

# Guion en Word con tiempos aproximados (unos 170 palabras por minuto al hablar)
doc = Document()
st = doc.styles["Normal"]; st.font.name = "Calibri"; st.font.size = DPt(11)
doc.add_heading("Guion del video de presentación de tesis", level=1)
doc.add_paragraph("Rogelio Flores Rodríguez. Seminario de Tesis, Ingeniería en Software, UAZ. Septiembre de 2026.")
total_min = 0.0
for n, t, nt in GUION:
    palabras = len(nt.split())
    minutos = palabras / 150.0
    total_min += minutos
    doc.add_heading(f"Diapositiva {n}. {t}", level=2)
    doc.add_paragraph(f"Tiempo aproximado: {minutos:.1f} minutos ({palabras} palabras).")
    doc.add_paragraph(nt)
doc.add_heading("Duración total estimada", level=2)
doc.add_paragraph(f"Unos {total_min:.0f} minutos hablando a ritmo normal. Si el video debe ser más corto, las diapositivas 4, 5 y 12 se pueden resumir a una frase cada una.")
doc.add_heading("Antes de grabar", level=2)
for linea in [
    "Colocar el escudo de la UAZ en el recuadro de la portada.",
    "Confirmar el nombre del dataset de tareas de Jira en la fuente de Zenodo antes de decirlo (en el artículo se llamó JOSSE; ese nombre no aparece en la literatura).",
    "Abrir el sistema en estimacion.hazlatarea.com en otra ventana para mostrarlo en vivo en las diapositivas 8 a 15.",
    "Las cifras del ejemplo son de septiembre de 2026; si se recalcula el ejemplo con parámetros nuevos, actualizar la diapositiva 10.",
]:
    doc.add_paragraph(linea, style="List Bullet")
doc.save(os.path.join(AQUI, "guion_video.docx"))
print("docx: guion_video.docx |", f"{total_min:.0f} minutos aproximados")

with io.open(os.path.join(AQUI, "referencias.md"), "w", encoding="utf-8") as f:
    f.write("# Referencias de la presentación\n\nConsultadas el 18 de septiembre de 2026 salvo donde se indica otra fecha.\n\n")
    for r in REFERENCIAS:
        f.write("- " + r + "\n")
print("md: referencias.md")
