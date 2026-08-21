#!/bin/sh
# entrypoint.sh — sincroniza el esquema de Prisma en la BD de control de producción sin pérdida de datos, seedea el Superadmin y arranca Next.js

set -e

echo "[entrypoint] Sincronizando esquema de la BD de control de producción (db push)..."
if [ -f node_modules/prisma/build/index.js ]; then
  node node_modules/prisma/build/index.js db push --schema=prisma/schema.control.prisma --accept-data-loss --skip-generate
elif [ -f node_modules/.bin/prisma ]; then
  node node_modules/.bin/prisma db push --schema=prisma/schema.control.prisma --accept-data-loss --skip-generate
fi

echo "[entrypoint] Configurando usuario Superadministrador..."
node scripts/seed-superadmin.js || {
  echo "[entrypoint] ADVERTENCIA: No se pudo seeder el superadministrador."
}

echo "[entrypoint] Iniciando servidor Next.js..."
exec node server.js
