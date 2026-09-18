# -*- coding: utf-8 -*-
"""
Genera la presentacion de tesis (PowerPoint 16:9, con el guion en las notas),
el guion en Word y el archivo de referencias.

Acomodo: una cosa por diapositiva. Las capturas del sistema van solas, a
pagina completa, con un titulo corto y una linea de pie; lo que hay que decir
va en las notas. Titulos en Georgia, cuerpo en Segoe UI, fondo blanco.

Uso: python presentacion/construir_presentacion.py
"""
import io
import os
import re
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image
from docx import Document
from docx.shared import Pt as DPt

AQUI = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(AQUI, "capturas")
REC = os.path.join(CAP, "_recortes")
os.makedirs(REC, exist_ok=True)
ART = os.path.join(AQUI, "..", "empsarticulodatos", "proyecto_articulo_datos_emps_v1")
FIG = os.path.join(ART, "outputs", "figures")

MARINO = RGBColor(0x1F, 0x38, 0x64)
NEGRO = RGBColor(0x1A, 0x1A, 0x1A)
GRIS = RGBColor(0x59, 0x59, 0x59)
GRIS_LINEA = RGBColor(0xBF, 0xBF, 0xBF)
BLANCO = RGBColor(0xFF, 0xFF, 0xFF)
TITULOS = "Georgia"
CUERPO = "Segoe UI"

ANCHO = Inches(13.333)
ALTO = Inches(7.5)
MARGEN = Inches(0.7)

prs = Presentation()
prs.slide_width = ANCHO
prs.slide_height = ALTO
BLANK = prs.slide_layouts[6]
GUION = []


def texto(slide, left, top, width, height, partes, size=22, color=NEGRO, bold=False, fuente=CUERPO, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, espacio=1.2, after=10):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05)
    tf.margin_top = tf.margin_bottom = Inches(0.03)
    if isinstance(partes, str):
        partes = [(partes, {})]
    first = True
    for item in partes:
        t, o = (item, {}) if isinstance(item, str) else item
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = o.get("align", align)
        p.line_spacing = o.get("espacio", espacio)
        p.space_after = Pt(o.get("after", after))
        r = p.add_run()
        r.text = t
        f = r.font
        f.name = o.get("fuente", fuente)
        f.size = Pt(o.get("size", size))
        f.bold = o.get("bold", bold)
        f.italic = o.get("italic", False)
        f.color.rgb = o.get("color", color)
    return tb


def encabezado(slide, t):
    texto(slide, MARGEN, Inches(0.4), ANCHO - 2 * MARGEN, Inches(0.9), t, size=32, color=MARINO, fuente=TITULOS, anchor=MSO_ANCHOR.BOTTOM)
    linea = slide.shapes.add_connector(1, MARGEN, Inches(1.38), ANCHO - MARGEN, Inches(1.38))
    linea.line.color.rgb = GRIS_LINEA
    linea.line.width = Pt(0.75)


def pie(slide, n, t=None):
    if t:
        texto(slide, MARGEN, ALTO - Inches(0.95), ANCHO - 2 * MARGEN - Inches(1.0), Inches(0.55), t, size=12, color=GRIS, anchor=MSO_ANCHOR.BOTTOM)
    texto(slide, ANCHO - MARGEN - Inches(0.8), ALTO - Inches(0.42), Inches(0.8), Inches(0.3), str(n), size=11, color=GRIS, align=PP_ALIGN.RIGHT)


def notas(slide, t):
    slide.notes_slide.notes_text_frame.text = t


def recortar(nombre, rec):
    """rec = (x0, y0, x1, y1) como fracciones de la imagen. Devuelve la ruta del recorte."""
    src = os.path.join(CAP, nombre) if not os.path.isabs(nombre) else nombre
    im = Image.open(src)
    w, h = im.size
    x0, y0, x1, y1 = rec
    out = os.path.join(REC, os.path.basename(nombre).replace(".png", "_r.png"))
    im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1))).save(out)
    return out


def imagen_completa(slide, ruta, top=Inches(1.6), max_h=None, borde=True):
    max_w = ANCHO - 2 * MARGEN
    max_h = max_h or (ALTO - top - Inches(1.05))
    im = Image.open(ruta)
    w, h = im.size
    esc = min(max_w / w, max_h / h)
    ancho, alto = int(w * esc), int(h * esc)
    left = int((ANCHO - ancho) / 2)
    pic = slide.shapes.add_picture(ruta, left, top, width=ancho, height=alto)
    if borde:
        pic.line.color.rgb = GRIS_LINEA
        pic.line.width = Pt(0.75)
    return pic


def diapo_texto(titulo, lineas, que_decir, fuente_pie=None, size=22, top=Inches(1.7)):
    s = prs.slides.add_slide(BLANK)
    encabezado(s, titulo)
    partes = []
    for l in lineas:
        if isinstance(l, tuple):
            partes.append(l)
        else:
            partes.append((l, {"size": size, "after": 14}))
    texto(s, MARGEN + Inches(0.1), top, ANCHO - 2 * MARGEN - Inches(0.2), ALTO - top - Inches(1.1), partes, size=size)
    n = len(prs.slides)
    pie(s, n, fuente_pie)
    notas(s, que_decir)
    GUION.append((n, titulo, "En pantalla: " + " / ".join((l if isinstance(l, str) else l[0])[:70] for l in lineas), que_decir))
    return s


def diapo_imagen(titulo, ruta, que_decir, pie_txt=None, recorte=None):
    s = prs.slides.add_slide(BLANK)
    encabezado(s, titulo)
    if recorte:
        ruta = recortar(ruta, recorte)
    elif not os.path.isabs(ruta):
        ruta = os.path.join(CAP, ruta)
    imagen_completa(s, ruta)
    n = len(prs.slides)
    pie(s, n, pie_txt)
    notas(s, que_decir)
    GUION.append((n, titulo, "En pantalla: " + (pie_txt or "captura del sistema"), que_decir))
    return s


# =============================================================== 1. Portada
s = prs.slides.add_slide(BLANK)
esc = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, MARGEN, Inches(0.6), Inches(1.5), Inches(1.5))
esc.fill.background(); esc.line.color.rgb = GRIS_LINEA; esc.line.width = Pt(0.75)
texto(s, MARGEN, Inches(1.1), Inches(1.5), Inches(0.5), "Escudo UAZ", size=11, color=GRIS, align=PP_ALIGN.CENTER)
texto(s, MARGEN + Inches(1.8), Inches(0.65), Inches(9), Inches(1.4), [
    ("Universidad Autónoma de Zacatecas", {"size": 20, "color": MARINO, "fuente": TITULOS}),
    ("Ingeniería en Software", {"size": 16, "color": GRIS}),
    ("Seminario de Tesis. Agosto a diciembre de 2026", {"size": 16, "color": GRIS}),
])
texto(s, MARGEN, Inches(2.5), ANCHO - 2 * MARGEN, Inches(2.3), [
    ("Estimación temprana de esfuerzo, tiempo y costo en proyectos de software para gobiernos municipales", {"size": 30, "color": MARINO, "fuente": TITULOS, "espacio": 1.1}),
    ("Propuesta metodológica para el control de cambios, con referencia a Fresnillo, Zacatecas", {"size": 18, "color": GRIS, "fuente": TITULOS, "italic": True}),
])
linea = s.shapes.add_connector(1, MARGEN, Inches(5.0), Inches(7), Inches(5.0)); linea.line.color.rgb = GRIS_LINEA
texto(s, MARGEN, Inches(5.15), Inches(8.5), Inches(2.0), [
    ("Rogelio Flores Rodríguez, matrícula 22304084", {"size": 18, "color": NEGRO, "bold": True}),
    ("Semestre 8, grupo D, modalidad semiescolarizada", {"size": 15, "color": GRIS}),
    ("Directora de tesis: Dra. Julieta Guadalupe Rodríguez Ruiz", {"size": 15, "color": GRIS}),
    ("Sistema en línea: estimacion.hazlatarea.com", {"size": 15, "color": GRIS}),
])
s.shapes.add_picture(os.path.join(CAP, "logo_emps.png"), ANCHO - MARGEN - Inches(1.1), ALTO - Inches(1.8), width=Inches(1.1), height=Inches(1.1))
notas(s, "Buenas tardes. Me llamo Rogelio Flores Rodríguez y estudio Ingeniería en Software en la Universidad Autónoma de Zacatecas. Esta es la presentación de avance de mi tesis para el Seminario de Tesis, con la dirección de la doctora Julieta Guadalupe Rodríguez Ruiz. Mi tesis es sobre cómo calcular desde el principio cuánto va a costar y cuánto va a tardar un sistema de software para un municipio. Hice un sistema que ya funciona en internet y se los voy a enseñar. Voy a hablar de tres cosas: primero, cuál es el problema y cómo cambió con la inteligencia artificial; segundo, qué probé ya con datos; y tercero, cómo lo voy a probar con ayuntamientos y con desarrolladores en lo que queda del semestre.")
GUION.append((1, "Portada", "En pantalla: portada con tus datos. Antes de grabar, pon el escudo de la UAZ en el recuadro.", s.notes_slide.notes_text_frame.text))

# =============================================================== 2. El problema
diapo_texto("El problema", [
    "Un Ayuntamiento recibe cotizaciones que no puede comparar y no sabe si el proveedor que cotizó barato va a poder terminar.",
    "Un proveedor sabe programar, pero no sabe cuánto cobrar: si cobra caro pierde el contrato; si cobra barato se queda sin dinero a la mitad.",
    "En 120 proyectos reales de 42 organizaciones, 8 de cada 10 costaron más esfuerzo del estimado, con una desviación mediana de 58.6 % (dataset SEERA).",
    "De 4,329 tareas estimadas por expertos, solo 4 de cada 10 cayeron dentro de más o menos 15 % del valor real (tareas de Jira, código abierto).",
], "El problema tiene dos lados. De un lado está el Ayuntamiento: una oficina de Catastro o de Tesorería necesita un sistema, recibe varias cotizaciones y no tiene con qué compararlas. Tampoco sabe si el que cotizó más barato va a poder terminar. Del otro lado está el proveedor, que muchas veces es una persona o una empresa de tres o cuatro. Sabe programar, pero no sabe cuánto cobrar. Si cobra caro, pierde el contrato. Si cobra barato, se queda sin dinero a la mitad y no termina. Y esto no es una impresión mía. En un conjunto de ciento veinte proyectos reales, ocho de cada diez costaron más de lo que se había estimado. Y de más de cuatro mil tareas estimadas por expertos, solo cuatro de cada diez quedaron cerca del valor real. Estimar mal es lo normal, no la excepción.", "Fuentes: SEERA (PROMISE 2020, Zenodo) y tareas de Jira con estimación experta (Zenodo). Cifras del artículo propio, septiembre de 2026.")

# =============================================================== 3. Lo que cambio
diapo_texto("Lo que cambió mientras hacía la tesis", [
    "Uso de inteligencia artificial para programar: 62 % de los desarrolladores en 2024, 78 % en 2025 y 84 % en 2026 (Stack Overflow, 49,000 respuestas en 2026).",
    "90 % ya usa agentes de código cada semana y 68 % todos los días (JetBrains, 15,000 profesionales, agosto de 2026).",
    "41 % del código nuevo se reporta como generado con inteligencia artificial (GitHub Octoverse, octubre de 2025).",
    "El mercado de agentes de código para empresas vale diez mil millones de dólares al año (Gartner, mayo de 2026).",
    ("Un modelo de estimación que asume que las horas de programación son el centro del costo ya nació viejo.", {"size": 22, "bold": True, "color": MARINO, "after": 14}),
], "Cuando empecé la tesis, la pregunta era cuántas horas de programación lleva un sistema. Pero en este año y medio la forma de hacer software cambió mes con mes. En 2024, seis de cada diez desarrolladores usaban inteligencia artificial. En 2025, casi ocho. En 2026, más de ocho. Y lo nuevo no es que la computadora complete una línea, sino que un agente hace la tarea completa: nueve de cada diez profesionales ya usan agentes cada semana. GitHub dice que cuarenta y uno por ciento del código nuevo se genera con inteligencia artificial. Esto ya es un mercado de diez mil millones de dólares. Para la tesis significa algo muy concreto: si mi modelo asumía que las horas de programación eran el centro del costo, ese modelo nació viejo. Había que cambiarlo.")

# =============================================================== 4. No es igual para todos
diapo_texto("Pero la ganancia no es igual para todos", [
    "Desarrolladores experimentados, trabajando en su propio código con inteligencia artificial, tardaron 19 % más y creían haber sido 20 % más rápidos (METR, ensayo controlado, 2025).",
    "En 623 millones de cambios de código, la duplicación subió 81 % y la refactorización cayó 70 % (GitClear, enero de 2026).",
    "45 % del código generado por inteligencia artificial trae una falla de seguridad, y esa cifra lleva dos años sin mejorar (Veracode, marzo de 2026).",
    "Los cambios hechos con inteligencia artificial se aceptan en 30 días solo 33 % de las veces, contra 84 % sin ella (LinearB, 8.1 millones de cambios, 2026).",
    ("La ganancia depende de la forma de hacerlo y de la pericia de quien usa la herramienta. Por eso el sistema las trata por separado.", {"size": 22, "bold": True, "color": MARINO, "after": 14}),
], "Ahora la otra cara, porque una tesis no puede repetir el folleto de las herramientas. La inteligencia artificial no hace a todos más rápidos. El estudio más serio del año pasado midió a desarrolladores con experiencia trabajando en su propio código: tardaron diecinueve por ciento más, y ellos creían que habían sido veinte por ciento más rápidos. Otro estudio, con seiscientos millones de cambios de código, encontró que se copia mucho más y se limpia mucho menos. Casi la mitad del código generado trae una falla de seguridad. Y los cambios hechos con inteligencia artificial se aceptan mucho menos que los hechos a mano. Entonces, la ganancia depende de dos cosas: de la forma de hacerlo y de qué tan bien sabe usar la herramienta el equipo. Por eso el sistema no aplica un descuento parejo: cobra la herramienta por un lado y acredita el ahorro según la pericia por otro.")

# =============================================================== 5. Los detalles
diapo_texto("Los detalles ya no llevan ticket", [
    "Antes, el ajuste chico (que este texto no se ve bien, que este campo debe validar) era un ticket, una espera y a veces un cobro aparte. Hoy se resuelve en la misma sesión.",
    "En 3,400 repositorios, adoptar inteligencia artificial subió 19 % los cambios terminados y ahorró de 2 a 4 horas por persona a la semana; el efecto fue mayor en los repositorios chicos (Atlassian, mayo de 2026).",
    "En una empresa con 802 desarrolladores, el rendimiento por persona llegó a 2.09 veces, aunque la carga de quien revisa se duplicó (arXiv, julio de 2026).",
    "De 8,106 correcciones hechas por agentes, 65 % se aceptaron (arXiv, enero de 2026).",
    ("Quien sigue cobrando cada detalle como un día de trabajo se va a quedar sin clientes. El sistema ya lo refleja en el costo de cada cambio.", {"size": 22, "bold": True, "color": MARINO, "after": 14}),
], "Hay algo que aprendí haciendo el sistema y que los datos de este año confirman. Construir el sistema es más rápido, sí, pero lo que más cambió es el detalle. El ajuste chico. Que este texto no se ve bien, que este campo debe validar. Antes eso era un ticket, una espera y a veces un cobro aparte. Hoy se resuelve en la misma sesión. Atlassian lo midió en tres mil cuatrocientos repositorios: los cambios terminados subieron diecinueve por ciento y cada persona ahorra de dos a cuatro horas por semana, y el efecto es mayor en los repositorios chicos, que son justo los de un proveedor municipal. Esto tiene una consecuencia dura para el que cobra: el desarrollador que sigue cobrando cada detalle como si costara un día se va a quedar sin clientes, porque llega otro y lo hace en una tarde. Y tiene una consecuencia para mi sistema: el costo de cada cambio ahora se ajusta por la forma de hacerlo, con la misma regla que usa la calculadora de cambios. Lo van a ver en una pantalla más adelante.")

# =============================================================== 6. Pregunta e hipotesis
diapo_texto("Pregunta e hipótesis", [
    ("Pregunta", {"size": 16, "color": GRIS, "after": 2}),
    ("¿Se puede calcular desde el inicio, con los datos que un Ayuntamiento y un proveedor sí conocen, el costo y el tiempo de un sistema municipal con un error útil para decidir?", {"size": 22, "bold": True, "color": MARINO, "after": 18}),
    ("Hipótesis del sistema", {"size": 16, "color": GRIS, "after": 2}),
    ("La estimación mejora cuando en una misma base de datos y en un mismo cálculo se juntan las piezas del sistema, los cambios, la forma de hacerlo, el equipo, la nómina con sus impuestos, el flujo de dinero y el mantenimiento.", {"size": 20, "after": 18}),
    ("Hipótesis del artículo, ya probadas con datos públicos", {"size": 16, "color": GRIS, "after": 2}),
    ("H1. El juicio del experto por sí solo no basta.   H2. Las tareas de cambio tienen un esfuerzo distinto.   H3. Con los datos del inicio se le gana al promedio.", {"size": 18, "after": 6}),
], "Con ese terreno, esta es la pregunta de la tesis: si se puede calcular desde el inicio, con los datos que sí se conocen al principio, cuánto va a costar y tardar un sistema municipal, con un error que sirva para decidir. La hipótesis del sistema es que la estimación mejora cuando todo se junta en un mismo cálculo: las piezas del sistema, los cambios, la forma de hacerlo, el equipo, la nómina con sus impuestos, el flujo de dinero y el mantenimiento. Y en el artículo probé tres hipótesis más chicas con datos públicos: que el juicio del experto por sí solo no basta, que las tareas de cambio pesan distinto, y que con los datos del inicio se le puede ganar al promedio. Les adelanto que la segunda no se confirmó, y eso también es un resultado.")

# =============================================================== 7 y 8. Graficas
diapo_imagen("Lo que estima el experto contra lo que costó de verdad", os.path.join(FIG, "josse_expert_vs_actual.png"), "Esta gráfica es de tareas reales de proyectos de código abierto. Cada punto es una tarea. En el eje de abajo está lo que el experto estimó y en el eje vertical lo que costó de verdad. La línea diagonal sería la estimación perfecta. Fíjense en dos cosas. Una: los puntos suben junto con la línea, o sea que el experto sí sabe qué tarea es grande y cuál es chica; la correlación es de cero punto setenta y nueve. Dos: los puntos están muy regados alrededor de la línea; solo cuatro de cada diez caen cerca. El experto ordena, pero no dimensiona.", "Tareas de Jira con estimación experta, n = 4,329. Correlación 0.79; solo 40 % dentro de más o menos 15 %. Figura 1 del artículo.")
diapo_imagen("Lo mismo, con proyectos completos", os.path.join(FIG, "seera_estimate_vs_actual.png"), "Esta otra gráfica son proyectos completos, ciento veinte, de cuarenta y dos organizaciones. Aquí casi todos los puntos están arriba de la línea. Eso quiere decir que costaron más de lo estimado: ochenta y uno por ciento subestimados, con una desviación mediana de cincuenta y ocho por ciento. Es la imagen del problema del que hablé al principio.", "SEERA, n = 120 proyectos. 81 % subestimados; desviación mediana +58.6 %. Figura 2 del artículo.")

# =============================================================== 9. Lo que dicen los datos
diapo_texto("Lo que ya se demostró con datos públicos", [
    "Con las variables que se conocen al inicio, un bosque aleatorio alcanzó R2 = 0.81 en los proyectos completos, contra cero de la línea base del promedio (H3 respaldada).",
    "El juicio experto ordena pero no dimensiona: solo 40 % de sus estimaciones cae dentro de más o menos 15 % (H1 respaldada).",
    "Buscar cambios por palabras clave en el texto de la tarea no separa nada (p = 0.57): H2 no se confirmó. Por eso el sistema captura los cambios de forma estructurada y no los adivina del texto.",
    "Todo se verificó con un programa independiente: 26 de 26 comprobaciones correctas.",
], "Resumo lo que dicen los datos. Primero: con las variables que se conocen al inicio del proyecto, un modelo de bosque aleatorio explicó ochenta y uno por ciento de la variación del esfuerzo en los proyectos completos, contra cero del promedio. Eso respalda la tercera hipótesis. Segundo: el experto ordena pero no dimensiona; eso respalda la primera. Tercero: la segunda hipótesis no se confirmó: buscar cambios por palabras en el texto de la tarea no distingue nada. Y eso cambió el sistema: los cambios se capturan de forma estructurada, con su tipo y su fase, no se adivinan. Todo esto lo verificó un programa aparte, veintiséis de veintiséis comprobaciones. Nota para mí: antes de grabar, confirmar en Zenodo el nombre exacto del conjunto de tareas de Jira, porque el nombre corto que usamos en el artículo no aparece en la literatura.", "Artículo propio, septiembre de 2026. Verificación con scripts/05_verify_results.py.")

# =============================================================== 10 a 25. El sistema
diapo_imagen("EMPS Fresnillo: el sistema, en línea y sin cuenta", "01_portada.png", "Este es el sistema. Se llama EMPS Fresnillo. Está en internet, en estimacion punto hazlatarea punto com, y no pide cuenta ni contraseña. La portada ofrece dos caminos: cotizar en un minuto, o crear un proyecto completo en cinco pasos. Y tiene un ejemplo ya capturado para que cualquiera vea cómo funciona antes de escribir nada. Nota para el video: aquí puedes cambiar a la ventana del navegador y mostrarlo en vivo.", "Portada del sistema, septiembre de 2026. estimacion.hazlatarea.com", recorte=(0.1, 0, 0.9, 1))

diapo_imagen("Cotizar en un minuto", "02_cotizar.png", "Para que la gente lo use, la entrada tiene que ser fácil. Cotizar en un minuto pregunta tres cosas: qué sistema necesitas, qué partes debe tener, y cuánto dinero tienes y para cuándo. Además pregunta quién va a resolver dudas del lado del cliente y si el equipo ya programa con inteligencia artificial. Con eso el sistema crea el proyecto con valores típicos, corre quince estimaciones en menos de un segundo y te lleva al resultado.", "Pantalla Cotizar en un minuto.", recorte=(0.15, 0.07, 0.85, 1))

diapo_imagen("El resultado contesta primero", "03_cuatro_respuestas.png", "Lo primero que ve la persona es esto, antes de cualquier tabla. Cuatro respuestas: cuánto va a costar, con IVA; cuánto va a tardar, en meses; si le alcanza con el dinero que tiene; y qué opción eligió, o cuál le recomendamos si todavía no elige. Todo lo demás de la pantalla explica estos cuatro renglones.", "Las cuatro respuestas del proyecto de ejemplo: un sistema de trámites con ocho piezas y cuatro personas.")

diapo_imagen("De dónde sale el número", "04_cadena_de_calculo.png", "Esto es lo que más me pedían: saber de dónde sale el número. Cada resultado trae su cadena de cálculo, renglón por renglón, con la operación en palabras. Empieza con las horas base de las piezas del sistema. Se ajustan por qué tan claro está lo que se quiere y por el riesgo. Luego entra la forma de hacerlo, que ahorra horas según la pericia del equipo. Las semanas salen de dividir entre la capacidad del equipo. Y el costo mensual suma sueldos con todas sus cargas, herramientas de inteligencia artificial, otras herramientas y administración. Cualquiera puede rehacer la cuenta con una calculadora y le va a dar.", "Cadena de cálculo del ejemplo, forma híbrida, escenario probable (parte alta).", recorte=(0, 0.105, 1, 0.62))

diapo_imagen("Cinco formas de hacerlo, tres tarjetas", "05_tres_opciones.png", "El mismo proyecto, con el mismo equipo, se calcula en cinco formas de hacerlo: todo a mano, con ayuda de inteligencia artificial, híbrido, casi todo con inteligencia artificial, y con plataformas de armado sin programar. Pero no se le dan quince números a la persona. Se le dan tres tarjetas: la recomendada, la que eligió, y la más segura. Cada una con su precio, sus meses, su riesgo y si esa forma sirve para este proyecto. La tabla completa está abajo, plegada, para quien la quiera ver.", "Las tres opciones del proyecto de ejemplo. Debajo, plegada, la tabla con las quince combinaciones.")

diapo_texto("La forma de hacerlo pesa más que el precio", [
    "Mismo proyecto de ejemplo (8 piezas, 4 personas), escenario probable:",
    "Todo a mano: 2 millones 927 mil pesos y 31 semanas.",
    "Híbrido: 904 mil pesos y 12 semanas.",
    "Casi todo con inteligencia artificial: 646 mil pesos y 8 semanas.",
    "Plataforma de armado: 311 mil pesos y 4 semanas.",
    ("Nueve veces de diferencia entre la forma más cara y la más barata. Y no todas sirven para todos: se descartan por conexiones, datos personales, criticidad, claridad y pericia del equipo.", {"size": 22, "bold": True, "color": MARINO, "after": 14}),
], "Este es el hallazgo que sostiene la tesis. Miren las cifras del mismo proyecto: a mano, casi tres millones de pesos y treinta y una semanas. Híbrido, novecientos mil y doce semanas. Casi todo con inteligencia artificial, seiscientos cuarenta y seis mil y ocho semanas. Plataforma de armado, trescientos once mil y cuatro semanas. Nueve veces de diferencia. Por eso digo que la forma de hacerlo pesa más que el precio. Pero la más barata no siempre sirve: una plataforma de armado no sirve para un sistema con datos personales y cuatro conexiones externas, aunque sea la más barata, y el sistema la descarta y dice por qué. Y hacer casi todo con inteligencia artificial no se le recomienda a un equipo que nunca la ha usado.", "Cifras del ejemplo público, septiembre de 2026, con los parámetros vigentes.")

diapo_imagen("Las herramientas de IA se cobran por persona", "06b_niveles.png", "Aquí está lo nuevo de este mes, y sale de una investigación de precios que hice el nueve de septiembre con las páginas oficiales. Las herramientas se cobran por persona, no por equipo, porque así las venden: un asiento por cada persona técnica. Y como en la vida real cada quien trae su plan, hay tres niveles: básico, típico y máximo. Por ejemplo, para casi todo con inteligencia artificial, cien, doscientos cincuenta o cuatrocientos dólares por persona al mes. Se elige por proyecto, y además cada persona puede traer su propio plan.", "Nivel de herramientas por persona, en la pantalla Calcular. Precios de lista del 9 de septiembre de 2026.")

diapo_imagen("Lo que se cobra con este equipo", "06_herramientas_ia.png", "Y esto es lo que el sistema le enseña antes de calcular: con este equipo de cuatro personas técnicas, cuánto costarían las herramientas al mes en cada forma de hacerlo, y qué parte del ahorro se acredita según la pericia del equipo. La pericia se captura por persona, del uno al cinco. Los ahorros publicados están calibrados para quien usa la herramienta a diario y sabe darle instrucciones. A quien nunca la ha usado solo se le acredita treinta y cinco por ciento, porque un modelo muy potente en manos de quien no sabe pedirle las cosas no ahorra tiempo. Eso es exactamente lo que midió el estudio de METR.", "Recuadro de herramientas en la pantalla Calcular: cuatro asientos, pericia 3.5 de 5, tipo de cambio 16.92.")

diapo_imagen("Nómina, cuotas, impuestos y flujo", "10_resumen_financiero.png", "Un desarrollador puede saber programar muy bien y no saber lo que cuesta una nómina. El sistema lo pone en el número. Sobre el sueldo van las cuotas del IMSS, el INFONAVIT, el impuesto sobre nómina de Zacatecas, las prestaciones de ley, y si el proyecto pasa de seis meses, la liquidación. Y luego el flujo: el proveedor paga la nómina cada mes, pero cobra por anticipo, entregas y pago final. Hay un mes en el que ya pagó y el cliente no le ha terminado de pagar. La tercera tarjeta lo dice: te van a deber tanto en el mes tal. Ese es el mes en que los proyectos se abandonan.", "Resumen financiero del ejemplo: precio, herramientas de IA, dinero que se adelanta, la brecha entre formas de hacerlo y los cambios pendientes.")

diapo_imagen("Las preguntas que hace un patrón, con respuesta", "11_preguntas_del_patron.png", "Estas son las preguntas que cualquier jefe de área haría. ¿Va a terminar a tiempo? ¿El proveedor va a aguantar con su dinero? ¿Cuánto cuesta mantenerlo después? ¿Qué no está incluido? Y abajo, si pides cambios a medio camino, cuánto cuesta cada tipo. Aquí está lo que dije antes: con casi todo con inteligencia artificial y este equipo, una corrección menor lleva de una hora y media a cinco, no de dos a ocho, y la tabla muestra las horas y el dinero. Es la misma regla que usa la calculadora de cambios del proyecto.", "Preguntas del patrón y tabla de cambios con las horas ajustadas por la forma de hacerlo.")

diapo_imagen("El reporte para el Ayuntamiento", "07_reporte_municipal.png", "El mismo cálculo se redacta distinto según quién lo lee. Este es el reporte para el Ayuntamiento. Contesta con veredicto: si va a terminar a tiempo, si el proveedor va a aguantar, qué método va a usar, cuánto cuesta cada cambio y qué no está incluido. Y trae una lista de qué exigir en el contrato. Se puede imprimir o guardar como PDF.", "Reporte para el Ayuntamiento, proyecto de ejemplo.", recorte=(0.12, 0.07, 0.88, 1))

diapo_imagen("La recomendación para el proveedor", "12_recomendacion.png", "Y este es el recuadro que ve el proveedor: cuál opción le conviene según su utilidad, su riesgo y su tiempo, con las razones. Incluye las opciones que se descartaron aunque fueran más baratas, y dice por qué. Cuando el proveedor elige, la decisión queda registrada con fecha y nombre, y el sistema guarda qué recomendaba en ese momento, para poder comparar después.", "Recuadro de recomendación, proyecto de ejemplo, visto como proveedor.")

diapo_imagen("Todo con fuente y todo editable", "08_fuentes.png", "Un sistema así solo sirve si se le puede creer. Esta pantalla muestra los sesenta y cuatro parámetros que usa el cálculo: cuotas del IMSS e INFONAVIT, impuesto sobre nómina, salario mínimo y UMA, IVA e ISR, los factores por forma de hacerlo, los precios de las herramientas y el tipo de cambio. Cada uno con su ley o su fuente, la dirección donde consultarlo y la fecha desde la que rige. Quien estima puede cambiar cualquier valor para sus propias estimaciones sin afectar a nadie más. Y cada estimación guarda una copia de los parámetros con que se calculó, para poder reproducirla meses después.", "Pantalla Fuentes: 64 parámetros con fundamento, dirección y vigencia.", recorte=(0.1, 0.07, 0.9, 1))

diapo_imagen("Un enlace para llevar el resultado", "14_vista_compartida.png", "El resultado se puede compartir con un enlace de solo lectura que no pide cuenta. El jefe de área se lo manda a su director, o el proveedor a su cliente, y ven lo mismo: las cuatro respuestas, las opciones, de dónde sale el número y las preguntas. Quien lo compartió puede quitar el enlace cuando quiera.", "Vista compartida de solo lectura.", recorte=(0.1, 0.07, 0.9, 1))

diapo_imagen("La encuesta del piloto", "09_encuesta_piloto.png", "Ahora lo que sigue, que es lo que le pido al seminario que revise. Al pie de cada resultado hay cuatro preguntas que se contestan en treinta segundos: qué tan creíble te pareció la cifra, del uno al cinco; cuánto pensabas antes de verla; con qué forma de hacerlo lo harías; y qué te faltó. Es anónima. Con eso puedo comparar lo que la gente esperaba contra lo que el sistema calculó, separado por lado: Ayuntamiento y proveedor. Y sin esperar a que un proyecto termine, porque eso puede tardar meses.", "Encuesta de salida del piloto, al pie del resultado.")

diapo_imagen("Lo que el sistema mide sin preguntar", "15_panel_investigador.png", "Además de la encuesta, el sistema mide cosas sin preguntar. Cuánto tarda cada persona en llegar a su primera cifra. Cuántos empiezan y no terminan. Qué forma de hacerlo eligen. Y cuando un proyecto termina, se captura lo que costó de verdad. Con quince casos terminados, el sistema calcula solo las mismas métricas del artículo y da un veredicto sobre la hipótesis. Este es el panel del investigador, donde se ve todo eso.", "Panel del investigador: tiempo a la primera cifra, por lado de la mesa y encuesta del piloto.", recorte=(0.1, 0.08, 0.9, 1))

# =============================================================== 26. Validacion y difusion
diapo_texto("Plan de validación y difusión", [
    "Ola 1, octubre: ayuntamientos. Fresnillo primero y luego municipios cercanos de Zacatecas, por las redes de tesoreros e innovación (CIAPEM). Treinta minutos con un proyecto real o con el ejemplo, y la encuesta de salida.",
    "Ola 2, noviembre: desarrolladores y empresas pequeñas. Cotizan un proyecto real en un minuto y dicen si la cifra se acerca a lo que cobrarían.",
    "Qué se mide: credibilidad, diferencia entre lo esperado y lo calculado, forma elegida, tiempo a la primera cifra, abandono, y estimado contra real cuando un proyecto termina.",
    "Por qué hay espacio: de 242 sistemas integrados a Llave MX, solo 8 son municipales (ATDT, 2025), en un país con 2,469 municipios.",
], "El plan de validación es un piloto en dos olas. La primera, en octubre, con ayuntamientos: Fresnillo primero, y luego municipios cercanos a través de las redes que ya existen, como CIAPEM, que este año convocó un seminario sobre inteligencia artificial para gobiernos municipales. Cada persona usa el sistema treinta minutos con un proyecto real o con el ejemplo y contesta la encuesta. La segunda ola, en noviembre, con desarrolladores y empresas pequeñas: cotizan un proyecto real y me dicen si la cifra se acerca a lo que cobrarían. Y hay un dato que explica por qué hay espacio para esto: la identidad digital del gobierno federal está integrada en doscientos cuarenta y dos sistemas, y solo ocho son municipales, en un país con dos mil cuatrocientos sesenta y nueve municipios. Los municipios chicos compran software a proveedores chicos, y ninguno de los dos tiene con qué estimar.", "Fuentes: ATDT, 7 de diciembre de 2025; CIAPEM y tapi, Diagnóstico Nacional 2026.", size=20)

# =============================================================== 27. El modelo
diapo_texto("El modelo se decide con datos, no antes", [
    "Hoy el motor es determinista y auditable: cada número se puede rehacer a mano. Todavía no hay casos reales terminados.",
    "Con 15 casos terminados, el sistema entrena y compara una regresión, un bosque aleatorio y una red neuronal, con las variables del artículo más la forma de hacerlo, la pericia y el costo de las herramientas. Veredicto con criterios fijados de antemano.",
    "La literatura de 2026 va igual: los modelos clásicos fallan cuando quien escribe el código es un modelo (Frontiers in AI, marzo de 2026); el costo se descompone en tokens, supervisión humana e infraestructura (ACEM, agosto de 2026).",
    ("No prometo un modelo. Prometo el método para elegirlo con datos de ayuntamientos reales, que hoy no existen en ningún lado.", {"size": 20, "bold": True, "color": MARINO, "after": 10}),
], "Sobre el modelo, quiero ser honesto: no voy a decir hoy cuál es el modelo que lo va a predecir todo, porque no tengo los datos para decirlo. Hoy el motor es determinista y auditable, y eso es una virtud: cada número se rehace a mano. Lo que sí está listo es el método para elegir el modelo cuando haya datos. Con quince casos terminados, el sistema entrena y compara tres modelos, con las variables del artículo más las que este año se volvieron indispensables: la forma de hacerlo, la pericia y el costo de las herramientas. Y da un veredicto con criterios que ya están fijados. La literatura de este año va por ahí: un artículo de marzo dice que los modelos clásicos fallan por razones de fondo cuando quien escribe es un modelo, y otro de agosto propone descomponer el costo en tokens, supervisión humana e infraestructura. Mi tesis entra ahí, con datos de ayuntamientos reales, que hoy no existen en ningún lado.", "Fuentes: Alaswad, Poovammal y Aljaddouh, Frontiers in Artificial Intelligence, 2026; El-Ramly, ACEM, arXiv 2608.02582, 2026.", size=20)

# =============================================================== 28. Limites
diapo_texto("Límites, dichos de frente", [
    "Todavía no hay casos reales terminados. La hipótesis está probada con datos públicos; la validación del sistema es lo que sigue.",
    "Los precios de las herramientas y los factores de productividad cambian mes con mes. Por eso son parámetros con fecha, editables, y no números fijos en el código.",
    "El sistema estima, no dictamina. La determinación fiscal y laboral requiere revisión profesional, y lo dice en cada pantalla.",
    "La encuesta la contesta quien quiere, así que hay sesgo. Por eso también se mide sin preguntar: tiempo, abandono, decisión.",
    "Mucha evidencia de 2026 viene de empresas interesadas. En la tesis se separa lo que viene de ensayos controlados de lo que viene de encuestas y folletos.",
], "Los límites, dichos de frente. Uno: todavía no hay casos reales terminados. Dos: los precios y los factores cambian mes con mes, y por eso son parámetros con fecha y no números fijos. Tres: el sistema estima, no dictamina; la parte fiscal y laboral la tiene que revisar un profesional, y el sistema lo dice. Cuatro: la encuesta la contesta quien quiere, así que hay sesgo, y por eso también mido cosas sin preguntar. Y cinco: mucha de la evidencia de este año viene de empresas que venden estas herramientas; en la tesis separo lo que viene de estudios controlados de lo que viene de encuestas y folletos.")

# =============================================================== 29. Cronograma
s = prs.slides.add_slide(BLANK)
encabezado(s, "Cronograma, agosto a diciembre de 2026")
filas = [("Mes", "Actividad", "Estado"),
         ("Agosto", "Radiografía de la tesis y matriz de seguimiento.", "Entregado"),
         ("Septiembre", "Sistema con herramientas de IA, pericia del equipo, cotización rápida, enlace para compartir y encuesta del piloto. Desplegado en el servidor.", "Hecho"),
         ("Octubre", "Ola 1 del piloto: Fresnillo y municipios cercanos.", "Por hacer"),
         ("Noviembre", "Ola 2: desarrolladores y empresas pequeñas. Análisis de la encuesta y de las métricas de uso.", "Por hacer"),
         ("Diciembre", "Resultados, capítulo de validación y presentación final.", "Por hacer")]
tabla = s.shapes.add_table(len(filas), 3, MARGEN, Inches(1.7), ANCHO - 2 * MARGEN, Inches(3.8)).table
tabla.columns[0].width = Inches(1.9); tabla.columns[1].width = Inches(8.4); tabla.columns[2].width = Inches(1.6)
for i, fila in enumerate(filas):
    for j, celda in enumerate(fila):
        c = tabla.cell(i, j)
        c.text = celda
        c.fill.solid(); c.fill.fore_color.rgb = BLANCO if i else MARINO
        for p in c.text_frame.paragraphs:
            for r in p.runs:
                r.font.name = CUERPO; r.font.size = Pt(15 if i else 14); r.font.bold = (i == 0 or j == 0)
                r.font.color.rgb = BLANCO if i == 0 else NEGRO
texto(s, MARGEN, Inches(5.7), ANCHO - 2 * MARGEN, Inches(0.9), "Cuántos proyectos terminan dentro del semestre no depende del alumno; por eso el piloto mide credibilidad y tiempo a la primera cifra, que sí se pueden tener en estas fechas, y deja sembrada la captura del resultado real para después.", size=15, color=GRIS)
n = len(prs.slides); pie(s, n)
notas(s, "El cronograma del semestre. Agosto: la radiografía de la tesis y la matriz de seguimiento, ya entregadas. Septiembre: el sistema con todo lo que acabo de mostrar, ya desplegado en el servidor. Octubre: la primera ola del piloto con ayuntamientos. Noviembre: la segunda ola con desarrolladores y el análisis. Diciembre: resultados y presentación final. Lo que no depende de mí es cuántos proyectos terminan dentro del semestre. Por eso el piloto mide cosas que sí puedo tener en estas fechas: credibilidad y tiempo a la primera cifra. La captura del resultado real queda sembrada para después.")
GUION.append((n, "Cronograma", "En pantalla: tabla con los cinco meses.", s.notes_slide.notes_text_frame.text))

# =============================================================== 30. Cierre
diapo_texto("Lo que pido", [
    "Al jurado: su opinión sobre el instrumento del piloto, las cuatro preguntas, las métricas y el umbral de quince casos.",
    "A los ayuntamientos: treinta minutos para probarlo con un proyecto real. Sin cuenta, sin instalación.",
    "A los proveedores: cotizar un proyecto real y decirme si la cifra se acerca a lo que cobrarían.",
    ("Los tiempos ya cambiaron. El que cotiza como antes, o compra como antes, va a perder. Este sistema es una forma de que los dos lados de la mesa vean el mismo número, con todo lo que trae adentro, antes de firmar.", {"size": 24, "bold": True, "color": MARINO, "fuente": TITULOS, "after": 14, "espacio": 1.25}),
    ("Gracias.", {"size": 22, "color": GRIS, "after": 6}),
], "Cierro con lo que pido. Al jurado, su opinión sobre el instrumento del piloto: las cuatro preguntas, las métricas y el umbral de quince casos. A los ayuntamientos, treinta minutos para probarlo con un proyecto real, sin cuenta y sin instalar nada. A los proveedores, cotizar un proyecto real y decirme si la cifra se acerca a lo que cobrarían. La tesis parte de una idea sencilla: los tiempos ya cambiaron, y el que cotiza como antes, o compra como antes, va a perder. Este sistema es una forma de que los dos lados de la mesa vean el mismo número, con todo lo que trae adentro, antes de firmar. Gracias.")

# =============================================================== 31 y 32. Referencias
REFERENCIAS = [
    "Stack Overflow. Developer Survey 2024, 2025 y 2026. survey.stackoverflow.co. Consultado el 18 de septiembre de 2026.",
    "JetBrains. AI coding agent adoption 2026. blog.jetbrains.com/research. Agosto de 2026.",
    "GitHub. Octoverse 2025. github.blog. 31 de octubre de 2025.",
    "Gartner. Enterprise AI coding agents market. Comunicado del 20 de mayo de 2026.",
    "DORA. State of AI-assisted Software Development 2025 y ROI report 2026. dora.dev.",
    "METR. Measuring the impact of early-2025 AI on experienced open-source developer productivity (julio de 2025) y Uplift update (24 de febrero de 2026). metr.org.",
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
    "Leyes y fuentes oficiales: LIVA, LISR, LSS, LFT, LINFONAVIT; DOF, CONASAMI, IMSS; Secretaría de Finanzas de Zacatecas (impuesto sobre nómina 2026).",
]
mitad = (len(REFERENCIAS) + 1) // 2
for k, bloque in enumerate((REFERENCIAS[:mitad], REFERENCIAS[mitad:])):
    s = prs.slides.add_slide(BLANK)
    encabezado(s, "Referencias" + (" (1 de 2)" if k == 0 else " (2 de 2)"))
    partes = [(f"{k * mitad + i + 1}. {r}", {"size": 12, "after": 5, "espacio": 1.1}) for i, r in enumerate(bloque)]
    texto(s, MARGEN, Inches(1.6), ANCHO - 2 * MARGEN, Inches(5.4), partes, size=12)
    n = len(prs.slides); pie(s, n)
    notas(s, "Referencias consultadas, con fecha. Cada cifra de la presentación se puede rastrear a una de ellas." if k == 0 else "Continúan las referencias. Las de precios y tipo de cambio llevan fecha porque cambian con frecuencia.")
    GUION.append((n, "Referencias", "En pantalla: lista de referencias.", "No se lee en voz alta; se deja en pantalla unos segundos."))

# =============================================================== revision y salida

def revisar_texto():
    prohibidos = re.compile(u"[–—→←➔➡\U0001F300-\U0001FAFF☀-➿]")
    malos = []
    for i, sl in enumerate(prs.slides, 1):
        for shp in sl.shapes:
            if shp.has_text_frame and prohibidos.search(shp.text_frame.text):
                malos.append((i, shp.text_frame.text[:60]))
            if shp.has_table:
                for fila in shp.table.rows:
                    for c in fila.cells:
                        if prohibidos.search(c.text):
                            malos.append((i, c.text[:60]))
        if prohibidos.search(sl.notes_slide.notes_text_frame.text):
            malos.append((i, "notas"))
    return malos

malos = revisar_texto()
if malos:
    raise SystemExit("Hay caracteres que delatan texto de IA: %r" % malos)

salida = os.path.join(AQUI, "tesis_emps_2026_v2.pptx")
prs.save(salida)
print("pptx:", salida, "|", len(prs.slides), "diapositivas")

# =============================================================== guion en Word
doc = Document()
st = doc.styles["Normal"]; st.font.name = "Segoe UI"; st.font.size = DPt(11)
doc.add_heading("Guion del video de presentación de tesis", level=1)
doc.add_paragraph("Rogelio Flores Rodríguez. Seminario de Tesis, Ingeniería en Software, UAZ. Septiembre de 2026.")

doc.add_heading("La tesis en diez renglones", level=2)
for l in [
    "Un Ayuntamiento compra un sistema de software sin saber si el proveedor va a poder terminarlo, y un proveedor cotiza sin saber cuánto cobrar.",
    "Los datos dicen que estimar mal es lo normal: ocho de cada diez proyectos cuestan más de lo estimado.",
    "Mientras hacía la tesis, la inteligencia artificial cambió la forma de hacer software: hoy casi todos la usan y muchos usan agentes que hacen la tarea completa.",
    "Pero la ganancia no es pareja: depende de la forma de hacerlo y de qué tan bien la usa el equipo. Y las herramientas cuestan.",
    "Hice un sistema, EMPS Fresnillo, que calcula cuánto cuesta, cuánto tarda, si alcanza y con qué forma de hacerlo, y que le habla al Ayuntamiento y al proveedor.",
    "El sistema cobra las herramientas de inteligencia artificial por persona, acredita el ahorro según la pericia, suma la nómina con sus impuestos y muestra el flujo de dinero mes a mes.",
    "Cada número se puede rehacer a mano, y cada parámetro tiene su fuente y su fecha.",
    "Con datos públicos ya probé que el juicio experto no basta y que con los datos del inicio se le gana al promedio.",
    "Lo que sigue es un piloto en dos olas, ayuntamientos y luego desarrolladores, con una encuesta de cuatro preguntas y métricas que el sistema mide solo.",
    "El modelo se va a decidir con datos, cuando haya quince casos terminados, con un método que ya está listo.",
]:
    doc.add_paragraph(l, style="List Number")

doc.add_heading("Palabras que salen en la presentación, explicadas", level=2)
for t, d in [
    ("Forma de hacerlo", "Cómo se construye el sistema: todo a mano, con ayuda de inteligencia artificial, híbrido (lo delicado a mano y lo repetitivo con IA), casi todo con IA (agentes que escriben el código y una persona que revisa), o plataforma de armado (programas como Power Apps donde se arma sin programar)."),
    ("Pericia con la IA", "Qué tanto sabe una persona usar la inteligencia artificial para programar, del uno al cinco. Uno es que nunca la ha usado; cuatro es que la usa a diario y sabe pedirle las cosas; cinco es que arma flujos con agentes."),
    ("Asiento", "Una licencia de una herramienta para una persona. Las herramientas de IA se cobran por asiento, es decir, por persona, no por equipo."),
    ("Capital de trabajo o dinero que se adelanta", "Lo que el proveedor tiene que poner de su bolsa mientras el cliente le termina de pagar, porque la nómina se paga cada mes y el cliente paga por partes."),
    ("Escenario conservador", "El cálculo por si hay tropiezos: más horas, y en el caso de las herramientas, un aumento de precio prorrateado. Los otros dos escenarios son si todo sale bien y lo más seguro."),
    ("MdMRE", "Error mediano: si en la mitad de los casos el error fue menor a 33 %, el MdMRE es 0.33. Es la medida clásica para decir qué tan lejos queda una estimación del valor real."),
    ("PRED(15)", "Qué parte de las estimaciones cayó dentro de más o menos 15 % del valor real. Cuarenta por ciento quiere decir que cuatro de cada diez estuvieron cerca."),
    ("R2", "Qué tanto explica un modelo lo que pasa, de cero a uno. Cero es como adivinar con el promedio; 0.81 quiere decir que el modelo explica el ochenta y uno por ciento de la variación."),
    ("Bosque aleatorio", "Un tipo de modelo de aprendizaje automático que combina muchos árboles de decisión. Fue el que mejor funcionó con los proyectos completos."),
]:
    p = doc.add_paragraph(); r = p.add_run(t + ". "); r.bold = True; p.add_run(d)

doc.add_heading("Qué decir en cada diapositiva", level=2)
total_min = 0.0
for n, t, en_pantalla, nt in GUION:
    palabras = len(nt.split())
    minutos = palabras / 150.0
    total_min += minutos
    doc.add_heading(f"{n}. {t}", level=3)
    p = doc.add_paragraph(); r = p.add_run(en_pantalla); r.italic = True
    doc.add_paragraph(f"Dura aproximadamente {minutos:.1f} minutos.")
    doc.add_paragraph(nt)

doc.add_heading("Duración y ajustes", level=2)
doc.add_paragraph(f"Hablando a ritmo normal, unos {total_min:.0f} minutos en total. Si el video debe durar menos, las diapositivas 4, 5 y 9 se pueden decir en una sola frase cada una, y las de capturas del sistema (10 a 25) se pueden mostrar en vivo en el navegador en vez de una por una.")

doc.add_heading("Antes de grabar", level=2)
for l in [
    "Colocar el escudo de la UAZ en el recuadro de la portada.",
    "Confirmar en Zenodo el nombre del conjunto de tareas de Jira antes de decirlo (en el artículo se llamó JOSSE; ese nombre no aparece en la literatura).",
    "Tener abierto estimacion.hazlatarea.com en otra ventana para mostrar el sistema en vivo en las diapositivas 10 a 25.",
    "Las cifras del ejemplo son de septiembre de 2026; si se vuelve a calcular el ejemplo con parámetros nuevos, actualizar la diapositiva 15.",
]:
    doc.add_paragraph(l, style="List Bullet")
doc.save(os.path.join(AQUI, "guion_video_v2.docx"))
print("docx: guion_video_v2.docx |", f"{total_min:.0f} minutos aproximados")

with io.open(os.path.join(AQUI, "referencias.md"), "w", encoding="utf-8") as f:
    f.write("# Referencias de la presentación\n\nConsultadas el 18 de septiembre de 2026 salvo donde se indica otra fecha.\n\n")
    for i, r in enumerate(REFERENCIAS, 1):
        f.write(f"{i}. {r}\n")
print("md: referencias.md")
