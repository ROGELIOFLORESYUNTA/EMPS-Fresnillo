#!/usr/bin/env python3
"""Agrega @db.Text / @db.LongText a campos String del schema.prisma para MySQL.

Razon: VARCHAR(191) default de MySQL es insuficiente para JSON snapshots,
notas tecnicas largas, descripciones, etc. SQLite no tiene este limite.

Uso: python3 scripts/fix-schema-mysql.py prisma/schema.prisma

Solo agrega atributos a campos String existentes. Idempotente: si el campo
ya tiene @db.X no lo toca.
"""
import re, sys

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Campos que guardan JSON serializado o texto muy largo -> LongText (~4GB)
LONG_TEXT = {
    'value', 'inputsSnapshot', 'parametersSnapshot', 'rawJson', 'rawFeatures',
    'payloadJson', 'affectedArtifactsJson', 'clientPlainExplanationJson',
    'providerTechnicalJson', 'financialBreakdownJson', 'legalReferencesJson',
    'sourceParameterKeysJson', 'warningsJson', 'inputJson', 'outputJson',
    'sourceJson', 'inputSnapshotJson', 'resultSnapshotJson', 'featureSchema',
    'explanation', 'featureImportance', 'metricsByDataset',
}
# Campos de texto humano (parrafos cortos a medianos) -> Text (~64KB)
TEXT = {
    'notes', 'description', 'objective', 'originalText', 'context',
    'feedbackText', 'lessonsLearned', 'mainDeviationReason', 'before', 'after',
    'comment', 'reason', 'risks', 'need', 'benefit', 'rules', 'dataRequired',
    'acceptanceCriteria', 'evidenceExpected', 'rolesPermissions', 'sourceUrl',
    'whatItAffects', 'howToModify', 'referencesMarkdown', 'originSource',
    'originUrl', 'originDocument', 'decisionComment',
    'freeChangeGuardrailReason', 'testingImpact', 'trainingImpact',
    'documentationImpact', 'message', 'source', 'reasonForChange', 'lessons',
    'mainBlocker', 'algorithm',
}

out = []
modified = 0
field_re = re.compile(r'^(\s+)(\w+)(\s+)String(\??)\s*(.*)$')
for line in lines:
    m = field_re.match(line)
    if not m:
        out.append(line)
        continue
    indent, name, ws, opt, rest = m.groups()
    if '@db.' in rest:
        out.append(line)
        continue
    if name in LONG_TEXT:
        attr = '@db.LongText'
    elif name in TEXT:
        attr = '@db.Text'
    else:
        out.append(line)
        continue
    new_rest = rest.strip()
    new_line = f"{indent}{name}{ws}String{opt} {attr}{(' ' + new_rest) if new_rest else ''}\n"
    out.append(new_line)
    modified += 1

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.writelines(out)
print(f"Modified {modified} fields", file=sys.stderr)
