#!/bin/sh
set -e

# EMPS-Fresnillo - entrypoint
# 1) Asegura que la DB existe (SQLite) o este conectada (Postgres).
# 2) Aplica schema (db push) la primera vez.
# 3) Siembra parametros si la DB esta vacia.
# 4) Lanza el comando recibido (default: node server.js).

DB_FILE="/app/data/dev.db"

if echo "$DATABASE_URL" | grep -q "^file:"; then
  echo "[entrypoint] SQLite mode. DB file: $DB_FILE"
  if [ ! -f "$DB_FILE" ]; then
    echo "[entrypoint] DB no existe, creando esquema..."
    npx --offline --no-install prisma db push --skip-generate --accept-data-loss
    echo "[entrypoint] Sembrando parametros 2026 + datasets + fuentes vivas..."
    npx --offline --no-install tsx prisma/seed.ts || echo "[entrypoint] (seed) advertencia: revisar si hay datos manualmente"
  else
    echo "[entrypoint] DB existente, sincronizando schema (db push idempotente)..."
    npx --offline --no-install prisma db push --skip-generate || true
  fi
else
  echo "[entrypoint] PostgreSQL mode."
  echo "[entrypoint] Aplicando migraciones..."
  npx --offline --no-install prisma migrate deploy || npx --offline --no-install prisma db push --skip-generate
fi

echo "[entrypoint] Iniciando aplicacion: $@"
exec "$@"
