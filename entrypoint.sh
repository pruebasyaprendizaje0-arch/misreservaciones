#!/bin/sh

echo "🚀 [entrypoint] Iniciando Misreservaciones..."
echo "📊 [entrypoint] Modo de Base de Datos: PostgreSQL propio (Vultr / Coolify)"
echo "✨ [entrypoint] Iniciando servidor Next.js en puerto ${PORT:-3000}..."

exec node server.js
