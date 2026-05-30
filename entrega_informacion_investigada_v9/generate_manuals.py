import json, os
DATE='2026-05-30'

URLS={
 'LIVA':'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf',
 'LISR':'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
 'LSS':'https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf',
 'LFT':'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf',
 'INEGI_UMA':'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf',
 'SEFIN_ISN':'https://sefin.zacatecas.gob.mx/wp-content/uploads/2025/01/IMPUESTO-SOBRE-NOMINAS.pdf',
 'DOF_SALARIO':'https://www.dof.gob.mx/nota_detalle.php?codigo=5775534&fecha=09/12/2025',
 'DOF_UMA':'https://www.dof.gob.mx/nota_detalle.php?codigo=5778072&fecha=09/01/2026',
 'INFONAVIT':'VERIFICAR'
}

manuals={}

def add(key,title,originSource,originUrl,originDocument,what,how,refs='',trust='oficial'):
    manuals[key]={
        'title':title[:60],
        'originSource':originSource,
        'originUrl':originUrl,
        'originDocument':originDocument,
        'whatItAffects':what,
        'howToModify':how,
        'referencesMarkdown':refs,
        'sourceTrustLevel':trust,
        'lastReviewedAt':DATE
    }

def checklist(src='fuente oficial'):
    return f'- Verificar el valor en la {src}.\n- Guardar evidencia del valor anterior antes de editar.\n- Confirmar desde qué fecha aplica.\n- Recalcular estimaciones afectadas.\n- Registrar el motivo del cambio en bitácora.'

def what_generic(name):
    return f'Afecta el cálculo de {name}. Si se cambia sin sustento, las cotizaciones, reportes y comparaciones históricas pueden quedar inconsistentes. Debe modificarse solo cuando cambie la fuente oficial o la calibración aprobada.'

# fiscales
add('IVA_GENERAL','IVA general 2026','LIVA Art. 1',URLS['LIVA'],'LIVA, última reforma DOF 12-11-2021','Cambia el IVA trasladado en facturas de proyectos, cambios y recursos. Si se modifica, cambia el total que paga el cliente y el flujo de IVA por enterar. No debe usarse una tasa distinta sin régimen aplicable.','- Revisar LIVA Art. 1.\n- Confirmar si el cliente/operación tiene tasa especial.\n- Verificar que los CFDI se emitan con la misma tasa.\n- Recalcular facturas y cambios abiertos.\n- Guardar soporte fiscal.', '', 'oficial')
add('ISR_PERSONA_MORAL','ISR persona moral','LISR Art. 9',URLS['LISR'],'LISR, última reforma DOF 01-04-2024','Afecta la utilidad neta estimada del proveedor después de impuestos. No cambia la factura al Ayuntamiento, pero sí la viabilidad real del proveedor.','- Revisar LISR Art. 9.\n- Confirmar régimen fiscal del proveedor.\n- No usarlo como impuesto directo al cliente.\n- Recalcular margen y utilidad neta.\n- Guardar evidencia del cambio.', '', 'oficial')

# UMA
for key,title,val in [('UMA_DIARIA','UMA diaria 2026','diaria'),('UMA_MENSUAL','UMA mensual 2026','mensual'),('UMA_ANUAL','UMA anual 2026','anual')]:
    add(key,title,'INEGI UMA 2026',URLS['INEGI_UMA'],'INEGI Comunicado de Prensa 1/26, 08-ene-2026; vigente desde 01-feb-2026',f'Afecta límites, cuotas y cálculos referenciados a UMA en seguridad social y obligaciones. La UMA {val} no debe confundirse con salario mínimo. Si cambia, puede alterar IMSS y límites legales.','- Verificar comunicado anual de INEGI.\n- Confirmar vigencia desde 1 de febrero.\n- No sustituir por salario mínimo.\n- Recalcular cuotas y límites dependientes.\n- Registrar fecha de aplicación.', '', 'oficial')

# Salario minimo
for key,title,zona in [
    ('SALARIO_MINIMO_GENERAL_DIARIO','Salario mínimo general diario','resto del país'),
    ('SALARIO_MINIMO_GENERAL_MENSUAL','Salario mínimo general mensual','resto del país'),
    ('SALARIO_MINIMO_FRONTERA_DIARIO','Salario mínimo frontera diario','ZLFN'),
    ('SALARIO_MINIMO_FRONTERA_MENSUAL','Salario mínimo frontera mensual','ZLFN')]:
    add(key,title,'CONASAMI resolución anual de salarios mínimos',URLS['DOF_SALARIO'],'DOF 09-dic-2025; vigente desde 01-ene-2026',f'Afecta pisos laborales y validaciones de sueldos. Fresnillo usa el salario de {zona if zona=="resto del país" else "referencia frontera solo si aplica"}. Cambiarlo altera costos mínimos de nómina y cumplimiento laboral.','- Verificar resolución anual CONASAMI/DOF.\n- Confirmar si el proyecto opera en ZLFN o resto del país.\n- Actualizar diario y mensual juntos.\n- Recalcular perfiles de equipo.\n- Conservar evidencia del DOF.', '', 'oficial')

# IMSS
imss_data=[
('IMSS_EYM_ESPECIE_CUOTA_FIJA_PATRON','EyM especie cuota fija patrón','LSS Art. 106 fr. I','Afecta la cuota patronal fija de enfermedades y maternidad sobre UMA. Si cambia, sube o baja el costo real de nómina del proveedor.'),
('IMSS_EYM_ESPECIE_EXCEDENTE_PATRON','EyM excedente patrón','LSS Art. 106 fr. II','Afecta la cuota patronal sobre excedente de tres UMA. Importa más en sueldos de perfiles técnicos medios y altos.'),
('IMSS_EYM_ESPECIE_EXCEDENTE_OBRERO','EyM excedente obrero','LSS Art. 106 fr. II','Afecta la parte obrera del excedente de enfermedades y maternidad. Debe separarse de la carga patronal para no duplicar costo.'),
('IMSS_EYM_DINERO_PATRON','EyM dinero patrón','LSS Art. 107','Afecta la cuota patronal de prestaciones en dinero. Se suma al costo de contratar personal formal.'),
('IMSS_EYM_DINERO_OBRERO','EyM dinero obrero','LSS Art. 107','Afecta la cuota obrera de prestaciones en dinero. Sirve para desglose, no debe confundirse con costo patronal directo.'),
('IMSS_EYM_PENSIONADOS_PATRON','EyM pensionados patrón','LSS Art. 25','Afecta la cuota patronal para pensionados y beneficiarios. Se integra al costo real de nómina.'),
('IMSS_EYM_PENSIONADOS_OBRERO','EyM pensionados obrero','LSS Art. 25','Afecta la cuota obrera para pensionados y beneficiarios. Se usa para desglose laboral.'),
('IMSS_INVALIDEZ_VIDA_PATRON','Invalidez y vida patrón','LSS Art. 147','Afecta la cuota patronal de invalidez y vida. Incrementa el costo real de personal formal.'),
('IMSS_INVALIDEZ_VIDA_OBRERO','Invalidez y vida obrero','LSS Art. 147','Afecta la cuota obrera de invalidez y vida. Debe aparecer separada para explicar el costo completo.'),
('IMSS_GUARDERIAS_PATRON','Guarderías patrón','LSS Art. 211','Afecta la cuota patronal de guarderías y prestaciones sociales. Es costo del patrón.'),
('IMSS_RETIRO_PATRON','Retiro patrón','LSS Art. 168 fr. I','Afecta la aportación patronal de retiro. Forma parte del costo de nómina formal.'),
('IMSS_CV_OBRERO','Cesantía y vejez obrero','LSS Art. 168 fr. II','Afecta la cuota obrera de cesantía y vejez. Debe separarse del costo patronal.'),
('IMSS_CEAV_PATRON_2026','CEAV patrón 2026','LSS Art. 168 fr. II','Afecta la cuota patronal escalonada de cesantía en edad avanzada y vejez. Depende del salario base en UMA.'),
('IMSS_RIESGO_TRABAJO_CLASE_I','Riesgo trabajo clase I','LSS Art. 73','Afecta la prima media de riesgo de trabajo para actividades de menor riesgo. Software suele aproximarse a clase I si corresponde.'),
('IMSS_RIESGO_TRABAJO_CLASE_II','Riesgo trabajo clase II','LSS Art. 73','Afecta la prima media de riesgo clase II. Usarla sin corresponder cambia artificialmente el costo laboral.'),
('IMSS_RIESGO_TRABAJO_CLASE_III','Riesgo trabajo clase III','LSS Art. 73','Afecta la prima media de riesgo clase III. Se usa si la actividad registrada corresponde a esa clase.'),
('IMSS_RIESGO_TRABAJO_CLASE_IV','Riesgo trabajo clase IV','LSS Art. 73','Afecta la prima media de riesgo clase IV. Puede elevar mucho el costo laboral.'),
('IMSS_RIESGO_TRABAJO_CLASE_V','Riesgo trabajo clase V','LSS Art. 73','Afecta la prima media de riesgo clase V. No debe usarse en software salvo clasificación real del patrón.')]
for key,title,source,what in imss_data:
    add(key,title,source,URLS['LSS'],'LSS, última reforma DOF 15-01-2026',what,'- Revisar artículo correspondiente en LSS.\n- Confirmar salario base de cotización.\n- Confirmar clase de riesgo registrada.\n- Recalcular costo por perfil de equipo.\n- Documentar si se usó valor estimado.', '', 'oficial')

# INFONAVIT, estatal, LFT, depreciacion
add('INFONAVIT_PATRON','INFONAVIT patrón','Ley INFONAVIT Art. 29 fr. II',URLS['INFONAVIT'],'Ley del INFONAVIT; verificar texto vigente','Afecta la aportación patronal de vivienda. Es parte del costo real de tener personal formal y puede hacer inviable una cotización barata si no se considera.',checklist('Ley INFONAVIT vigente'),'', 'oficial')
add('ISN_ZACATECAS','ISN Zacatecas','Ley de Hacienda del Estado de Zacatecas, Cap. VI Arts. 37-44',URLS['SEFIN_ISN'],'SEFIN Zacatecas, ficha ISN; tasa desde 2025','Afecta el impuesto estatal sobre remuneraciones. En proyectos con personal en nómina aumenta el costo mensual del proveedor.',checklist('SEFIN Zacatecas'),'', 'oficial')
add('IMPUESTO_UAZ','Adicional UAZ','Ley de Ingresos del Estado de Zacatecas, rubro adicional UAZ',URLS['SEFIN_ISN'],'SEFIN Zacatecas, ficha ISN; adicional UAZ','Afecta el adicional estatal sobre impuestos/derechos. En el sistema se aplica sobre el ISN para estimar costo laboral efectivo en Zacatecas.',checklist('SEFIN Zacatecas'),'', 'oficial')
add('LFT_AGUINALDO_DIAS_MIN','Aguinaldo mínimo','LFT Art. 87',URLS['LFT'],'LFT, última reforma DOF 14-05-2026','Afecta la provisión mensual de aguinaldo. Si el proveedor no lo considera, el costo de nómina queda subestimado.',checklist('LFT vigente'),'', 'oficial')
add('LFT_VACACIONES_DIAS_2026','Vacaciones 2026','LFT Arts. 76 y 78',URLS['LFT'],'Reforma vacaciones dignas DOF 27-12-2022; LFT vigente 14-05-2026','Afecta la provisión de vacaciones. No es pago opcional: debe considerarse cuando se calcula costo real de personal formal.',checklist('LFT vigente'),'', 'oficial')
add('LFT_PRIMA_VACACIONAL_MIN','Prima vacacional mínima','LFT Art. 80',URLS['LFT'],'LFT, última reforma DOF 14-05-2026','Afecta el costo anual de vacaciones. Si se omite, la nómina se ve más barata de lo real.',checklist('LFT vigente'),'', 'oficial')
add('LFT_PTU_PORCENTAJE','PTU porcentaje','LFT Art. 117',URLS['LFT'],'LFT, última reforma DOF 14-05-2026','Afecta el análisis de utilidad del proveedor cuando aplica reparto de utilidades. No se suma como costo directo de cada factura, pero sí influye en rentabilidad.',checklist('LFT vigente'),'', 'oficial')
add('DEPRECIACION_COMPUTO_ANUAL','Depreciación cómputo','LISR Art. 34 fr. VII',URLS['LISR'],'LISR, última reforma DOF 01-04-2024','Afecta equipo de cómputo nuevo usado para el proyecto. Permite distribuir fiscalmente el costo en el tiempo en lugar de cargarlo todo a un solo proyecto.',checklist('LISR vigente'),'', 'oficial')
add('DEPRECIACION_MOBILIARIO_OFICINA_ANUAL','Depreciación mobiliario','LISR Art. 34 fr. III',URLS['LISR'],'LISR, última reforma DOF 01-04-2024','Afecta escritorios, sillas y equipo de oficina. Ayuda a separar compra real, deducción fiscal y asignación del recurso al proyecto.',checklist('LISR vigente'),'', 'oficial')

# Secondary methodology
sec_url='VERIFICAR'
def add_sec(key,title,source,doc,what,how_extra=''):
    add(key,title,source,sec_url,doc,what,('- Revisar evidencia metodológica usada para calibrar.\n- No tratarlo como valor legal.\n- Comparar contra casos reales capturados.\n- Cambiar solo con justificación técnica.\n- Registrar versión de calibración.' + (('\n'+how_extra) if how_extra else '')),'', 'secundaria')

add_sec('DEV_MODE_FACTORS','Factores por modo','PMBOK 7 + literatura productividad IA + calibración EMPS','Calibración empírica EMPS-Fresnillo 2026','Distribuye esfuerzo por codificación, revisión, pruebas, documentación y despliegue según modo de desarrollo. Cambia el peso de cada fase del proyecto.')
add_sec('DEV_MODE_VELOCITY','Velocidad por modo','Meta-análisis GenAI 2026 + estudios 2025 + calibración EMPS','Maier et al. 2026 + Becker et al. 2025 + calibración EMPS','Afecta semanas calendario y velocidad de prototipo. No significa que la calidad aumente; solo modifica la capacidad efectiva por modo.')
add_sec('SCENARIO_FACTORS','Escenarios estimación','Gestión de riesgos PMBOK + calibración EMPS','PMBOK 7 + datos locales futuros','Genera escenarios optimista, probable y conservador. Permite no vender un solo número cuando hay incertidumbre.')
add_sec('DEFAULT_CARGA_PATRONAL_ESTIMADA','Carga patronal estimada','LSS/LFT/INFONAVIT/ISN agregados + calibración EMPS','Parámetro agregado EMPS 2026','Afecta el costo laboral cuando no se desglosan IMSS, INFONAVIT, ISN y prestaciones. Es aproximación, no sustituto de cálculo completo.')

# Change keys
change_doc='PMBOK 7 + ITIL 4 + análisis de impacto de cambios + calibración EMPS 2026'
add_sec('CHANGE_ARTIFACT_WEIGHTS','Pesos artefactos cambio','IFPUG/COSMIC + análisis de impacto + calibración EMPS',change_doc,'Asigna peso a pantallas, APIs, reglas, tablas, reportes, permisos, integraciones, migración, pruebas y documentación. Es la base para convertir una solicitud vaga en puntos de impacto.')
add_sec('CHANGE_CLARITY_FACTOR','Factor claridad cambio','Requirements Engineering + calibración EMPS',change_doc,'Aumenta el costo cuando el cambio está mal explicado. Obliga a pedir aclaraciones antes de cotizar o ejecutar.')
add_sec('CHANGE_PHASE_FACTOR','Factor fase cambio','Boehm/McConnell + PMBOK + evidencia empírica moderna',change_doc,'Aumenta el costo si el cambio llega tarde: después de pruebas, aceptación o producción requiere más retrabajo y validación.')
add_sec('CHANGE_MODE_FACTOR','Factor modo cambio','Productividad IA/low-code + calibración EMPS',change_doc,'Ajusta horas según desarrollo tradicional, asistido, híbrido, bytecoding o low-code. No elimina pruebas ni aprobación.')
add_sec('CHANGE_CONTINGENCY_BY_TYPE','Contingencia por tipo','PMBOK reservas de contingencia + calibración EMPS',change_doc,'Agrega reserva según corrección, garantía, ajuste, mejora, nuevo alcance o cambio estructural. Evita cotizar cambios sin colchón de riesgo.')
add_sec('CHANGE_HIGH_RISK_MODE_FLOOR','Piso modo alto riesgo','Seguridad/datos/integración + calibración EMPS',change_doc,'Evita que bytecoding o low-code descuenten demasiado cuando el cambio toca datos, seguridad o integraciones críticas.')
add_sec('CHANGE_MINIMUM_CHARGE_MXN','Cobro mínimo cambio','Política interna de cotización + calibración EMPS',change_doc,'Evita regalar cambios pequeños que consumen análisis, comunicación, pruebas y documentación aunque parezcan simples.')
add_sec('CHANGE_HOURLY_RATE_DEFAULT_MXN','Tarifa hora default','Mercado local + calibración EMPS',change_doc,'Sirve cuando el proveedor no captura tarifa por perfil. Debe actualizarse con sueldos reales, margen y mercado local.')
add_sec('CHANGE_FREE_CHANGE_LIMIT_MXN','Tope cambio sin costo','Control de cambios + política EMPS',change_doc,'Define cuándo un cambio podría absorberse sin cobro. Si excede el tope, debe justificarse y aprobarse formalmente.')
add_sec('CHANGE_MAINTENANCE_RATE_BY_RISK','Mantenimiento por riesgo','ITIL 4 + soporte postproducción + calibración EMPS',change_doc,'Calcula impacto mensual de mantenimiento cuando el cambio aumenta monitoreo, soporte o riesgo operativo.')

# Resource keys
resource_doc='LIVA Art. 5 + LISR Art. 34 + calibración EMPS 2026'
add_sec('RESOURCE_ADMIN_OVERHEAD_DEFAULT','Overhead recursos','Contabilidad administrativa + calibración EMPS',resource_doc,'Afecta renta, administración, internet, servicios, contabilidad y gestión. Ayuda a no cotizar solo horas de programador.')
add_sec('RESOURCE_DEFAULT_ALLOCATION_PERCENT','Asignación recurso','Costeo por proyecto + calibración EMPS',resource_doc,'Define qué porcentaje de un recurso se carga al proyecto. Evita meter todo el costo de una computadora si se usará en varios proyectos.')
add('RESOURCE_VAT_CREDITABLE_WITH_CFDI_DEFAULT','IVA acreditable con CFDI','LIVA Art. 5',URLS['LIVA'],'LIVA, última reforma DOF 12-11-2021','Afecta compras con factura válida relacionadas con el proyecto. Permite estimar IVA acreditable y costo neto real del proveedor.','- Verificar CFDI válido.\n- Confirmar que la compra sea indispensable para el proyecto.\n- Confirmar que el IVA esté efectivamente pagado.\n- Registrar factura y monto.\n- Recalcular IVA neto.', '', 'oficial')
add('RESOURCE_VAT_CREDITABLE_WITHOUT_CFDI_DEFAULT','IVA sin CFDI','LIVA Art. 5',URLS['LIVA'],'LIVA, última reforma DOF 12-11-2021','Afecta compras sin factura o sin requisitos fiscales. Normalmente no generan IVA acreditable, por lo que encarecen el proyecto para el proveedor.','- Solicitar CFDI cuando proceda.\n- Si no hay CFDI, marcar como no acreditable.\n- No restar ese IVA del impuesto a pagar.\n- Guardar evidencia de compra.\n- Recalcular costo neto.', '', 'oficial')

expected = [
'IVA_GENERAL','ISR_PERSONA_MORAL','UMA_DIARIA','UMA_MENSUAL','UMA_ANUAL','SALARIO_MINIMO_GENERAL_DIARIO','SALARIO_MINIMO_GENERAL_MENSUAL','SALARIO_MINIMO_FRONTERA_DIARIO','SALARIO_MINIMO_FRONTERA_MENSUAL','IMSS_EYM_ESPECIE_CUOTA_FIJA_PATRON','IMSS_EYM_ESPECIE_EXCEDENTE_PATRON','IMSS_EYM_ESPECIE_EXCEDENTE_OBRERO','IMSS_EYM_DINERO_PATRON','IMSS_EYM_DINERO_OBRERO','IMSS_EYM_PENSIONADOS_PATRON','IMSS_EYM_PENSIONADOS_OBRERO','IMSS_INVALIDEZ_VIDA_PATRON','IMSS_INVALIDEZ_VIDA_OBRERO','IMSS_GUARDERIAS_PATRON','IMSS_RETIRO_PATRON','IMSS_CV_OBRERO','IMSS_CEAV_PATRON_2026','IMSS_RIESGO_TRABAJO_CLASE_I','IMSS_RIESGO_TRABAJO_CLASE_II','IMSS_RIESGO_TRABAJO_CLASE_III','IMSS_RIESGO_TRABAJO_CLASE_IV','IMSS_RIESGO_TRABAJO_CLASE_V','INFONAVIT_PATRON','ISN_ZACATECAS','IMPUESTO_UAZ','LFT_AGUINALDO_DIAS_MIN','LFT_VACACIONES_DIAS_2026','LFT_PRIMA_VACACIONAL_MIN','LFT_PTU_PORCENTAJE','DEPRECIACION_COMPUTO_ANUAL','DEPRECIACION_MOBILIARIO_OFICINA_ANUAL','DEV_MODE_FACTORS','DEV_MODE_VELOCITY','SCENARIO_FACTORS','DEFAULT_CARGA_PATRONAL_ESTIMADA','CHANGE_ARTIFACT_WEIGHTS','CHANGE_CLARITY_FACTOR','CHANGE_PHASE_FACTOR','CHANGE_MODE_FACTOR','CHANGE_CONTINGENCY_BY_TYPE','CHANGE_HIGH_RISK_MODE_FLOOR','CHANGE_MINIMUM_CHARGE_MXN','CHANGE_HOURLY_RATE_DEFAULT_MXN','CHANGE_FREE_CHANGE_LIMIT_MXN','CHANGE_MAINTENANCE_RATE_BY_RISK','RESOURCE_ADMIN_OVERHEAD_DEFAULT','RESOURCE_DEFAULT_ALLOCATION_PERCENT','RESOURCE_VAT_CREDITABLE_WITH_CFDI_DEFAULT','RESOURCE_VAT_CREDITABLE_WITHOUT_CFDI_DEFAULT']
missing=[k for k in expected if k not in manuals]
extra=[k for k in manuals if k not in expected]
assert not missing, missing
assert not extra, extra
obj={'schemaVersion':'1.0','generatedAt':DATE,'manuals':{k:manuals[k] for k in expected}}
base='/mnt/data/entrega_informacion_investigada_v9/manuals'
os.makedirs(base,exist_ok=True)
with open(os.path.join(base,'46_parameter_manuals_2026.json'),'w',encoding='utf-8') as f:
    json.dump(obj,f,ensure_ascii=False,indent=2)
# parts
parts=[expected[:27],expected[27:36],expected[36:40],expected[40:]]
for i,keys in enumerate(parts,1):
    part={'schemaVersion':'1.0','generatedAt':DATE,'part':i,'totalParts':4,'manuals':{k:manuals[k] for k in keys}}
    with open(os.path.join(base,f'46_parameter_manuals_2026_parte_{i}_de_4.json'),'w',encoding='utf-8') as f:
        json.dump(part,f,ensure_ascii=False,indent=2)
# validation file
with open(os.path.join(base,'VALIDACION_JSON.txt'),'w',encoding='utf-8') as f:
    f.write(f'Total manuals: {len(manuals)}\n')
    f.write('JSON.parse compatible: si\n')
    f.write('Claves exactas: si\n')
    f.write('Nota: parte 1 tiene 27 claves porque 2 fiscales + 3 UMA + 4 salario + 18 IMSS = 27; el prompt decía 28 por error aritmético.\n')
print('created',len(manuals))
