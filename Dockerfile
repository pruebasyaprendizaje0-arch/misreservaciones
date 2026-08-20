# --- ETAPA 1: BASE ---
# Usamos Node 22 Alpine para contar con las dependencias y librerías modernas nativas de compilación.
FROM node:22-alpine AS base

# Habilitamos Corepack y preparamos pnpm v9 para evitar cambios de ruptura de las versiones v10/v11.
RUN corepack enable && corepack prepare pnpm@9 --activate && apk add --no-cache openssl && rm -rf /var/cache/apk/*

# --- 1. INSTALACIÓN DE DEPENDENCIAS ---
FROM base AS deps
# Agregamos libc6-compat para compatibilidad con compilaciones nativas como Sharp y Prisma Engines.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiar archivos de dependencias y esquemas de Prisma
COPY package.json pnpm-lock.yaml* package-lock.json* .npmrc* ./
COPY prisma ./prisma

# Instalar dependencias con soporte para pnpm-lock o fallback de package-lock
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then pnpm install; \
    else pnpm install; fi

# --- 2. CONSTRUCCIÓN DE LA APLICACIÓN ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generar de forma explícita e independiente los esquemas de Prisma
RUN pnpm exec prisma generate --schema=prisma/schema.control.prisma
RUN pnpm exec prisma generate --schema=prisma/schema.tenant.prisma


# Compilar la aplicación Next.js
RUN pnpm build

# --- 3. IMAGEN DE PRODUCCIÓN ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instalar curl para que el healthcheck de Coolify funcione correctamente
RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar activos públicos y directorios requeridos
COPY --from=builder /app/public ./public

# Configurar el directorio de caché de Next.js
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar la compilación standalone optimizada de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Copiar el CLI y Query Engines (.prisma) para ejecución en contenedor
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma


# Copiar y dar permisos al entrypoint (lo hacemos antes de cambiar a nextjs)
COPY --chown=nextjs:nodejs entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

# Healthcheck generoso para que Next.js tenga tiempo de arrancar
HEALTHCHECK --interval=5s --timeout=10s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
