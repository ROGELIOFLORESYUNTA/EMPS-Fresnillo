# Resultados con datasets públicos de esfuerzo (octubre de 2026)

Fecha: 14 de octubre de 2026. Sirve para la hipótesis sobre pocos proyectos (H4 en `article/main.tex`; se planeó como H2): con 43 proyectos o menos, ¿un modelo paramétrico calibrado con los datos locales iguala o supera al aprendizaje automático?

Todo lo que se cita aquí sale de los CSV de `outputs/` y se verifica con `scripts/05_verify_results.py` (87 de 87 comprobaciones, 61 de ellas nuevas). La procedencia de cada archivo bajado está en `data/raw/promise/PROCEDENCIA.md`.

## En pocas palabras

1. Se bajaron los **7 datasets públicos** pedidos (**967 proyectos**), con fuente, URL exacta, fecha, hash y cita. No se saltó ninguno.
2. Entre los cuatro modelos del artículo, el **bosque aleatorio no fue el mejor en ninguno** de los 7 datasets. El log-lineal fue el mejor en 4 y el lineal con transformaciones en 3.
3. El bosque **superó al log-lineal con significancia** (p < 0.05) en **2 de 7** (COCOMO81 y NASA93, los dos con 15 factores de ajuste y de 63 a 93 proyectos). El log-lineal igualó o superó al bosque en **5 de 7**.
4. Mediana de la exactitud estandarizada (SA) entre datasets: 0.38 la mediana de entrenamiento, 0.59 el log-lineal, 0.51 el lineal con transformaciones y 0.56 el bosque. El modelo proporcional (solo se calibran las horas por punto) llega a 0.60.
5. **Curvas de aprendizaje.** Con 8 proyectos de entrenamiento el log-lineal obtiene 0.42 y el bosque 0.35; con 16, 0.49 contra 0.42. **Con 4 proyectos el log-lineal de dos parámetros es inestable** (promedio −0.51; en el sorteo típico, 0.31 contra 0.20 del bosque). El modelo proporcional sí aguanta: 0.45 con 4 proyectos contra 0.26 del bosque.
6. **SEERA, duración:** 80.8 % de los proyectos (97 de 120) tardó más de lo estimado, con desviación mediana de +58.6 %. Pero en SEERA el esfuerzo es una fórmula de la duración, así que **no es una segunda confirmación independiente** (sección 4).
7. **Punto mexicano:** el artículo de Valdés-Souto y Valeriano-Assem (2024) sí trae el tamaño y el esfuerzo de cada uno de **42 proyectos mexicanos**. El ajuste log-lineal da exponente 0.93, R² de 0.83 y una mediana de 12.6 horas por punto COSMIC. Con esos 42 el log-lineal y el bosque quedan parejos.
8. **Un contraste con H1:** en Kitchenham la estimación inicial de la empresa (juicio experto) fue **más exacta que cualquier modelo de tamaño** (SA 0.81, 62 % dentro de 25 %). No todo juicio experto es malo (sección 3.6).
9. **Veredicto para H4, con honestidad:** se sostiene "iguala o supera" desde 8 proyectos (log-lineal) o desde 4 (proporcional). **No se sostiene** "la ventaja es mayor cuanto menos proyectos hay" para el log-lineal de dos parámetros; sí para el proporcional (sección 3.5).

## 1. Qué es cada dataset

| Dataset | Origen | País y periodo | Proyectos | Tamaño | Esfuerzo en | Variables extra |
|---|---|---|---:|---|---|---:|
| Albrecht | IBM Data Processing Services | EE. UU.; décadas de 1970 | 24 | puntos de función ajustados | miles de horas | 5 |
| Maxwell | uno de los mayores bancos comerciales de Finlandia | Finlandia; 1985 a 1993 | 62 | puntos de función | horas | 23 |
| COCOMO81 | proyectos reunidos por Boehm para calibrar COCOMO | EE. UU.; publicado en 1981 | 63 | miles de líneas de código (KDSI) | personas-mes | 15 |
| Desharnais | 10 organizaciones de software | Canadá; 1983 a 1988 | 81 | puntos de función ajustados | horas | 6 |
| NASA93 | cinco centros de desarrollo de la NASA | EE. UU.; 1971 a 1987 | 93 | miles de líneas de código físicas equivalentes (KLOC) | personas-mes | 16 |
| Kitchenham | Computer Sciences Corporation (CSC), desarrollo y mantenimiento | EE. UU. (empresa multinacional); 1994 a 1999 | 145 | puntos de función ajustados | horas | 2 |
| China | empresas de software (procedencia no documentada por la fuente) | China (por el nombre del dataset); no documentado (donado en 2010) | 499 | puntos de función ajustados | horas | 9 |

Notas:

- Son proyectos **terminados**, con esfuerzo real. Ninguno es mexicano salvo el punto de la sección 5, y los de Albrecht y COCOMO81 son de los años setenta. Sirven para comparar **tipos de modelo**, no para fijar las horas de Fresnillo.
- China no documenta su origen (quien lo recibió dice que llegó en 2010 sin más datos). Desharnais trae 4 proyectos con la experiencia del equipo o del gerente sin capturar (valen -1); se trataron como dato faltante y se rellenaron con la mediana del entrenamiento.
- Los archivos están completos en `data/raw/promise/` (todos pesan menos de 40 KB). Para Desharnais, China, Kitchenham y NASA93 se bajó además una copia de un espejo independiente y se comprobó que coincide.

## 2. Qué se hizo

### 2.1 Qué se predice y con qué

- **Se predice** el esfuerzo real de cada proyecto.
- **Tamaño:** puntos de función o líneas de código, según el dataset (tabla anterior).
- **Variables extra:** las columnas numéricas u ordinales que se conocen al arrancar el proyecto. Las escalas de COCOMO (muy bajo a extra alto) se convirtieron a 1 a 6. Las categorías sin orden (lenguaje, tipo de proyecto, cliente, centro de la NASA) no se usaron.
- **Fuga de información.** Se excluyó todo lo que se deriva del esfuerzo o de la duración reales: la duración real (China, Desharnais, Kitchenham, Maxwell) y, en China, el esfuerzo normalizado y las cuatro columnas de horas por punto, que se calculan con el esfuerzo real. En Kitchenham también se excluyó la estimación inicial de la empresa porque es otro tipo de dato (una opinión experta), no una característica del proyecto. En Maxwell se dejó fuera la columna `Time` porque la fuente no dice qué mide. La lista completa, con el motivo de cada columna, está en `data/raw/promise/PROCEDENCIA.md`.

### 2.2 Los modelos

| Modelo | Qué hace, en palabras sencillas |
|---|---|
| Mediana | Predice para todos el esfuerzo mediano de los proyectos de entrenamiento. Es el piso: cualquier modelo debe ganarle. |
| Log-lineal | esfuerzo = a × tamaño^b. Se calibra con mínimos cuadrados sobre logaritmos: es la curva "local" que ya usan COCOMO y las calibraciones por empresa. |
| Lineal con transformaciones | Regresión lineal con todas las variables, tomando logaritmo a las positivas (log(1+x) si traen ceros). Es una versión simple de ATLM. |
| Bosque aleatorio | 200 árboles, semilla fija, parámetros por omisión, con tamaño y todas las variables extra. |
| Proporcional (complementario) | esfuerzo = a × tamaño. Solo se calibra la productividad (horas por punto); el exponente vale 1. Se agregó porque es la idea de "horas por pieza" del motor y porque no se desestabiliza con pocos proyectos. |

Los modelos que aprenden (todos menos la mediana) se ajustan sobre el logaritmo del esfuerzo y se regresan a horas con exp().

### 2.3 Cómo se mide

- **Validación cruzada de 5 pliegues repetida 10 veces** (semilla 2026): 50 pruebas por dataset y por modelo. Nunca se evalúa un proyecto con un modelo que lo vio.
- **MdMRE:** error relativo mediano (menor es mejor). **PRED(25):** proporción de proyectos con error de 25 % o menos (mayor es mejor). **MAE:** error absoluto medio, en las unidades del dataset.
- **SA (exactitud estandarizada)** = 1 − error del modelo ÷ error de adivinar (Shepperd y MacDonell, 2012). "Adivinar" es darle a cada proyecto de prueba el esfuerzo real de un proyecto de entrenamiento elegido al azar, y se promedian 1000 sorteos. **0 es tan malo como adivinar, 1 es sin error y un valor negativo es peor que adivinar.** Sirve para comparar entre datasets porque no depende de las unidades.
- **Wilcoxon** de rangos con signo sobre el MAE de cada pliegue, contra la mediana y contra el log-lineal. Como los 50 pliegues comparten proyectos, ese p es optimista; por eso también se reporta una versión conservadora con los 10 promedios por repetición.
- **Curvas de aprendizaje:** para n = 4, 8, 16 y 32 (solo si n es menor que la mitad del dataset), 100 sorteos al azar de n proyectos para entrenar y todos los demás para probar.

## 3. Resultados

### 3.1 Exactitud estandarizada (SA) promedio

Más alto es mejor. En negritas, el mejor de los cuatro modelos del artículo en cada fila. El asterisco marca que el bosque supera al log-lineal con p < 0.05. Filas de menos a más proyectos.

| Dataset | Proyectos | Mediana | Log-lineal | Lineal con transf. | Bosque aleatorio | Proporcional (a·tamaño) |
|---|---:|---:|---:|---:|---:|---:|
| Albrecht | 24 | 0.41 | **0.76** | 0.34 | 0.63 | 0.64 |
| Maxwell | 62 | 0.36 | **0.57** | 0.51 | 0.56 | 0.58 |
| COCOMO81 | 63 | 0.48 | 0.60 | **0.79** | 0.64\* | 0.64 |
| Desharnais | 81 | 0.34 | **0.52** | 0.48 | 0.48 | 0.53 |
| NASA93 | 93 | 0.38 | 0.60 | **0.65** | 0.64\* | 0.60 |
| Kitchenham | 145 | 0.45 | 0.59 | **0.61** | 0.51 | 0.68 |
| China | 499 | 0.37 | **0.53** | 0.51 | 0.49 | 0.45 |
| **Mediana de los 7** |  | 0.38 | 0.59 | 0.51 | 0.56 | 0.60 |

La mediana de entrenamiento queda en 0.34 a 0.48; todos los modelos que aprenden le ganan con significancia en casi todos los datasets (Log-lineal: 7 de 7; Proporcional (a·tamaño): 7 de 7; Lineal con transf.: 6 de 7; Bosque aleatorio: 7 de 7). La excepción es el lineal con transformaciones en Albrecht: con 24 proyectos y 5 variables extra, algunos pliegues dan predicciones disparadas y arrastran el promedio (SA mediana por pliegue de 0.63, promedio de 0.34).

### 3.2 Las otras métricas

| Dataset | MdMRE Mediana | MdMRE Log-lineal | MdMRE Lineal con transf. | MdMRE Bosque aleatorio | PRED(25) Mediana | PRED(25) Log-lineal | PRED(25) Lineal con transf. | PRED(25) Bosque aleatorio |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Albrecht | 0.60 | 0.32 | 0.48 | 0.43 | 27 % | 46 % | 27 % | 33 % |
| Maxwell | 0.63 | 0.48 | 0.45 | 0.42 | 18 % | 22 % | 27 % | 30 % |
| COCOMO81 | 0.99 | 0.66 | 0.33 | 0.58 | 9 % | 18 % | 40 % | 19 % |
| Desharnais | 0.50 | 0.34 | 0.37 | 0.37 | 27 % | 38 % | 33 % | 33 % |
| NASA93 | 1.04 | 0.41 | 0.30 | 0.35 | 12 % | 32 % | 44 % | 40 % |
| Kitchenham | 0.58 | 0.40 | 0.37 | 0.45 | 23 % | 29 % | 31 % | 26 % |
| China | 0.71 | 0.57 | 0.56 | 0.57 | 15 % | 21 % | 20 % | 21 % |

Mediana entre datasets del MdMRE: mediana de entrenamiento 0.63, log-lineal 0.41, lineal con transformaciones 0.37, bosque 0.43, proporcional 0.39. Del PRED(25): mediana de entrenamiento 18 %, log-lineal 29 %, lineal con transformaciones 31 %, bosque 30 %, proporcional 37 %.

### 3.3 ¿El bosque supera al log-lineal?

| Dataset | SA log-lineal | SA bosque | p (50 pliegues) | p (10 repeticiones) | ¿El bosque supera al log-lineal? |
|---|---:|---:|---:|---:|---|
| Albrecht | 0.76 | 0.63 | &lt; 0.001 | 0.002 | no (el log-lineal tiene menos error) |
| Maxwell | 0.57 | 0.56 | 0.025 | 0.002 | no (el log-lineal tiene menos error) |
| COCOMO81 | 0.60 | 0.64 | 0.024 | 0.049 | sí |
| Desharnais | 0.52 | 0.48 | &lt; 0.001 | 0.002 | no (el log-lineal tiene menos error) |
| NASA93 | 0.60 | 0.64 | 0.002 | 0.002 | sí |
| Kitchenham | 0.59 | 0.51 | &lt; 0.001 | 0.002 | no (el log-lineal tiene menos error) |
| China | 0.53 | 0.49 | &lt; 0.001 | 0.002 | no (el log-lineal tiene menos error) |

El bosque gana donde hay muchos factores de ajuste (COCOMO81 y NASA93). En los otros cinco, el log-lineal tiene menos error. Con la prueba conservadora la conclusión no cambia (COCOMO81 queda en p = 0.049, el límite). Aun donde el bosque supera al log-lineal, el lineal con transformaciones le gana a su vez en COCOMO81 (0.79 contra 0.64) y queda igual en NASA93 (0.65 contra 0.64): **cuando hay factores de ajuste, un modelo lineal sobre logaritmos los aprovecha al menos tan bien como un bosque**.

### 3.4 Curvas de aprendizaje

Mediana entre datasets de la SA (promedio de 100 sorteos por dataset). "Sorteo típico" es la mediana de los 100 sorteos, que no se deja arrastrar por unos pocos sorteos desastrosos.

| n de entrenamiento | Datasets | Mediana (piso) | Proporcional | Log-lineal | Bosque | Log-lineal, sorteo típico | Bosque, sorteo típico |
|---|---:|---:|---:|---:|---:|---:|---:|
| 4 | 7 | 0.20 | 0.45 | −0.51 | 0.26 | 0.31 | 0.20 |
| 8 | 7 | 0.26 | 0.49 | 0.42 | 0.35 | 0.43 | 0.32 |
| 16 | 6 | 0.30 | 0.53 | 0.49 | 0.42 | 0.49 | 0.42 |
| 32 | 4 | 0.35 | 0.55 | 0.50 | 0.45 | 0.51 | 0.45 |

Por dataset, en el orden **proporcional / log-lineal / bosque**:

| Dataset | N | n = 4 | n = 8 | n = 16 | n = 32 |
|---|---:|---:|---:|---:|---:|
| Albrecht | 24 | 0.52 / 0.29 / 0.31 | 0.61 / 0.66 / 0.49 |  |  |
| Maxwell | 62 | 0.45 / −0.51 / 0.23 | 0.52 / 0.46 / 0.35 | 0.54 / 0.53 / 0.42 |  |
| COCOMO81 | 63 | 0.47 / −2.67 / 0.29 | 0.49 / 0.30 / 0.33 | 0.56 / 0.50 / 0.46 |  |
| Desharnais | 81 | 0.45 / −0.34 / 0.27 | 0.49 / 0.40 / 0.38 | 0.51 / 0.49 / 0.42 | 0.52 / 0.51 / 0.45 |
| NASA93 | 93 | 0.45 / −0.10 / 0.25 | 0.49 / 0.43 / 0.38 | 0.53 / 0.50 / 0.46 | 0.57 / 0.56 / 0.56 |
| Kitchenham | 145 | 0.47 / −6.02 / 0.26 | 0.55 / 0.42 / 0.33 | 0.61 / 0.46 / 0.37 | 0.67 / 0.50 / 0.43 |
| China | 499 | 0.28 / −62.35 / 0.26 | 0.37 / 0.28 / 0.34 | 0.41 / 0.45 / 0.40 | 0.44 / 0.50 / 0.44 |

Cómo leerlo:

- **n = 4.** La recta de dos parámetros calibrada con cuatro puntos puede salir con una pendiente extrema (por ejemplo, cuatro proyectos de tamaños parecidos) y predecir esfuerzos absurdos. Esos pocos sorteos hunden el promedio (China llega a −62), aunque el sorteo típico sea bueno. El proporcional no tiene ese problema porque solo calibra un número.
- **n = 8 a 32.** El log-lineal iguala o supera al bosque en 5 de 7 datasets con 8 proyectos, en 6 de 6 con 16 y en 4 de 4 con 32. El proporcional lo hace en todos los casos desde 4 proyectos.
- La diferencia entre el log-lineal y el bosque (mediana entre datasets) es de 0.07 con 8 proyectos, 0.07 con 16 y 0.05 con 32: **no crece al bajar n**. La del proporcional contra el bosque sí: 0.19 con 4, 0.14 con 8, 0.11 con 16 y 0.10 con 32.

El modelo proporcional es el que mejor encaja con el motor: es la misma idea de horas por pieza y se puede calibrar con pocos proyectos propios.

### 3.5 Qué significa para la hipótesis H4 (honesto)

H4 dice: "con pocos proyectos, un modelo paramétrico simple calibrado con los datos disponibles iguala o supera al bosque aleatorio en exactitud estandarizada, y la ventaja del paramétrico es mayor cuanto menos proyectos hay."

- **"Iguala o supera": se sostiene.** El bosque no fue el mejor modelo en ningún dataset; con 8 proyectos o más el log-lineal iguala o supera al bosque en casi todos los casos; el proporcional lo hace desde 4.
- **"La ventaja es mayor cuanto menos proyectos hay": no se sostiene para el log-lineal de dos parámetros.** Su ventaja sobre el bosque es parecida con 8, 16 y 32 proyectos, y con 4 se pierde (promedio negativo). **Sí se sostiene para el modelo proporcional**, cuya ventaja crece conforme baja n.
- **Con datos mexicanos (42 proyectos, sección 5) el log-lineal y el bosque quedan parejos**, no mejor el paramétrico. El paramétrico gana en simplicidad y en que sus números se pueden explicar (a y b), no en exactitud.
- **El bosque no es inútil:** supera al log-lineal en los datasets con 15 factores de ajuste y de 63 a 93 proyectos, aunque ahí también hay modelos lineales que lo igualan o superan.

Sugerencia de redacción para el artículo: cambiar la segunda mitad de H4 a "la ventaja del paramétrico se mantiene con 8 a 32 proyectos y, si el modelo se limita a calibrar la productividad (un solo parámetro), también con 4".

### 3.6 Un contraste con el juicio experto (Kitchenham)

Kitchenham trae la **estimación inicial que hizo la empresa** (CSC) de cada proyecto. No entró como predictor porque es una opinión experta y no una característica del proyecto, pero sirve de comparación. Contra el esfuerzo real de los 145 proyectos: error relativo mediano (MdMRE) de 0.17, 62 % de los proyectos dentro de 25 %, 34 % subestimados y SA de 0.81. Es **mejor que cualquier modelo basado solo en tamaño** (el mejor, el proporcional, llega a 0.68), y su correlación con el esfuerzo real (0.93, en logaritmos) es mayor que la del tamaño (0.73).

Esto matiza H1: el juicio experto no es malo por naturaleza. En SEERA y JOSSE queda lejos de lo real; en una empresa con proceso de estimación y 145 proyectos de historia, como esta, no. Una explicación posible, que aquí no se probó, es el proceso de estimación y la historia disponibles, que es justo lo que el instrumento quiere dar a quien cotiza sin ellos. Cifras en `outputs/kitchenham_estimacion_inicial.csv`.

## 4. SEERA: qué dice la duración

SEERA (Sudán, 2019 a 2020; 120 proyectos) trae duración estimada y real en meses. Resultados:

| Indicador (duración) | Valor |
|---|---:|
| Proyectos con duración real mayor que la estimada | 80.8 % (97 de 120) |
| Proyectos que terminaron justo en lo estimado / antes | 17 / 6 |
| Desviación mediana (real − estimada) / estimada | +58.6 % |
| Duración mediana estimada y real | 5 y 8 meses |
| MdMRE | 0.38 |
| PRED(15) | 16.7 % |
| PRED(25) | 30.0 % |
| Spearman entre estimada y real | 0.80 |

- **Hallazgo importante:** según el documento oficial `SEERA dataset attribute formulas.pdf`, el esfuerzo de SEERA **se calcula** como duración × (miembros dedicados + 50 % × (tamaño del equipo − dedicados)) × (horas diarias × 22). Comprobado en los 120 proyectos: la diferencia es cero. Como el factor es el mismo para lo estimado y lo real, **el cociente real/estimado del esfuerzo es idéntico al de la duración, proyecto por proyecto**. Por eso las cifras de esfuerzo que ya estaban en `cifras.tex` (80.8 %, +58.6 %, MdMRE 38 %, PRED(15) 16.7 %) coinciden exactamente con las de duración: es **la misma evidencia contada dos veces**, no dos confirmaciones separadas. Se cruzaron con `cifras.tex` y coinciden.
- La correlación de Spearman sí difiere (0.90 en esfuerzo, 0.80 en duración) porque el factor de personal, común a lo estimado y a lo real, infla la correlación del esfuerzo. La de duración es la más limpia.
- **Efecto sobre el R² de 0.81 del bosque en SEERA (resultado H3 del artículo):** el factor de personal por horas explica por sí solo el 46 % de la variación del esfuerzo real (en logaritmos) y la duración estimada el 42 %. Una regresión de solo esas dos variables llega a R² de 0.83 sobre los 120 proyectos (sin separar prueba), del mismo orden que el 0.81 del bosque con 21 variables. Es decir, ese R² refleja en buena parte la aritmética de la fórmula y no tanto capacidad de estimar; conviene decirlo al citarlo.
- La figura `fig5_seera_duracion.png` repite el estilo de la figura 2 (el área del punto indica cuántos proyectos coinciden; solo hay 69 pares distintos entre 120 proyectos).

## 5. El punto mexicano

**Fuente:** Valdés-Souto, F. y Valeriano-Assem, J. (2024), *Merging Distinct Sources Databases to Improve Software Estimation Models*, Programming and Computer Software, 50(8), 786 a 795, DOI 10.1134/S0361768824700762. PDF: https://cosmic-sizing.org/wp-content/uploads/2025/01/Merging-Distinct-Sources-Databases-to-Improve-Software-Estimation-Models.pdf (bajado el 14 de octubre de 2026; hash en `data/raw/mexico_valdes_2024/PROCEDENCIA.md`).

**Qué trae.** Sí hay datos por proyecto: la Tabla 5 (Anexo 1) da, para 57 proyectos, el tamaño en puntos de función COSMIC (CFP) y el esfuerzo total en horas-hombre. Son 8 proyectos de una empresa internacional con oficina en México (datos de 2020, servicios para una institución financiera), 34 de la Asociación Mexicana de Métricas de Software (AMMS) y 15 de ISBSG (internacional). Los autores descartan los de ISBSG con la prueba de Kruskal-Wallis y trabajan con los **42 mexicanos** (8 + 34). Se transcribió la tabla del texto del PDF y se **verificó**: 57 filas, el PDR publicado (horas por CFP) coincide con esfuerzo/CFP en cada fila y las sumas de CFP por base coinciden con la Tabla 1b del artículo. Quedó en `data/processed/mexico_valdes_2024.csv`.

**Reproducción exacta.** Con los 42 proyectos, el ajuste log-lineal da exponente 0.9326, constante 2.8916 (a = 18.0) y R² de 0.8339: **idéntico** al modelo que publican los autores (0.9326; 2.8916; 0.8339). Eso confirma la transcripción.

| Grupo | Proyectos | a | b | R² (logaritmos) | Mediana de horas por CFP | Mitad central |
|---|---:|---:|---:|---:|---:|---:|
| mexicanos_42 | 42 | 18.02 | 0.93 | 0.83 | 12.6 | 8.5 a 20.3 |
| COMPANY_8 | 8 | 48.09 | 0.81 | 0.67 | 14.2 | 12.6 a 19.1 |
| AMMS_34 | 34 | 17.57 | 0.92 | 0.84 | 11.7 | 8.1 a 20.3 |
| ISBSG_15 | 15 | 0.02 | 2.03 | 0.80 | 3.9 | 2.6 a 4.6 |

**Horas por punto COSMIC.** Mediana de 12.6 para los 42 (mitad central entre 8.5 y 20.3); 14.2 horas por punto para los 8 de la empresa. El rango de 13.60 a 21.68 horas por punto de Valdés-Souto (2019) queda un poco arriba de la mediana de los 42, pero la mitad central de estos 42 lo cubre en buena parte, y la mediana de los 8 de la empresa (una empresa de servicios de software) cae dentro del rango.

**Comparación de modelos con los 42** (solo el tamaño como variable, misma validación cruzada que en la sección 2):

| Modelo | MdMRE | PRED(25) | MAE (horas) | SA |
|---|---:|---:|---:|---:|
| Mediana | 0.83 | 19 % | 4155 | 0.33 |
| Proporcional (a·tamaño) | 0.43 | 32 % | 2525 | 0.59 |
| Log-lineal | 0.43 | 33 % | 2484 | 0.60 |
| Bosque aleatorio | 0.46 | 37 % | 2312 | 0.63 |

El bosque tiene menos error absoluto (MAE) y más PRED(25), el log-lineal menos MdMRE; la diferencia por pliegue no es significativa (p = 0.30). Es decir, **parejos**. El proporcional queda a un paso del log-lineal (0.59 contra 0.60) con un solo parámetro.

**Una inconsistencia del artículo, para no caer en ella.** El texto da el modelo final tras quitar 4 valores atípicos (38 proyectos) como log(y) = 0.9377 log(x) + 2.8996, R² = 0.9023, pero la Tabla 4 lo escribe como y = x^0.9422 · e^3.0156. No se pudo identificar cuáles fueron los 4 atípicos, así que aquí se usa el modelo de los 42, que sí se reproduce exacto.

## 6. Cómo se adapta a lo nuestro

### 6.1 De las variables de los datasets a las entradas del motor

El motor (`lib/engine/`) calcula las horas base por **piezas** (módulos) y las multiplica por factores de **claridad** y **riesgo**; la **forma de hacerlo** reparte el esfuerzo por fase y cambia la velocidad; la **capacidad** del equipo (horas por semana) da el calendario.

| Entrada del motor | Equivalente en los datasets | Comentario |
|---|---|---|
| Horas base por piezas: complejidad (1 a 5), pantallas, reportes, catálogos, integraciones, datos sensibles, criticidad | **Tamaño**: puntos de función (Albrecht, Desharnais, China, Kitchenham, Maxwell), puntos COSMIC (México) o líneas de código (COCOMO81, NASA93). En China y Albrecht el tamaño viene desglosado en entradas, salidas, consultas, archivos e interfaces; en Desharnais en transacciones y entidades | Los datasets tienen **un número de tamaño por proyecto**; el motor lo arma sumando piezas. Para calibrar, hay que medir en puntos (idealmente COSMIC, como en México) un puñado de proyectos propios y comparar con las horas base del motor |
| Complejidad de la pieza | Factor de ajuste del conteo (`FPAdj` en Albrecht, `Adjustment` en Desharnais); `cplx` en COCOMO81 y NASA93 | |
| Claridad del requerimiento (1 a 5) | `T08`, volatilidad de requisitos, en Maxwell; exactitud de requisitos en SEERA | Claridad alta equivale a volatilidad baja |
| Riesgo: cambios, indisponibilidad del cliente, rotación | `T08` (cambios) en Maxwell; `sced` (presión de calendario) y `acap`, `pcap`, `aexp` (capacidad y experiencia) en COCOMO81 y NASA93; `TeamExp` y `ManagerExp` en Desharnais | El motor suma tres riesgos con tope de 2.0; en COCOMO81 el equivalente es un producto de multiplicadores |
| Criticidad | `rely` (confiabilidad requerida) en COCOMO81 y NASA93 | |
| Forma de hacerlo (tradicional, con IA, bytecoding, low-code, híbrido) | `modp` (prácticas modernas) y `tool` (herramientas) en COCOMO81 y NASA93; `Telonuse` (si usaron un generador de código) en Maxwell | **Ningún dataset tiene herramientas de IA**: son anteriores a 2022 |
| Capacidad del equipo (horas por semana) | Tamaño del equipo y horas diarias en SEERA; en los demás solo se puede deducir: esfuerzo ÷ duración da el personal promedio | La duración real de los datasets se excluyó como predictor, pero sirve para **validar el calendario** del motor |
| Esfuerzo total (horas) | La variable que se predice. Está en horas (Desharnais, China, Kitchenham, Maxwell, México), en miles de horas (Albrecht) o en personas-mes de 152 horas (COCOMO81, NASA93) | El esfuerzo de los datasets es de todo el proyecto, comparable con el total del motor y no solo con la codificación |

### 6.2 Lo que el motor tiene y los datasets no

- **Costo laboral mexicano:** salario diario, IMSS, INFONAVIT, impuesto sobre nómina y sobretasa de la UAZ, tipo de contratación (nómina, asimilados, honorarios, RESICO, propio).
- **Herramientas de IA** por persona y la **pericia** del equipo con ellas.
- **Flujo de dinero** mes a mes y capital de trabajo requerido.
- **Precio** con margen, IVA e ISR.
- **Cambios** como proceso, con precio y margen.
- **Datos sensibles** (LFPDPPP) como entrada de cada pieza.
- Parámetros con fecha y fuente, y explicación por concepto.

### 6.3 Lo que los datasets tienen y el motor no

- **Resultados reales** de cientos de proyectos terminados (esfuerzo y duración), que el motor no tendrá hasta el piloto.
- **Variación entre organizaciones** y entre épocas, que permite saber qué tan lejos puede quedar una calibración local.
- **Estimaciones hechas por personas contra lo real** (SEERA, JOSSE, y la estimación inicial de Kitchenham), que es el punto de comparación del piloto (H5).
- Un tamaño **medido con un estándar** (puntos de función, COSMIC), que permite comparar con otros.

### 6.4 Qué hacer con esto (recomendaciones)

1. **Calibrar primero un solo número:** las horas reales por unidad de tamaño propio (modelo proporcional). En los datos públicos, con solo 4 proyectos de entrenamiento ya superó al bosque aleatorio en los 7 datasets (mediana de la SA de 0.45 contra 0.26).
2. **Con 8 o más proyectos cerrados**, probar también el exponente (log-lineal). Con menos, no: la recta de dos parámetros se dispara.
3. **No hay razón, con estos datos, para usar bosque aleatorio con menos de unos 60 proyectos:** nunca fue el mejor y solo superó al log-lineal con 63 a 93 proyectos y 15 factores de ajuste capturados.
4. Si se capturan factores de ajuste (claridad, riesgo, criticidad), un modelo lineal sobre logaritmos los usa al menos tan bien como un bosque con 60 a 150 proyectos.
5. **Guardar en cada cierre del piloto:** tamaño en piezas (y, si se puede, en puntos COSMIC), horas reales, duración real y los factores que el motor usó. Sin eso no hay calibración.
6. Comparar las **horas base del motor por punto** con las de los datos públicos y con la mediana mexicana (12.6 horas por punto COSMIC; 13.60 a 21.68 en 2019) cuando haya proyectos medidos.

## 7. Límites y cuidados

- Los datasets son viejos y de otros países; el único mexicano tiene 42 proyectos, con tamaño en COSMIC (no es comparable punto a punto con puntos de función de IFPUG).
- El bosque se probó con parámetros por omisión, **sin afinar**. Un bosque afinado podría mejorar algo.
- Solo se usaron variables numéricas u ordinales; las categorías sin orden (lenguaje, tipo de proyecto, cliente) quedaron fuera para todos los modelos.
- La SA promedio es sensible a pliegues o sorteos desastrosos (log-lineal con 4 proyectos, lineal con transformaciones en Albrecht). Por eso el CSV guarda también la SA mediana.
- Los p de Wilcoxon sobre 50 pliegues son optimistas (los pliegues comparten proyectos) y no se corrigieron por comparaciones múltiples; se reporta la versión conservadora y la conclusión no cambia.
- La estimación inicial de la empresa en Kitchenham no entró como predictor (es una opinión experta) y resultó mejor que cualquier modelo de tamaño; ver la sección 3.6.
- En SEERA el esfuerzo se deriva de la duración (sección 4).

## 8. Cómo reproducirlo

Desde la raíz de `empsarticulodatos/proyecto_articulo_datos_emps_v1`, con el entorno `.venv`:

```powershell
.venv\Scripts\python scripts\07a_descargar_promise.py     # baja los 7 datasets y escribe PROCEDENCIA.md
.venv\Scripts\python scripts\07_modelos_simples_vs_ml.py  # validación cruzada repetida y figura 3 (unos 40 s)
.venv\Scripts\python scripts\08_curva_aprendizaje.py      # curvas de aprendizaje y figura 4 (unos 3 min)
.venv\Scripts\python scripts\09_seera_duracion.py         # duración en SEERA y figura 5
.venv\Scripts\python scripts\09b_punto_mexicano.py        # punto mexicano (baja el PDF si falta)
.venv\Scripts\python scripts\10_cifras_nuevas.py          # macros, tablas y figuras de LaTeX
.venv\Scripts\python scripts\05_verify_results.py         # 26 comprobaciones anteriores + 61 nuevas
```

`04b_generate_custom_assets.py` reescribe `cifras.tex` completo: si se vuelve a correr, hay que correr otra vez `10_cifras_nuevas.py`.

| Archivo | Contenido |
|---|---|
| `outputs/modelos_simples_vs_ml.csv` | Resumen por dataset y modelo: MdMRE, PRED(25), MAE, SA, p de Wilcoxon |
| `outputs/modelos_simples_vs_ml_pliegues.csv` | Una fila por pliegue (permite verificar todo) |
| `outputs/parametros_loglineal.csv` | a, b y R² con todos los proyectos, y horas por punto |
| `outputs/curva_aprendizaje.csv` | Curvas de aprendizaje por dataset, n y modelo |
| `outputs/seera_duracion.csv` | Cifras de duración y cruce con `cifras.tex` |
| `outputs/kitchenham_estimacion_inicial.csv` | La estimación inicial de la empresa en Kitchenham contra lo real |
| `outputs/mexico_valdes_2024_ajuste.csv`, `outputs/mexico_valdes_2024_modelos.csv` | Ajuste y comparación de modelos con los proyectos mexicanos |
| `outputs/figures/fig3_sa_modelos.png`, `fig4_curva_aprendizaje.png`, `fig5_seera_duracion.png` | Figuras nuevas |
| `article/generated/` | Macros `\nuevo...` en `cifras.tex`, `tabla_modelos_sa.tex`, `tabla_curva.tex`, `figuras_nuevas.tex` |
| `data/processed/mexico_valdes_2024.csv` | Tabla 5 del artículo mexicano, verificada |

### Referencias de este análisis

- Shepperd, M. y MacDonell, S. (2012). Evaluating prediction systems in software project estimation. *Information and Software Technology*, 54(8), 820 a 827. doi:10.1016/j.infsof.2011.12.008
- Bosu, M. F. y MacDonell, S. G. (2019). Experience: Quality benchmarking of datasets used in software effort estimation. *ACM Journal of Data and Information Quality*, 11(4), artículo 19. doi:10.1145/3328746
- Valdés-Souto, F. y Valeriano-Assem, J. (2024). Merging Distinct Sources Databases to Improve Software Estimation Models. *Programming and Computer Software*, 50(8), 786 a 795. doi:10.1134/S0361768824700762
- Boehm, B. W. (1981). *Software Engineering Economics*. Prentice-Hall. Albrecht, A. J. y Gaffney, J. E. (1983), IEEE Transactions on Software Engineering, 9(6), 639 a 648. Kitchenham, B. et al. (2002), Journal of Systems and Software. Maxwell, K. D. (2002), *Applied Statistics for Software Managers*. Desharnais, J.-M. (1988), tesis de maestría. Menzies, T. (2006), NASA93 en PROMISE.
