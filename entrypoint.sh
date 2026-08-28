#!/bin/sh

if [ -f "scripts/seed-superadmin.js" ]; then
  echo "[entrypoint] Configurando usuario Superadministrador..."
  node scripts/seed-superadmin.js || echo "[entrypoint] ADVERTENCIA: No se pudo seeder el superadministrador."
fi

echo "[entrypoint] Iniciando servidor Next.js..."
exec node server.js
