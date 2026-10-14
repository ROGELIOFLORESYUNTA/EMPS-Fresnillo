# Procedencia de los datasets públicos de esfuerzo (familia PROMISE)

Descargados el 14 de octubre de 2026 por `scripts/07a_descargar_promise.py`, que verifica cada archivo contra el hash registrado.
Sirven para el análisis de `scripts/07_modelos_simples_vs_ml.py` y `scripts/08_curva_aprendizaje.py` (ver `docs/07_resultados_datasets_publicos_2026-10.md`).

| Dataset | Proyectos | Columnas | Esfuerzo | Tamaño | País y periodo |
|---|---:|---:|---|---|---|
| Albrecht | 24 | 8 | `Effort` (miles de horas) | `AdjFP` (puntos de función ajustados) | EE. UU., décadas de 1970 |
| China | 499 | 19 | `Effort` (horas) | `AFP` (puntos de función ajustados) | China (por el nombre del dataset), no documentado (donado en 2010) |
| COCOMO81 | 63 | 19 | `actual` (personas-mes) | `loc` (miles de líneas de código (KDSI)) | EE. UU., publicado en 1981 |
| Desharnais | 81 | 13 | `Effort` (horas) | `PointsAjust` (puntos de función ajustados) | Canadá, 1983 a 1988 |
| Kitchenham | 145 | 10 | `Actual.effort` (horas) | `Adjusted.function.points` (puntos de función ajustados) | EE. UU. (empresa multinacional), 1994 a 1999 |
| Maxwell | 62 | 27 | `Effort` (horas) | `Size` (puntos de función) | Finlandia, 1985 a 1993 |
| NASA93 | 93 | 24 | `act_effort` (personas-mes) | `equivphyskloc` (miles de líneas de código físicas equivalentes (KLOC)) | EE. UU., 1971 a 1987 |

Total: 967 proyectos en 7 datasets. OpenML solo tiene Desharnais; el resto se bajó de Zenodo (registros de PROMISE) y COCOMO81 de un espejo en GitHub fijado a un commit.

Todos los archivos pesan menos de 40 KB, así que se guardan completos en el repositorio.

## Albrecht

- **Fuente:** Zenodo, registro 268467 "Effort Estimation: Albrecht" (repositorio PROMISE, comunidad SEACRAFT)
- **Página del registro:** https://zenodo.org/records/268467  (DOI 10.5281/zenodo.268467)
- **Archivo `albrecht.arff`:** https://zenodo.org/api/records/268467/files/albrecht.arff/content
  - sha256: `cfd9713c6a0a45e318fd5345d3f45ac1cfbbf59191d91a645eabd6541890fd18`
  - md5 publicado por la fuente: `22fd6b6d9e63c0454b2e710ba945067a` (coincide)
- **Descarga:** 14 de octubre de 2026
- **Filas y columnas:** 24 proyectos, 8 columnas
- **Esfuerzo (lo que se predice):** columna `Effort`, en miles de horas
- **Tamaño:** columna `AdjFP` (puntos de función ajustados)
- **Variables extra usadas (numéricas u ordinales, conocidas al arrancar):** `Input`, `Output`, `Inquiry`, `File`, `FPAdj`
- **Columnas que no se usan y por qué:** `RawFPcounts` (otra medida del mismo tamaño (puntos de función sin ajustar))
- **Origen:** IBM Data Processing Services; EE. UU.; décadas de 1970
- **Quién lo aporta:** Donantes: Yanfu Li y Jacky W. Keung (según el registro); datos originales de Albrecht y Gaffney
- **Licencia:** CC BY 4.0 (según el registro)
- **Cita que da la fuente:** Registro Zenodo: "Reference: Albrecht, A.J. and Gaffney, J.E., Jr. (1983) Software Function, Source Lines of Code, and Development Effort Prediction: A Software Engineering, IEEE Transactions on Software Engineering, 9(6):639-648". El encabezado del archivo agrega: donante Yanfu Li, fecha 14 de octubre de 2009, y cita a Shepperd y Schofield (1997) y a Li, Xie y Goh (2009) como usos previos.
- **Comprobaciones:** Esfuerzo mínimo, máximo, media y mediana (0.5, 105.2, 21.88, 11.45) coinciden con lo publicado por otros trabajos que usan el dataset (1 a 105, media 22, mediana 12).

## China

- **Fuente:** Zenodo, registro 268446 "China: Effort Estimation Dataset" (repositorio PROMISE, comunidad SEACRAFT)
- **Página del registro:** https://zenodo.org/records/268446  (DOI 10.5281/zenodo.268446)
- **Archivo `china.arff`:** https://zenodo.org/api/records/268446/files/china.arff/content
  - sha256: `ae9df9c52c5bc5ba03b9732ecc159093f0c500ffa0f3d8260ddd7350f0a22c58`
  - md5 publicado por la fuente: `e3782d76345c9fd863efa3eafedf7f3e` (coincide)
- **Descarga:** 14 de octubre de 2026
- **Filas y columnas:** 499 proyectos, 19 columnas
- **Esfuerzo (lo que se predice):** columna `Effort`, en horas
- **Tamaño:** columna `AFP` (puntos de función ajustados)
- **Variables extra usadas (numéricas u ordinales, conocidas al arrancar):** `Input`, `Output`, `Enquiry`, `File`, `Interface`, `Added`, `Changed`, `Deleted`, `Resource`
- **Columnas que no se usan y por qué:** `ID` (identificador); `Duration` (FUGA: duración real del proyecto (se conoce al terminar)); `N_effort` (FUGA: esfuerzo normalizado (derivado del esfuerzo real)); `PDR_AFP` (FUGA: horas por punto de función, calculado con el esfuerzo real); `PDR_UFP` (FUGA: horas por punto de función, calculado con el esfuerzo real); `NPDR_AFP` (FUGA: horas por punto de función normalizadas, calculado con el esfuerzo real); `NPDU_UFP` (FUGA: horas por punto de función normalizadas, calculado con el esfuerzo real); `Dev.Type` (constante (vale 0 en los 499 proyectos))
- **Origen:** empresas de software (procedencia no documentada por la fuente); China (por el nombre del dataset); no documentado (donado en 2010)
- **Quién lo aporta:** Donante: Fang Hon Yun (según el registro)
- **Licencia:** CC BY 4.0 (según el registro)
- **Cita que da la fuente:** Registro Zenodo: "The dataset contains the FunctionPoints metrics and is an effort estimation dataset." No trae referencia a un artículo. Bosu y MacDonell (2019) confirman que Tim Menzies recibió estos datos en abril de 2010 sin más información sobre su origen.
- **Comprobaciones:** Esfuerzo mínimo, máximo, media y mediana (26, 54,620, 3,921, 1,829) coinciden con lo publicado por otros trabajos.
  - Copia independiente de DASE (`verificacion_cruzada/chinaOriginal.arff`): idéntica byte a byte (mismo sha256).

## COCOMO81

- **Fuente:** GitHub, repositorio ESEUR-code-data de Derek M. Jones (copia del repositorio PROMISE), fijado al commit bc1d9e9
- **Página del registro:** https://github.com/Derek-Jones/ESEUR-code-data/blob/bc1d9e99da2a956cdecba9d9d7f6f9b61a371c5f/regression/cocomo81/coc81.arff
- **Archivo `coc81.arff`:** https://raw.githubusercontent.com/Derek-Jones/ESEUR-code-data/bc1d9e99da2a956cdecba9d9d7f6f9b61a371c5f/regression/cocomo81/coc81.arff
  - sha256: `571cf246824365de865a483a0af2e10e4aade8db33e2510cf55932c33a881091`
  - la fuente no publica un hash; el sha256 es el de la descarga del 14 de octubre de 2026
- **Descarga:** 14 de octubre de 2026
- **Filas y columnas:** 63 proyectos, 19 columnas
- **Esfuerzo (lo que se predice):** columna `actual`, en personas-mes
- **Tamaño:** columna `loc` (miles de líneas de código (KDSI))
- **Variables extra usadas (numéricas u ordinales, conocidas al arrancar):** `rely`, `data`, `cplx`, `time`, `stor`, `virt`, `turn`, `acap`, `aexp`, `pcap`, `vexp`, `lexp`, `modp`, `tool`, `sced`
- **Columnas que no se usan y por qué:** `project_id` (identificador); `dev_mode` (categoría sin orden (orgánico, semiacoplado, embebido))
- **Origen:** proyectos reunidos por Boehm para calibrar COCOMO; EE. UU.; publicado en 1981
- **Quién lo aporta:** Datos originales de Barry W. Boehm; copia vía PROMISE mantenida por Derek M. Jones
- **Licencia:** el repositorio no declara licencia; los datos son los de Boehm (1981) vía PROMISE
- **Cita que da la fuente:** El encabezado del archivo dice "From the Promise repo" y "The following data is transcribed from boehm81 p.496-497 Table 29-1". El script cocomo81.R del mismo repositorio dice: "Data from: Software Engineering Economics, Barry W. Boehm, by way of the PROMISE repository". Referencia: Boehm, B. W. (1981). Software Engineering Economics. Prentice-Hall.
- **Comprobaciones:** 63 proyectos; esfuerzo real mínimo 5.9, máximo 11,400, media 683.5 y mediana 98, que coinciden con lo publicado por otros trabajos (mínimo 6, máximo 11,400, media 683, mediana 98). OpenML y Zenodo no tienen una copia de 63 proyectos; la copia "cocomonasa_v1" de DASE tiene solo 60 y no se usó.

## Desharnais

- **Fuente:** OpenML, conjunto de datos 1117 "desharnais" versión 2 (archivo 54000)
- **Página del registro:** https://www.openml.org/d/1117
- **Archivo `desharnais.arff`:** https://openml.org/data/v1/download/54000/desharnais.arff
  - sha256: `82936d64a3333c58a060c6807228f7d11f24795f22448724ad17e78eb1050e5e`
  - md5 publicado por la fuente: `48bf1ba60fc36660b98a179924266b7f` (coincide)
- **Descarga:** 14 de octubre de 2026
- **Filas y columnas:** 81 proyectos, 13 columnas
- **Esfuerzo (lo que se predice):** columna `Effort`, en horas
- **Tamaño:** columna `PointsAjust` (puntos de función ajustados)
- **Variables extra usadas (numéricas u ordinales, conocidas al arrancar):** `TeamExp`, `ManagerExp`, `YearEnd`, `Transactions`, `Entities`, `Adjustment`
- **Columnas que no se usan y por qué:** `ID` (identificador); `Project` (identificador); `Length` (FUGA: duración real del proyecto (se conoce al terminar)); `PointsNonAdjust` (otra medida del mismo tamaño (puntos de función sin ajustar)); `Language` (categoría sin orden (lenguaje de programación))
- **Origen:** 10 organizaciones de software; Canadá; 1983 a 1988
- **Quién lo aporta:** Subido a OpenML el 7 de octubre de 2014; datos originales de Jean-Marc Desharnais
- **Licencia:** "Public" (según OpenML)
- **Cita que da la fuente:** OpenML solo dice: "Dataset from the MLRR repository: http://axon.cs.byu.edu:5000/" (sin autor ni cita). La referencia que usan los trabajos sobre este dataset es Desharnais, J.-M. (1988), Statistical Analysis on the Productivity of Data Processing with Development Projects Using the Function Point Technique, tesis de maestría (Universidad de Quebec en Montreal), citada por Bosu y MacDonell (2019). Esa referencia no la da la fuente.
- **Comprobaciones:** 81 proyectos, 4 de ellos con datos faltantes de experiencia (TeamExp o ManagerExp valen -1: filas 38, 44, 66 y 75). Esfuerzo mínimo 546, máximo 23,940, media 5,046 y mediana 3,647, que coinciden con lo publicado.
  - Copia independiente de DASE (`verificacion_cruzada/desharnais_1_1.arff`): idénticas las 11 columnas numéricas en común (81 filas): Project, TeamExp, ManagerExp, YearEnd, Length, Effort, Transactions, Entities, PointsNonAdjust, Adjustment, PointsAjust.

## Kitchenham

- **Fuente:** Zenodo, registro 268457 "kitchenham" (repositorio PROMISE, comunidad SEACRAFT)
- **Página del registro:** https://zenodo.org/records/268457  (DOI 10.5281/zenodo.268457)
- **Archivo `kitchenham.arff`:** https://zenodo.org/api/records/268457/files/kitchenham.arff/content
  - sha256: `0832342b248418cca324cebe77d86d2f90ae223c1119af9360783bdbad0b2ac0`
  - md5 publicado por la fuente: `8945f95d3bbfc40df4687089767aae16` (coincide)
- **Descarga:** 14 de octubre de 2026
- **Filas y columnas:** 145 proyectos, 10 columnas
- **Esfuerzo (lo que se predice):** columna `Actual.effort`, en horas
- **Tamaño:** columna `Adjusted.function.points` (puntos de función ajustados)
- **Variables extra usadas (numéricas u ordinales, conocidas al arrancar):** `duracion_planeada_dias`, `anio_inicio`
- **Columnas que no se usan y por qué:** `Project` (identificador); `Actual.duration` (FUGA: duración real del proyecto (se conoce al terminar)); `First.estimate` (es la estimación experta de la empresa, otro tipo de predictor (no una característica del proyecto)); `First.estimate.method` (método con que se hizo la estimación experta); `Client.code` (categoría sin orden (cliente)); `Project.type` (categoría sin orden (tipo de proyecto)); `Actual.start.date` (se usa solo para derivar el año de inicio y la duración planeada); `Estimated.completion.date` (se usa solo para derivar la duración planeada)
- **Origen:** Computer Sciences Corporation (CSC), desarrollo y mantenimiento; EE. UU. (empresa multinacional); 1994 a 1999
- **Quién lo aporta:** Donante: Masateru Tsunoda (según el registro); datos de Computer Sciences Corporation
- **Licencia:** CC BY 4.0 (según el registro)
- **Cita que da la fuente:** Registro Zenodo: "1 Barbara Kitchenham, Shari Lawrence Pfleeger, Beth McColl and Suzanne Eagan, An empirical study of maintenance and development estimation accuracy, Journal of Systems and Software, Volume 74, pp.57-77, 2005. 2 Masateru Tsunoda, Takeshi Kakimoto, Akito Monden and Ken-ichi Matsumoto, An empirical evaluation of outlier deletion methods for analogy-based cost estimation, Proceedings of PROMISE 2011, ACM, Article 17." (Bosu y MacDonell, 2019, citan el primer trabajo como Kitchenham et al., 2002.)
- **Comprobaciones:** 145 proyectos, como en la literatura. Las columnas de duración, puntos de función, estimación inicial y esfuerzo son idénticas en la copia de DASE.
  - Copia independiente de DASE (`verificacion_cruzada/kitchenham_dase.arff`): idénticas las 4 columnas numéricas en común (145 filas): Actual.duration, Adjusted.function.points, First.estimate, Actual.effort.

## Maxwell

- **Fuente:** Zenodo, registro 268461 "Effort Estimation: Maxwell" (repositorio PROMISE, comunidad SEACRAFT)
- **Página del registro:** https://zenodo.org/records/268461  (DOI 10.5281/zenodo.268461)
- **Archivo `maxwell.arff`:** https://zenodo.org/api/records/268461/files/maxwell.arff/content
  - sha256: `13ea83d5cded12ec694f3e1a72e24c55708bf6e28ea810ee88f1d7c8da910fde`
  - md5 publicado por la fuente: `dcaffa9917b6eb7ac180e252c53f0a87` (coincide)
- **Archivo `README.txt`:** https://zenodo.org/api/records/268461/files/README.txt/content
  - sha256: `fc325b1fcbb1573ead66b6bb1c72166ae4bd67f4502c823091dcffd26464b9fd`
  - md5 publicado por la fuente: `14f00b64cd746d7a6e1d6ad304cb975a` (coincide)
- **Descarga:** 14 de octubre de 2026
- **Filas y columnas:** 62 proyectos, 27 columnas
- **Esfuerzo (lo que se predice):** columna `Effort`, en horas
- **Tamaño:** columna `Size` (puntos de función)
- **Variables extra usadas (numéricas u ordinales, conocidas al arrancar):** `Syear`, `App`, `Har`, `Dba`, `Ifc`, `Source`, `Telonuse`, `Nlan`, `T01`, `T02`, `T03`, `T04`, `T05`, `T06`, `T07`, `T08`, `T09`, `T10`, `T11`, `T12`, `T13`, `T14`, `T15`
- **Columnas que no se usan y por qué:** `Duration` (FUGA: duración real del proyecto (se conoce al terminar)); `Time` (la fuente no documenta qué mide; por prudencia no se usa)
- **Origen:** uno de los mayores bancos comerciales de Finlandia; Finlandia; 1985 a 1993
- **Quién lo aporta:** Donante: Yanfu Li (según el registro); datos originales de K. D. Maxwell
- **Licencia:** CC BY 4.0 (según el registro)
- **Cita que da la fuente:** Registro Zenodo: "1 K. D. Maxwell. 2002. Applied Statistics for Software Managers. Englewood Cliffs, NJ. Prentice-Hall. 2 P. Sentas, L. Angelis, I. Stamelos, G. Bleris. 2005. Software productivity and effort prediction with ordinal regression. Information and Software Technology, 47, 17-29. 3 Y.F. Li, M. Xie, T.N. Goh. 2009. A Study of Mutual Information Based Feature Selection for Case Based Reasoning in Software Cost Estimation. Expert Systems with Applications. 36(3), 5921-5931. 4 Y.F. Li, M. Xie, T.N. Goh. 2009. A Study on the Non-linear Adjustment for Analogy Based Software Cost Estimation. Empirical Software Engineering."
- **Comprobaciones:** 62 proyectos. Esfuerzo mínimo 583, máximo 63,694, media 8,223.2 y mediana 5,189.5, idénticos a lo publicado. La fuente no explica la variable Time; por eso no se usa como predictor.

## NASA93

- **Fuente:** Zenodo, registro 268419 "nasa93" (repositorio PROMISE, comunidad SEACRAFT)
- **Página del registro:** https://zenodo.org/records/268419  (DOI 10.5281/zenodo.268419)
- **Archivo `nasa93.arff`:** https://zenodo.org/api/records/268419/files/nasa93.arff/content
  - sha256: `bcc97ecc9ab3f0f05da692075288d682478866bf8a7bb2b779b6b8de617d41d5`
  - md5 publicado por la fuente: `6bfcb7491cb8c592a7e719a50e086167` (coincide)
- **Descarga:** 14 de octubre de 2026
- **Filas y columnas:** 93 proyectos, 24 columnas
- **Esfuerzo (lo que se predice):** columna `act_effort`, en personas-mes
- **Tamaño:** columna `equivphyskloc` (miles de líneas de código físicas equivalentes (KLOC))
- **Variables extra usadas (numéricas u ordinales, conocidas al arrancar):** `rely`, `data`, `cplx`, `time`, `stor`, `virt`, `turn`, `acap`, `aexp`, `pcap`, `vexp`, `lexp`, `modp`, `tool`, `sced`, `year`
- **Columnas que no se usan y por qué:** `recordnumber` (identificador); `projectname` (identificador del sistema); `cat2` (categoría sin orden (categoría de aplicación)); `forg` (categoría sin orden (vuelo o tierra)); `center` (categoría sin orden (centro de la NASA)); `mode` (categoría sin orden (modo COCOMO))
- **Origen:** cinco centros de desarrollo de la NASA; EE. UU.; 1971 a 1987
- **Quién lo aporta:** Donante: Tim Menzies; datos recopilados por Jairus Hihn (JPL, NASA)
- **Licencia:** CC BY 4.0 (según el registro)
- **Cita que da la fuente:** Encabezado del archivo: "93 NASA projects from different centers ... Collected by Jairus Hihn, JPL, NASA, Manager SQIP Measurement & Benchmarking Element. Donor: Tim Menzies. Date: Feb 8 2006". Uso previo citado: Menzies, Port, Chen, Hihn y Stukes, "Validation Methods for Calibrating Software Effort Models", ICSE 2005; y Chen, Menzies, Port y Boehm, "Feature Subset Selection Can Improve Software Cost Estimation Accuracy", PROMISE 2005.
- **Comprobaciones:** 93 proyectos de 1971 a 1987, como dice el encabezado. El archivo es idéntico byte a byte al de la copia de DASE.
  - Copia independiente de DASE (`verificacion_cruzada/nasa93_dase.arff`): idéntica byte a byte (mismo sha256).

## Notas generales

- Ningún dato se modificó: los archivos son los originales. Las decisiones de limpieza (por ejemplo, tratar el -1 de Desharnais como dato faltante) se aplican al leerlos, en `scripts/common_promise.py`.
- Los datasets tienen historia y límites propios: el de China no documenta su origen; los de Albrecht y COCOMO81 son de los años setenta; ninguno es mexicano. Por eso se usan para comparar tipos de modelo, no para fijar horas de Fresnillo.
- No se saltó ninguna fuente: los siete datasets pedidos tienen una copia confiable.
