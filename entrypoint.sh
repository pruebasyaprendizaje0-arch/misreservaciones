#!/bin/sh
# entrypoint.sh — ejecuta migraciones de Prisma, seedea el Superadmin y arranca Next.js

set -e

echo "[entrypoint] Ejecutando migraciones de la BD de control..."
node node_modules/.bin/prisma migrate deploy --schema=prisma/schema.control.prisma || {
  echo "[entrypoint] ADVERTENCIA: prisma migrate deploy falló o no hay migraciones pendientes."
}

echo "[entrypoint] Configurando usuario Superadministrador..."
node scripts/seed-superadmin.js || {
  echo "[entrypoint] ADVERTENCIA: No se pudo seeder el superadministrador."
}

echo "[entrypoint] Iniciando servidor Next.js..."
exec node server.js
