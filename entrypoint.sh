#!/bin/sh
# entrypoint.sh — ejecuta migraciones de Prisma y luego arranca Next.js

set -e

echo "[entrypoint] Ejecutando migraciones de la BD de control..."
node node_modules/.bin/prisma migrate deploy --schema=prisma/schema.control.prisma || {
  echo "[entrypoint] ADVERTENCIA: prisma migrate deploy falló o no hay migraciones pendientes."
}

echo "[entrypoint] Iniciando servidor Next.js..."
exec node server.js
