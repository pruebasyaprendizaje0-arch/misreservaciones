#!/bin/sh
# entrypoint.sh — sincroniza el esquema de Prisma en la BD de control de producción, seedea el Superadmin y arranca Next.js

set -e

echo "[entrypoint] Sincronizando esquema de la BD de control de producción (db push)..."
node node_modules/.bin/prisma db push --schema=prisma/schema.control.prisma --accept-data-loss || {
  echo "[entrypoint] ADVERTENCIA: prisma db push falló al actualizar la BD de control."
}

echo "[entrypoint] Configurando usuario Superadministrador..."
node scripts/seed-superadmin.js || {
  echo "[entrypoint] ADVERTENCIA: No se pudo seeder el superadministrador."
}

echo "[entrypoint] Iniciando servidor Next.js..."
exec node server.js
