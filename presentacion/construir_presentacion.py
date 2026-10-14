# -*- coding: utf-8 -*-
"""
Genera la presentacion de tesis (PowerPoint 16:9, con el guion en las notas),
el guion en Word y el archivo de referencias.

Acomodo: una cosa por diapositiva. Las capturas del sistema van solas, a
pagina completa, con un titulo corto y una linea de pie; lo que hay que decir
va en las notas. Todo en Arial, barra de titulo azul marino, fondo blanco.

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
TITULOS = "Arial"
CUERPO = "Arial"

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
    barra = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, ANCHO, Inches(1.15))
    barra.fill.solid(); barra.fill.fore_color.rgb = MARINO; barra.line.fill.background(); barra.shadow.inherit = False
    texto(slide, MARGEN, Inches(0.12), ANCHO - 2 * MARGEN, Inches(0.92), t, size=28, color=BLANCO, bold=True, fuente=TITULOS, anchor=MSO_ANCHOR.MIDDLE)


def pie(slide, n, t=None):
    if t:
        texto(slide, MARGEN, ALTO - Inches(0.95), ANCHO - 2 * MARGEN - Inches(1.0), Inches(0.55), t, size=12, color=NEGRO, anchor=MSO_ANCHOR.BOTTOM)
    texto(slide, ANCHO - MARGEN - Inches(0.8), ALTO - Inches(0.42), Inches(0.8), Inches(0.3), str(n), size=12, color=NEGRO, align=PP_ALIGN.RIGHT)


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
            partes.append(("\u2022  " + l, {"size": size, "after": 14}))
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
barra = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, ANCHO, Inches(0.45))
barra.fill.solid(); barra.fill.fore_color.rgb = MARINO; barra.line.fill.background(); barra.shadow.inherit = False
escudo = os.path.join(CAP, "escudo_uaz.png")
if os.path.exists(escudo):
    # El escudo va centrado y con su proporcion original, de 1.3 pulgadas de alto.
    _w, _h = Image.open(escudo).size
    alto_esc = Inches(1.3)
    ancho_esc = int(alto_esc * _w / _h)
    s.shapes.add_picture(escudo, int((ANCHO - ancho_esc) / 2), Inches(0.7), width=ancho_esc, height=alto_esc)
else:
    esc = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, int((ANCHO - Inches(1.3)) / 2), Inches(0.7), Inches(1.3), Inches(1.3))
    esc.fill.background(); esc.line.color.rgb = GRIS_LINEA; esc.line.width = Pt(0.75); esc.shadow.inherit = False
    texto(s, int((ANCHO - Inches(1.3)) / 2), Inches(1.15), Inches(1.3), Inches(0.4), "Escudo UAZ", size=10, color=GRIS, align=PP_ALIGN.CENTER)
texto(s, MARGEN, Inches(2.1), ANCHO - 2 * MARGEN, Inches(0.9), [
    ("Universidad Autónoma de Zacatecas", {"size": 22, "color": MARINO, "bold": True, "align": PP_ALIGN.CENTER, "after": 2}),
    ("Ingeniería en Software. Seminario de Tesis, agosto a diciembre de 2026", {"size": 16, "color": NEGRO, "align": PP_ALIGN.CENTER}),
])
texto(s, MARGEN, Inches(3.15), ANCHO - 2 * MARGEN, Inches(2.0), [
    ("Estimación temprana de esfuerzo, tiempo y costo en proyectos de software para gobiernos municipales", {"size": 28, "color": MARINO, "bold": True, "align": PP_ALIGN.CENTER, "espacio": 1.1, "after": 8}),
    ("Avance de octubre de 2026: cotización temprana para desarrolladores independientes y microempresas, con control de cambios", {"size": 18, "color": NEGRO, "align": PP_ALIGN.CENTER}),
])
texto(s, MARGEN, Inches(5.35), ANCHO - 2 * MARGEN, Inches(1.7), [
    ("Presenta: Rogelio Flores Rodríguez, matrícula 22304084", {"size": 18, "color": NEGRO, "bold": True, "align": PP_ALIGN.CENTER, "after": 4}),
    ("Semestre 8, grupo D, modalidad semiescolarizada", {"size": 15, "color": NEGRO, "align": PP_ALIGN.CENTER, "after": 4}),
    ("Directora de tesis: Dra. Julieta Guadalupe Rodríguez Ruiz", {"size": 15, "color": NEGRO, "align": PP_ALIGN.CENTER, "after": 4}),
    ("Sistema en línea: estimacion.hazlatarea.com", {"size": 15, "color": NEGRO, "align": PP_ALIGN.CENTER}),
])
s.shapes.add_picture(os.path.join(CAP, "logo_emps.png"), ANCHO - MARGEN - Inches(0.7), ALTO - Inches(1.15), width=Inches(0.7), height=Inches(0.7))
notas(s, "Buenas tardes. Me llamo Rogelio Flores Rodríguez y estudio Ingeniería en Software en la Universidad Autónoma de Zacatecas. Esta es la presentación de avance de mi tesis para el Seminario de Tesis, con la dirección de la doctora Julieta Guadalupe Rodríguez Ruiz. Mi tesis es sobre cómo calcular desde el principio cuánto cobrar y cuánto va a tardar un sistema de software. En este avance lo veo desde el lado del que cotiza: el desarrollador independiente o la microempresa que le vende a un ayuntamiento o a un negocio. Hice un cotizador que ya funciona en internet y se los voy a enseñar. Voy a hablar de tres cosas: primero, cuál es el problema y cómo cambió con la inteligencia artificial; segundo, qué probé ya con datos públicos; y tercero, cómo lo voy a probar con desarrolladores reales en lo que queda del semestre.")
GUION.append((1, "Portada", "En pantalla: portada con el escudo de la UAZ y tus datos.", s.notes_slide.notes_text_frame.text))

# =============================================================== 2. El problema
diapo_texto("El problema: cotizar a ciegas", [
    "En México, 84 % de las empresas de software son micro o pequeñas (Aguilar, 2014).",
    "Cotizan por juicio y con hojas de cálculo; 85 % sin datos históricos y 70 % sin revisar su error (Colombia, 2022).",
    "El independiente regala un tercio de sus horas: 8.35 dólares por hora pagada, 5.48 contando lo que no cobra (OIT, 2025).",
    "De 9 estimaciones de un proveedor mexicano, solo 2 cayeron en el rango probable de la industria (Valdés-Souto, 2019).",
], "El problema tiene nombre y apellido. En México casi todas las empresas de software son micro o pequeñas, y muchos trabajan solos. Cotizan por juicio, con una hoja de cálculo, sin datos de proyectos anteriores y sin revisar después cuánto se equivocaron. En Colombia lo midieron: ochenta y cinco por ciento no usa datos históricos y setenta por ciento nunca revisa su error. El independiente, además, regala un tercio de sus horas: la OIT encuestó a más de mil personas que trabajan por plataformas en la región y ganan ocho dólares por hora pagada, pero cinco y medio si se cuenta el tiempo de buscar clientes, cotizar y hacer trámites. Y en México, de nueve estimaciones que un proveedor le presentó a un cliente de gobierno, solo dos cayeron en el rango que la industria mexicana hace probable. Si el precio sale alto, pierdes el contrato. Si sale bajo, trabajas meses por debajo del costo. Ese es el problema.", "Fuente: Aguilar et al. (2014); Gómez Cardozo (2022); OIT (2025); Valdés-Souto (2019). Todas en la bibliografía del artículo.")

# =============================================================== 3. Lo que cambio
diapo_texto("Hoy el software no se hace como antes", [
    "84 % de los desarrolladores usa inteligencia artificial para programar (Stack Overflow, 2026).",
    "90 % usa agentes de código cada semana (JetBrains, 2026).",
    "41 % del código nuevo se genera con inteligencia artificial (GitHub, 2025).",
    ("Estimar solo horas de programación ya no alcanza. Por eso el sistema calcula con cinco formas de hacerlo.", {"size": 22, "bold": True, "color": MARINO, "after": 14}),
], "La pregunta de siempre en esta área es cuántas horas de programación lleva un sistema. El asunto es que la forma de hacer software está cambiando mes con mes. En 2024, seis de cada diez desarrolladores usaban inteligencia artificial. En 2025, casi ocho. En 2026, más de ocho. Y lo nuevo no es que la computadora complete una línea, sino que un agente hace la tarea completa: nueve de cada diez profesionales ya usan agentes cada semana. GitHub dice que cuarenta y uno por ciento del código nuevo se genera con inteligencia artificial. Para la tesis significa algo muy concreto: un modelo que asuma que las horas de programación son el centro del costo se queda corto. Por eso desde el diseño el sistema calcula con cinco formas de hacerlo, no con una sola.")

# =============================================================== 4. No es igual para todos
diapo_texto("Pero la ganancia no es igual para todos", [
    "Expertos en su propio código tardaron 19 % más y creían ir 20 % más rápido (METR, 2025).",
    "Se copia 81 % más código y se limpia 70 % menos (GitClear, 623 millones de cambios).",
    "45 % del código generado trae una falla de seguridad (Veracode, 2026).",
    ("La ganancia depende de la forma de hacerlo y de la pericia del equipo. El sistema las cobra por separado.", {"size": 22, "bold": True, "color": MARINO, "after": 14}),
], "Ahora la otra cara, porque una tesis no puede repetir el folleto de las herramientas. La inteligencia artificial no hace a todos más rápidos. El estudio más serio del año pasado midió a desarrolladores con experiencia trabajando en su propio código: tardaron diecinueve por ciento más, y ellos creían que habían sido veinte por ciento más rápidos. Otro estudio, con seiscientos millones de cambios de código, encontró que se copia mucho más y se limpia mucho menos. Casi la mitad del código generado trae una falla de seguridad. Entonces, la ganancia depende de dos cosas: de la forma de hacerlo y de qué tan bien sabe usar la herramienta el equipo. Por eso el sistema no aplica un descuento parejo: cobra la herramienta por un lado y, por otro, reconoce el ahorro según qué tanto sabe usarla el equipo.")

# =============================================================== 5. Los detalles
diapo_texto("Los detalles ya no llevan ticket", [
    "El ajuste chico antes era un ticket y una espera. Hoy se resuelve en la misma sesión.",
    "Los cambios terminados suben 19 % y cada persona ahorra de 2 a 4 horas por semana (Atlassian, 3,400 repositorios).",
    "De 8,106 correcciones hechas por agentes, 65 % se aceptaron (arXiv, 2026).",
    ("Quien sigue cobrando cada detalle como un día de trabajo se va a quedar sin clientes. El sistema ya lo refleja en el costo de cada cambio.", {"size": 20, "bold": True, "color": MARINO, "after": 14}),
], "Hay algo que aprendí haciendo el sistema y que los datos de este año confirman. Construir el sistema es más rápido, sí, pero lo que más cambió es el detalle. El ajuste chico. Que este texto no se ve bien, que este campo debe validar. Antes eso era un ticket, una espera y a veces un cobro aparte. Hoy se resuelve en la misma sesión. Atlassian lo midió en tres mil cuatrocientos repositorios, que son los lugares donde se guarda el código de cada sistema. Los cambios terminados subieron diecinueve por ciento y cada persona ahorra de dos a cuatro horas por semana. El efecto es mayor en los sistemas chicos, que son justo los de un proveedor municipal. Esto tiene una consecuencia dura para el que cobra: el desarrollador que sigue cobrando cada detalle como si costara un día se va a quedar sin clientes, porque llega otro y lo hace en una tarde. Y tiene una consecuencia para mi sistema: el costo de cada cambio ahora se ajusta por la forma de hacerlo, con la misma regla que usa la calculadora de cambios. Lo van a ver en una pantalla más adelante.", size=20)

# =============================================================== 6. Pregunta e hipotesis
diapo_texto("Pregunta e hipótesis", [
    ("Pregunta", {"size": 14, "color": GRIS, "after": 2}),
    ("¿Se puede calcular desde el inicio, con los datos que el desarrollador sí conoce al cotizar, cuánto cobrar y cuánto va a tardar, con un error útil para decidir y con los cambios, el mantenimiento, las cargas y el flujo de dinero adentro?", {"size": 20, "bold": True, "color": MARINO, "after": 10}),
    ("Hipótesis probadas con datos públicos", {"size": 14, "color": GRIS, "after": 2}),
    ("H1 El juicio ordena pero no dimensiona.   H2 Las palabras del texto no detectan cambios.   H3 Las variables del inicio le ganan al promedio.   H4 Con pocos proyectos gana el modelo con menos parámetros.", {"size": 15, "after": 8}),
    ("Hipótesis del piloto", {"size": 14, "color": GRIS, "after": 2}),
    ("H5 La cifra del sistema queda más cerca de lo que se termina cobrando que la cifra inicial del desarrollador.   H6 La primera cifra sale en menos tiempo que una cotización experta.", {"size": 15}),
], "Con ese terreno, esta es la pregunta de la tesis. Si se puede calcular desde el inicio, con los datos que el desarrollador sí conoce cuando cotiza, cuánto cobrar y cuánto va a tardar. Y que el error sea chico como para decidir con él, y que la cotización traiga adentro los cambios, el mantenimiento, las cargas y el flujo de dinero. Para llegar ahí probé cuatro hipótesis con datos públicos: que el juicio del experto ordena pero no dimensiona; que buscar cambios por palabras en el texto no funciona; que las variables que se conocen al inicio le ganan al promedio; y la cuarta, que es nueva: que con pocos proyectos gana el modelo con menos parámetros, no el aprendizaje automático. Y dejo dos hipótesis para el piloto con desarrolladores: que la cifra del sistema queda más cerca de lo que se termina cobrando que la cifra que ellos traían en la cabeza, y que la primera cifra sale en menos tiempo que una cotización experta.")

# =============================================================== 7 y 8. Graficas
diapo_imagen("Lo que estima el experto contra lo que costó de verdad", os.path.join(FIG, "josse_expert_vs_actual.png"), "Esta gráfica es del dataset JOSSE: tareas reales de proyectos de código abierto. Cada punto es una tarea. En el eje de abajo está lo que el experto estimó y en el eje vertical lo que costó de verdad. La línea diagonal sería la estimación perfecta. Fíjense en dos cosas. Una: los puntos suben junto con la línea, o sea que el experto sí sabe qué tarea es grande y cuál es chica. Eso en estadística se llama correlación, y aquí es alta, de cero punto setenta y nueve. Dos: los puntos están muy regados alrededor de la línea; solo cuatro de cada diez caen cerca. El experto ordena, pero no dimensiona.", "JOSSE (Alhamed, 2022): tareas de Jira con estimación experta, n = 4,329. Correlación 0.79; solo 40 % dentro de más o menos 15 %. Figura 1 del artículo.")
diapo_imagen("Lo mismo, con proyectos completos", os.path.join(FIG, "seera_estimate_vs_actual.png"), "Esta otra gráfica son proyectos completos, ciento veinte, de cuarenta y dos organizaciones. Aquí casi todos los puntos están arriba de la línea. Eso quiere decir que costaron más de lo estimado: ochenta y uno por ciento subestimados, y el proyecto de en medio se pasó cincuenta y ocho por ciento de lo estimado. Es la imagen del problema del que hablé al principio.", "SEERA, n = 120 proyectos. 81 % subestimados; desviación mediana +58.6 %. Figura 2 del artículo.")

# =============================================================== 9. Lo que dicen los datos
diapo_texto("Lo que ya se demostró con datos públicos", [
    "El juicio ordena pero no dimensiona: correlación 0.79, pero solo 40 % de las estimaciones expertas queda dentro de más o menos 15 % (H1).",
    "Buscar cambios por palabras clave en el texto no separa nada (p = 0.57): los cambios se capturan estructurados (H2).",
    "Con las variables que se conocen al inicio, el modelo explica 39 % de la variación en tareas y 81 % en proyectos, contra cero del promedio (H3).",
    "Todo se verificó con un programa independiente: 87 de 87 comprobaciones.",
], "Resumo lo que dicen los datos. Primero: el experto ordena pero no dimensiona. La correlación es alta, cero punto setenta y nueve, pero solo cuatro de cada diez estimaciones quedan cerca del valor real. Segundo: buscar cambios por palabras en el texto de la tarea no distingue nada, y por eso el sistema captura los cambios con su tipo y su fase, en lugar de adivinarlos. Tercero: con las variables que se conocen al inicio del proyecto, un modelo estadístico explica treinta y nueve por ciento de la variación en tareas y ochenta y uno por ciento en proyectos, contra cero del promedio, con una reserva que digo en el artículo: en los proyectos, entre esas variables está la estimación del propio equipo. Todo esto lo verificó un programa aparte, ochenta y siete de ochenta y siete comprobaciones.", "Artículo propio, octubre de 2026. Verificación con scripts/05_verify_results.py.", size=20)

diapo_imagen("Modelo simple contra aprendizaje automático (H4)", "fig3_sa_modelos.png", "Esta es la pregunta que más me hicieron: por qué no aprendizaje automático. Lo probé con siete datasets públicos de esfuerzo, novecientos sesenta y siete proyectos, con validación cruzada repetida, que es entrenar y probar muchas veces con pedazos distintos. La gráfica muestra la exactitud estandarizada: uno es sin error y cero es adivinar al azar. Cada grupo es un dataset y cada barra un modelo. El bosque aleatorio, que es el modelo de aprendizaje automático, nunca fue el mejor en ninguno de los siete. El modelo de un solo parámetro, horas por punto de tamaño, tuvo la mediana más alta: cero punto sesenta contra cero punto cincuenta y seis del bosque.", "Exactitud estandarizada (SA) de cinco modelos en 7 datasets públicos, 967 proyectos. Figura 3 del artículo.")

diapo_imagen("Con pocos proyectos gana el modelo con menos parámetros", "fig4_curva_aprendizaje.png", "Y esta es la gráfica que más importa para un equipo chico. En el eje de abajo está con cuántos proyectos se entrena el modelo: cuatro, ocho, dieciséis, treinta y dos. Con cuatro proyectos, el modelo de dos parámetros se dispara en algunos sorteos, el bosque aleatorio da cero punto veintiséis y el proporcional, el de un solo parámetro, cero punto cuarenta y cinco. Con ocho proyectos: cero punto cuarenta y nueve contra cero punto treinta y cinco del bosque. Con dieciséis: cero punto cincuenta y tres contra cero punto cuarenta y dos. La conclusión es simple: cuantos menos datos tienes, menos parámetros debes ajustar, y los factores se agregan conforme hay datos para calibrarlos. Ese es exactamente el orden en que mi cotizador los aplica: primero horas por pieza, luego los ajustes.", "Curvas de aprendizaje con 4, 8, 16 y 32 proyectos de entrenamiento, mediana entre datasets. Figura 4 del artículo.")

diapo_texto("Un punto de calibración mexicano", [
    "42 proyectos mexicanos con tamaño en puntos COSMIC y horas (Valdés-Souto y Valeriano-Assem, 2024).",
    "Mediana de 12.6 horas por punto; exponente 0.93; R2 de 0.83. Dentro del rango de 13.6 a 21.7 de la industria.",
    "Con esos 42, el modelo log-lineal (0.60) y el bosque (0.63) empatan.",
    ("Son las horas por pieza con las que arranca el cotizador, pero con datos de México.", {"size": 20, "bold": True, "color": MARINO, "after": 14}),
], "Y encontré un punto de calibración mexicano, que no existía en el artículo anterior. Valdés-Souto y Valeriano-Assem publicaron el tamaño y las horas de cuarenta y dos proyectos mexicanos medidos en puntos COSMIC, que es una unidad de tamaño funcional. Reproduje su ajuste: mediana de doce punto seis horas por punto, dentro del rango que la industria mexicana hace probable. Y con esos cuarenta y dos proyectos, el modelo simple y el bosque aleatorio empatan. Esto conecta las horas por pieza con las que arranca mi cotizador con datos de aquí, no de otro país.", "Valdés-Souto y Valeriano-Assem (2024), Tabla 5; ajuste propio, scripts 07 a 10 del artículo.", size=20)

# =============================================================== 10 a 25. El sistema
diapo_imagen("Cotizador de software: la cara del desarrollador", "20_portada_dev.png", "Este es el sistema, en estimacion punto hazlatarea punto com, sin cuenta ni contraseña. Lo rehice para el desarrollador: una pregunta, cuánto cobrar por este sistema, un botón, y un ejemplo ya calculado para que vean el resultado antes de escribir nada. El ejemplo es una clínica dental que pide un sistema de citas y expedientes: ciento ochenta y siete mil pesos con IVA en la forma híbrida, cuatro meses. La cara de ayuntamientos se separó a otro subdominio; la enseño al final. Nota para el video: aquí puedes cambiar a la ventana del navegador y mostrarlo en vivo.", "Portada del lado del desarrollador, octubre de 2026. estimacion.hazlatarea.com", recorte=(0.03, 0.17, 0.97, 0.72))

diapo_imagen("Cotizar en un minuto, en tres pasos", "21_cotizar_paso1.png", "Para que la gente lo use, la entrada tiene que ser fácil. Son tres pasos, uno por pantalla: qué tiene que hacer el sistema, tocando las partes; quién lo hace, yo solo o contrato a alguien; y cuánto dinero hay y para cuándo, los dos opcionales. Lo demás se afina después. Si eliges yo solo, el sistema cobra tu tiempo sin IMSS ni impuesto sobre nómina, con setenta y cinco por ciento de horas facturables, porque un tercio del tiempo no se cobra.", "Paso 1 de Cotizar en un minuto, lado del desarrollador.", recorte=(0.2, 0.02, 0.8, 0.45))

diapo_imagen("El resultado contesta primero", "22_resultado_cifra.png", "Lo primero que ve la persona es la cifra, grande, y debajo una frase que dice de qué está hecha: tu tiempo, las herramientas de IA, tu utilidad y el IVA, con el rango de si todo sale bien a si hay tropiezos. Luego cuánto va a tardar, si le alcanza al cliente con lo que tiene, y qué opción eligió. Todo lo demás de la pantalla explica estos cuatro renglones.", "Las cuatro respuestas del ejemplo de la clínica dental: casi todo con IA, escenario probable.")

diapo_imagen("De cada peso que cobras, cuánto es tuyo", "23_composicion.png", "Esta barra es nueva y es la que más me pedían: de cada peso que cobras, cuánto paga tu tiempo, cuánto las herramientas de inteligencia artificial, cuánto otros gastos, cuánto es tu utilidad y cuánto el IVA. En el ejemplo, cincuenta y tres centavos de cada peso pagan tu tiempo y diecisiete son utilidad. Las partes suman el total y cada una sale de fuentes oficiales.", "Composición del precio del ejemplo. Las partes suman el total con IVA.")

diapo_imagen("Cinco formas de hacerlo, con su rango", "24_formas.png", "El mismo proyecto, con la misma persona, calculado de cinco formas: a mano, con ayuda de inteligencia artificial, híbrido, casi todo con inteligencia artificial, y con una plataforma de armado. Cada barra va del escenario optimista al conservador y el punto oscuro es el probable. De cuatrocientos sesenta mil pesos y once meses a mano, hasta sesenta y siete mil y mes y medio con plataforma de armado. Pero la más barata no siempre sirve: la plataforma de armado no se recomienda aquí porque una pieza crítica maneja datos personales, y el sistema lo dice. La recomendada es casi todo con inteligencia artificial, ciento treinta y seis mil pesos, con reservas: hay piezas críticas que revisar.", "Las cinco formas de hacerlo del ejemplo, escenario probable, con el rango de optimista a conservador.")

diapo_imagen("El dinero que adelantas, mes a mes", "25_flujo.png", "Un desarrollador puede saber programar muy bien y no saber lo que es financiar al cliente. Esta gráfica lo muestra: los cobros hacia arriba, los gastos hacia abajo, y la línea es lo que llevas acumulado. En el mes dos te van a deber cinco mil cuatrocientos pesos, el cuatro por ciento del precio. En un proyecto más grande, con nómina, ese bache es el mes en que los proyectos se abandonan. El sistema lo señala antes de firmar.", "Flujo de dinero del ejemplo, con el peor mes señalado.")

diapo_imagen("La cotización para el cliente", "27_cotizacion_doc.png", "Y este es el documento que recibe el cliente. Es la parte que cambió de fondo: el cliente ya no ve de dónde sale el número, ni la nómina, ni la utilidad, porque eso es del desarrollador. Ve la cotización por concepto: precio con y sin IVA, tiempo, qué se va a construir, qué no incluye, los supuestos, el precio de cada tipo de cambio, el mantenimiento mensual, la forma de pago con anticipo, avance y pago final, y tres condiciones que la ley ya exige por escrito: los cambios se cotizan por escrito y con precio antes de hacerse, la cesión de derechos del programa se pacta por escrito, y el plazo de pago se pacta. Abajo, la aceptación con firma y la vigencia de quince días. Esto lo imprimes o lo mandas por enlace.", "Documento de cotización del ejemplo, listo para imprimir o compartir por enlace.", recorte=(0.22, 0.10, 0.78, 0.27))

diapo_imagen("Quién lo hace: solo o contratando", "28_equipo_quien.png", "En la pantalla de equipo se dice quién lo hace: yo solo, yo más personas contratadas, o un equipo. Cada persona tiene su tipo de contrato, con las cargas que le tocan: nómina con IMSS, INFONAVIT e impuesto sobre nómina; asimilados; honorarios; freelance; o propio, que es lo que vale tu tiempo. El sueldo se captura mensual o diario, porque en México se paga por salario diario, con la conversión a la vista y un aviso si queda abajo del mínimo. Y se dice cuántas semanas participa cada quien, para que el costo, la liquidación y el flujo salgan por persona y no parejo.", "Pantalla de equipo: quién lo hace, base de pago mensual o diaria, semanas que participa y tipo de contrato.")

diapo_imagen("Todo con fuente, y ahora con las leyes", "29_fuentes.png", "Un sistema así solo sirve si se le puede creer. La pantalla de fuentes abre con las cifras que todos reconocen: IVA, ISR, UMA, salario mínimo, impuesto sobre nómina, una cuota patronal y el tipo de cambio, cada una con su fuente oficial y su fecha. Y agregué el grupo de leyes de la cotización: el Código Civil para los cambios, la Ley del Derecho de Autor para el código, la Ley del Consumidor para el presupuesto, el Código de Comercio para el pago, y la ley de adquisiciones para cuando el cliente es gobierno. Los precios de las herramientas de inteligencia artificial llevan fecha del trece de octubre, porque cambian cada mes.", "Pantalla Fuentes: cifras grandes con su fuente y el grupo de leyes de la cotización.")

diapo_texto("La forma de hacerlo pesa más que el precio", [
    "Mismo proyecto de ejemplo (clínica dental, una persona), escenario probable:",
    "A mano: 460 mil pesos y 11 meses.",
    "Híbrido: 187 mil pesos y 4.2 meses.",
    "Casi todo con inteligencia artificial: 137 mil pesos y 2.8 meses (recomendada, con reservas).",
    "Plataforma de armado: 67 mil pesos y 1.6 meses (no recomendada: datos personales).",
    ("Siete veces de diferencia entre la forma más cara y la más barata. Y no todas sirven: se descartan por datos personales, conexiones, criticidad y pericia.", {"size": 20, "bold": True, "color": MARINO, "after": 14}),
], "Este es el hallazgo que sostiene la tesis. Miren las cifras del mismo proyecto: a mano, cuatrocientos sesenta mil pesos y once meses. Híbrido, ciento ochenta y siete mil y cuatro meses. Casi todo con inteligencia artificial, ciento treinta y siete mil y menos de tres meses. Plataforma de armado, sesenta y siete mil y mes y medio. Siete veces de diferencia. Por eso digo que la forma de hacerlo pesa más que el precio. Pero la más barata no siempre sirve: la plataforma de armado no se recomienda para un sistema con datos personales, y el sistema la descarta y dice por qué. Y hacer casi todo con inteligencia artificial no se le recomienda a quien nunca la ha usado.", "Cifras del ejemplo del desarrollador, octubre de 2026, con los parámetros vigentes.", size=20)

diapo_imagen("La encuesta del piloto", "09_encuesta_piloto.png", "Ahora lo que sigue, que es lo que le pido al seminario que revise. Al pie de cada resultado hay cuatro preguntas que se contestan en treinta segundos: qué tan creíble te pareció la cifra, del uno al cinco; cuánto pensabas cobrar antes de verla; con qué forma de hacerlo lo harías; y qué te faltó. Es anónima. Con eso comparo lo que el desarrollador pensaba cobrar contra lo que el sistema calculó, sin esperar a que un proyecto termine, porque eso puede tardar meses.", "Encuesta de salida del piloto, al pie del resultado.")

diapo_imagen("Lo que el sistema mide sin preguntar", "15_panel_investigador.png", "Además de la encuesta, el sistema mide cosas sin preguntar. Cuánto tarda cada persona en llegar a su primera cifra. Cuántos empiezan y no terminan. Qué forma de hacerlo eligen. Y cuando un proyecto termina, se captura lo que costó de verdad. Con quince casos terminados, el sistema calcula solo las mismas medidas del artículo y dice si la hipótesis se cumple o no. Este es el panel del investigador, donde se ve todo eso.", "Panel del investigador: tiempo a la primera cifra, por lado de la mesa y encuesta del piloto.")

diapo_imagen("La cara de ayuntamientos se separó", "32_portada_ayto.png", "Y esto es lo que decidí sobre el otro lado. Al probar el sistema con otras personas salió algo de fondo: no tiene lógica que la misma persona vea el lado del proveedor y el del municipio. Si el desarrollador ve el presupuesto del ayuntamiento cotiza a ese tope, y si el ayuntamiento ve la nómina y la utilidad del desarrollador, lo aprieta. Así que el sistema tiene dos caras con el mismo motor: estimacion punto hazlatarea punto com para el desarrollador, y ayuntamientos punto hazlatarea punto com para el municipio, que queda como estaba y ve cuánto le deberían cobrar. Ninguna página ni ninguna consulta abre un proyecto del otro lado.", "Portada de la cara de ayuntamientos: el mismo motor, otra cara, sin ver el lado del desarrollador.")

# =============================================================== 26. Validacion y difusion
diapo_texto("Plan del piloto", [
    "Ola 1, octubre y noviembre: desarrolladores independientes y microempresas, por grupos de Facebook, Instagram, Discord y de la carrera. Cotizan un proyecto real en un minuto, anotan antes cuánto pensaban cobrar y contestan la encuesta.",
    "Qué se mide: cifra esperada contra calculada, credibilidad, forma elegida, tiempo a la primera cifra, abandono, y el costo real cuando alguien cierre.",
    "Con quince casos: se calibran los factores y se compara el modelo paramétrico contra aprendizaje automático con datos locales.",
    "Por qué importa: no existe ningún estudio mexicano de cómo cotizan las microempresas. El piloto sería el primero.",
], "El plan de validación es un piloto con desarrolladores reales. Lo difundo en grupos de Facebook, Instagram, Discord y de la carrera, con un texto corto: cotiza un proyecto real en un minuto, anota antes cuánto pensabas cobrar y contesta cuatro preguntas. Lo que se mide es la diferencia entre lo que pensaban cobrar y lo que calculó el sistema, qué tan creíble les pareció, qué forma de hacerlo elegirían, cuánto tardaron en llegar a su primera cifra, cuántos abandonan, y el costo real cuando alguien cierre un proyecto. Con quince casos calibro los factores y comparo el modelo paramétrico contra aprendizaje automático con datos de aquí. Y hay una razón de peso para hacerlo: no existe ningún estudio mexicano que mida cómo cotizan las microempresas de software. Este piloto sería el primero.", "Textos para los grupos y qué se mide: docs/piloto/textos_para_grupos.md.", size=20)

# =============================================================== 27. El modelo
diapo_texto("El modelo se decide con datos, no antes", [
    "Hoy el motor es una cuenta fija que cualquiera rehace a mano, de la misma familia que COCOMO: tamaño por factores, entre capacidad, a dinero con cargas reales.",
    "Los datos públicos dicen que con pocos proyectos gana el modelo con menos parámetros; a esa familia nada le ha ganado con datos del mismo tipo (Menzies, 2017) y bastan de 4 a 8 proyectos para recalibrarla.",
    "Con 15 casos del piloto, el sistema compara el paramétrico calibrado contra aprendizaje automático, con criterios fijados de antemano.",
    ("No prometo un modelo. Prometo el método para elegirlo con datos de desarrolladores mexicanos, que hoy no existen en ningún lado.", {"size": 20, "bold": True, "color": MARINO, "after": 14}),
], "Sobre el modelo, quiero ser honesto: no voy a decir hoy cuál es el modelo que lo va a predecir todo, porque no tengo los datos para decirlo. Hoy el motor no adivina: es una cuenta fija que cualquiera puede rehacer a mano, de la misma familia que COCOMO, tamaño por factores, dividido entre la capacidad, convertido a dinero con cargas reales. Y los datos públicos me dieron la razón: con pocos proyectos gana el modelo con menos parámetros, y a esa familia nada le ha ganado con datos del mismo tipo; bastan de cuatro a ocho proyectos para recalibrarla. Con quince casos del piloto, el sistema compara el paramétrico calibrado contra aprendizaje automático, con criterios que ya están fijados. No prometo un modelo. Prometo el método para elegirlo con datos de desarrolladores mexicanos, que hoy no existen en ningún lado.", "Fuentes: Menzies et al. (2017); Abedu (2021); Tawosi et al. (2023); Shepperd y MacDonell (2012). Resultados propios, figuras 3 y 4.", size=20)

# =============================================================== 28. Limites
diapo_texto("Límites, dichos de frente", [
    "Ningún dataset público tiene desarrolladores independientes mexicanos. Sirven para probar las premisas, no para calibrar.",
    "En SEERA la duración y el esfuerzo son la misma fórmula: es una evidencia, no dos. Y el 0.81 de H3 depende de la estimación del propio equipo.",
    "Las tarifas de freelancers y el costo de mantenimiento vienen de empresas, sin método publicado: son orden de magnitud.",
    "Los precios de las herramientas de IA tienen fecha del 13 de octubre de 2026 y caducan; por eso son parámetros con fecha, no números fijos.",
    "La encuesta la contesta quien quiere, así que hay sesgo; por eso también se mide sin preguntar.",
], "Los límites, dichos de frente. Uno: ningún dataset público tiene desarrolladores independientes mexicanos; sirven para probar las premisas, no para calibrar. Dos: en SEERA la duración y el esfuerzo son la misma fórmula, así que es una sola evidencia, y el ochenta y uno por ciento de la tercera hipótesis depende de que el equipo ya había estimado. Tres: las tarifas de freelancers y el costo de mantenimiento vienen de empresas, sin método publicado; los uso como orden de magnitud. Cuatro: los precios de las herramientas cambian cada mes, por eso son parámetros con fecha y no números fijos. Y cinco: la encuesta la contesta quien quiere, así que contestan más los convencidos, y por eso también mido cosas sin preguntar.", size=20)

# =============================================================== 29. Cronograma
s = prs.slides.add_slide(BLANK)
encabezado(s, "Cronograma, agosto a diciembre de 2026")
filas = [("Mes", "Actividad", "Estado"),
         ("Agosto", "Radiografía de la tesis y matriz de seguimiento.", "Entregado"),
         ("Septiembre", "Sistema con herramientas de IA, pericia del equipo, cotización rápida, enlace para compartir y encuesta del piloto. Desplegado en el servidor.", "Hecho"),
         ("Octubre", "Artículo reescrito con datos públicos y sistema con dos caras y cotización para el cliente. Arranca el piloto con desarrolladores.", "Hecho / En curso"),
         ("Noviembre", "Piloto con desarrolladores en grupos; análisis de la encuesta y de las medidas de uso; calibración si hay quince casos.", "Por hacer"),
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
    "Al jurado: su opinión sobre el instrumento del piloto: las cuatro preguntas, lo que se mide sin preguntar y la regla de esperar quince casos.",
    "A los desarrolladores: cotizar un proyecto real, anotar antes cuánto pensaban cobrar y decirme si la cifra se acerca.",
    "A los ayuntamientos: treinta minutos para probar su cara con un proyecto real, sin cuenta y sin instalar nada.",
    ("Los tiempos ya cambiaron. El que cotiza como antes, o compra como antes, va a perder. Este sistema es una forma de que cada lado vea su número, con todo lo que trae adentro, antes de firmar.", {"size": 20, "bold": True, "color": MARINO, "after": 14}),
    ("Gracias.", {"size": 20, "color": GRIS}),
], "Cierro con lo que pido. Al jurado, su opinión sobre el instrumento del piloto: las cuatro preguntas, lo que se mide sin preguntar y la regla de esperar quince casos terminados. A los desarrolladores, cotizar un proyecto real, anotar antes cuánto pensaban cobrar y decirme si la cifra se acerca. A los ayuntamientos, treinta minutos para probar su cara con un proyecto real, sin cuenta y sin instalar nada. La tesis parte de una idea sencilla: los tiempos ya cambiaron, y el que cotiza como antes, o compra como antes, va a perder. Este sistema es una forma de que cada lado vea su número, con todo lo que trae adentro, antes de firmar. Gracias.")

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
    "Alhamed, M. (2022). JOSSE: A Software Development Effort Dataset Annotated with Expert Estimates. Zenodo, DOI 10.5281/zenodo.7022735. Y SEERA dataset, PROMISE, ACM, 2020, Zenodo, DOI 10.5281/zenodo.4066438.",
    "Strand Partners para AWS. Desbloqueando el potencial de la IA en México 2026. 13 de agosto de 2026.",
    "ATDT. Llave MX y Repositorio Nacional de Tecnología para gobiernos estatales y municipales. 7 de diciembre de 2025.",
    "CIAPEM y tapi. Diagnóstico Nacional 2026 de recaudación digital. ciapem.org. 2026.",
    "Code for America. Government AI Landscape Assessment, segunda edición. 1 de mayo de 2026.",
    "BID Lab y Red de Innovación Local. GovTech Connect. 2026.",
    "Páginas de precios consultadas el 9 de septiembre de 2026: GitHub Copilot, Cursor, Anthropic Claude, Microsoft Power Apps, Google Gemini Code Assist. Banxico, tipo de cambio FIX.",
    "Aguilar, J., Sánchez, M. y Fernández-y-Fernández, C. (2014). The Size of Software Projects Developed by Mexican Companies. arXiv 1408.1068.",
    "Gómez Cardozo, D. M. (2022). Diagnóstico de la estimación de esfuerzo en métodos ágiles para desarrollo de software en Colombia. Tesis, Universidad Nacional de Colombia.",
    "OIT (Cravo, T.) (2025). Encuesta sobre trabajadores en plataformas digitales basadas en la web. Nuevos datos para América Latina y el Caribe.",
    "Valdés-Souto, F. (2019). Validation of Supplier Estimates Using COSMIC Method. IWSM-Mensura, CEUR-WS vol. 2476. Y Valdés-Souto, F. y Valeriano-Assem, J. (2024). Merging Distinct Sources Databases to Improve Software Estimation Models. COSMIC.",
    "Menzies, T., Yang, Y., Mathew, G., Boehm, B. y Hihn, J. (2017). Negative results for software effort estimation. Empirical Software Engineering. arXiv 1609.05563.",
    "Tawosi, V., Moussa, R. y Sarro, F. (2023). Agile Effort Estimation: Have We Solved the Problem Yet? IEEE TSE. arXiv 2201.05401.",
    "Abedu, S. (2021). Machine Learning Algorithms on Small-Sized Datasets in Software Effort Estimation. Tesis, University of Ghana.",
    "Shepperd, M. y MacDonell, S. (2012). Evaluating prediction systems in software project estimation. Information and Software Technology. arXiv 2101.05426.",
    "Project Management Institute (2024). Pulse of the Profession 2024.",
    "Código Civil Federal (art. 2627), Ley Federal del Derecho de Autor (arts. 30 y 83), Ley Federal de Protección al Consumidor (art. 59), Código de Comercio (arts. 83 y 362) y LAASSP (art. 74). Cámara de Diputados, textos vigentes 2025 y 2026.",
    "Datasets públicos de esfuerzo (PROMISE): Desharnais, China, Kitchenham, Maxwell, COCOMO81, NASA93 y Albrecht, con procedencia y hash en el repositorio del artículo.",
    "Flores Rodríguez, R. Artículo: Cotización temprana de proyectos de software para desarrolladores independientes y microempresas en México: esfuerzo, tiempo, costo y control de cambios. Octubre de 2026.",
    "Flores Rodríguez, R. Actividad 1, Radiografía de mi tesis. Seminario de Tesis, UAZ. Agosto de 2026.",
    "Leyes y fuentes oficiales: LIVA, LISR, LSS, LFT, LINFONAVIT; DOF, CONASAMI, IMSS; Secretaría de Finanzas de Zacatecas (impuesto sobre nómina 2026).",
]
mitad = (len(REFERENCIAS) + 2) // 3
for k, bloque in enumerate((REFERENCIAS[:mitad], REFERENCIAS[mitad:2 * mitad], REFERENCIAS[2 * mitad:])):
    s = prs.slides.add_slide(BLANK)
    encabezado(s, f"Referencias ({k + 1} de 3)")
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

DESTINO = os.environ.get("SALIDA_PPTX") or AQUI
salida = os.path.join(DESTINO, "tesis_emps_2026_v4.pptx")
prs.save(salida)
print("pptx:", salida, "|", len(prs.slides), "diapositivas")

# =============================================================== guion en Word
doc = Document()
st = doc.styles["Normal"]; st.font.name = "Arial"; st.font.size = DPt(11)
doc.add_heading("Guion del video de presentación de tesis", level=1)
doc.add_paragraph("Rogelio Flores Rodríguez. Seminario de Tesis, Ingeniería en Software, UAZ. Septiembre de 2026.")

doc.add_heading("Cómo usar este guion", level=2)
for l in [
    "No hay que aprenderlo de memoria. Lee cada renglón como si lo contaras; cada renglón es una idea.",
    "Lo que está en cursiva es lo que se ve en la pantalla en ese momento. Lo demás es lo que dices.",
    "Si te trabas, salta al siguiente renglón. Los números importantes también están en la diapositiva.",
    "Las mismas palabras están en las notas de cada diapositiva de PowerPoint, por si grabas con la vista del presentador.",
]:
    doc.add_paragraph(l, style="List Bullet")

doc.add_heading("La tesis en diez renglones", level=2)
for l in [
    "Un desarrollador independiente o una microempresa en México cotiza por juicio, con hojas de cálculo y sin datos, y deja fuera el tiempo que no factura, los cambios, el mantenimiento y las cargas de contratar.",
    "Los datos públicos dicen que estimar mal es lo normal: ocho de cada diez proyectos cuestan más de lo estimado y el experto ordena pero no dimensiona.",
    "Hoy casi todos los desarrolladores usan inteligencia artificial y muchos usan agentes que hacen la tarea completa. Eso cambia lo que cuesta un sistema, y la ganancia depende de la forma de hacerlo y de la pericia.",
    "Con siete datasets públicos probé que, con pocos proyectos, gana el modelo con menos parámetros: el bosque aleatorio nunca fue el mejor y el modelo de horas por punto fue el más robusto.",
    "Encontré un punto de calibración mexicano: 42 proyectos con 12.6 horas por punto COSMIC de mediana.",
    "Hice un cotizador, EMPS, que calcula cuánto cobrar, cuánto va a tardar, con qué forma de hacerlo y qué incluir, con parámetros fechados y con fuente.",
    "El cotizador cobra las herramientas de IA por persona, reconoce el ahorro según la pericia, suma la nómina con sus cargas o tu propio tiempo si trabajas solo, y muestra el flujo de dinero mes a mes.",
    "Tiene dos caras: el desarrollador ve costo, margen y flujo; el cliente recibe una cotización por concepto con las condiciones que la ley exige por escrito.",
    "Lo que sigue es un piloto con desarrolladores reales en grupos de la carrera y de redes, con una encuesta de cuatro preguntas y medidas que el sistema toma solo.",
    "El modelo se va a decidir con datos, cuando haya quince casos, con un método que ya está listo.",
]:
    doc.add_paragraph(l, style="List Number")

doc.add_heading("Palabras que salen en la presentación, explicadas", level=2)
for t, d in [
    ("Forma de hacerlo", "Cómo se construye el sistema: todo a mano, con ayuda de inteligencia artificial, híbrido (lo delicado a mano y lo repetitivo con IA), casi todo con IA (agentes que escriben el código y una persona que revisa), o plataforma de armado (programas como Power Apps donde se arma sin programar)."),
    ("Pericia con la IA", "Qué tanto sabe una persona usar la inteligencia artificial para programar, del uno al cinco. Uno es que nunca la ha usado; cuatro es que la usa a diario y sabe pedirle las cosas; cinco es que arma flujos con agentes."),
    ("Asiento", "Una licencia de una herramienta para una persona. Las herramientas de IA se cobran por asiento, es decir, por persona, no por equipo."),
    ("Capital de trabajo o dinero que se adelanta", "Lo que el proveedor tiene que poner de su bolsa mientras el cliente le termina de pagar, porque la nómina se paga cada mes y el cliente paga por partes."),
    ("Escenario conservador", "El cálculo por si hay tropiezos: más horas, y en el caso de las herramientas, un aumento de precio prorrateado. Los otros dos escenarios son si todo sale bien y lo más seguro."),
    ("Dentro de más o menos 15 %", "Que la estimación quedó cerca del valor real: ni 15 % arriba ni 15 % abajo. Cuatro de cada diez quiere decir que solo cuatro estimaciones de cada diez estuvieron así de cerca."),
    ("Correlación", "Qué tanto suben juntas dos cosas. Aquí, si el experto dice que una tarea es grande, de verdad es grande. Va de cero a uno; 0.79 es alta."),
    ("Exactitud estandarizada (SA)", "Qué tan bien predice un modelo comparado con adivinar al azar. Uno es sin error y cero es adivinar."),
    ("Modelo proporcional", "Esfuerzo igual a horas por punto de tamaño. Un solo parámetro. Es la regla con la que arranca el cotizador."),
    ("Contrato propio", "Lo que vale tu tiempo cuando trabajas solo: sin IMSS ni impuesto sobre nómina, con 75 % de horas facturables porque un tercio no se cobra."),
    ("Punto COSMIC", "Unidad de tamaño funcional del estándar ISO 19761; la industria mexicana reporta de 13.6 a 21.7 horas por punto."),
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
    # Una frase por renglon: se lee de un vistazo mientras se graba.
    for frase in re.split(r"(?<=[.!?])\s+", nt.strip()):
        if frase:
            q = doc.add_paragraph(frase); q.paragraph_format.space_after = DPt(4)

doc.add_heading("Duración y ajustes", level=2)
doc.add_paragraph(f"Hablando a ritmo normal, unos {total_min:.0f} minutos en total. Si el video debe durar menos, las diapositivas 4, 5 y 9 se pueden decir en una sola frase cada una, y las de capturas del sistema (10 a 25) se pueden mostrar en vivo en el navegador en vez de una por una.")

doc.add_heading("Antes de grabar", level=2)
for l in [
    "Tener abierto estimacion.hazlatarea.com en otra ventana para mostrar el sistema en vivo en las diapositivas 10 a 25.",
    "Las cifras del ejemplo son de septiembre de 2026; si se vuelve a calcular el ejemplo con parámetros nuevos, actualizar la diapositiva 15.",
]:
    doc.add_paragraph(l, style="List Bullet")
doc.save(os.path.join(DESTINO, "guion_video_v4.docx"))
print("docx: guion_video_v4.docx |", f"{total_min:.0f} minutos aproximados")

with io.open(os.path.join(AQUI, "referencias.md"), "w", encoding="utf-8") as f:
    f.write("# Referencias de la presentación\n\nConsultadas el 18 de septiembre de 2026 salvo donde se indica otra fecha.\n\n")
    for i, r in enumerate(REFERENCIAS, 1):
        f.write(f"{i}. {r}\n")
print("md: referencias.md")
