#!/bin/sh
set -e

echo "🚀 [entrypoint] Iniciando Misreservaciones..."
echo "📊 [entrypoint] Modo de Base de Datos: PostgreSQL propio (Vultr / Coolify)"

# Si existe DATABASE_URL_CONTROL o DATABASE_URL, intentar desplegar o sincronizar esquema
if [ -n "$DATABASE_URL_CONTROL" ] || [ -n "$DATABASE_URL" ]; then
  echo "🔧 [entrypoint] Sincronizando esquema de Control Plane en PostgreSQL..."
  npx prisma db push --schema=prisma/schema.control.prisma --accept-data-loss --skip-generate || echo "⚠️ [entrypoint] Aviso: db push no bloqueante."
fi

echo "✨ [entrypoint] Iniciando servidor Next.js en puerto ${PORT:-3000}..."
exec node server.js

