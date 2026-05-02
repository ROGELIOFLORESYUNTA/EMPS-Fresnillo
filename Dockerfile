# EMPS-Fresnillo - Dockerfile multi-stage para deploy en VPS
# Estrategia:
#  - SQLite local (default) o PostgreSQL via DATABASE_URL.
#  - Build standalone Next.js para imagen final ligera.
#  - Usuario no-root, healthcheck en /api/projects.

ARG NODE_VERSION=20-alpine

# ======================
# Stage 1: deps
# ======================
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ======================
# Stage 2: build
# ======================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ======================
# Stage 3: runner
# ======================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apk add --no-cache openssl curl wget && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/dev.db

# Persistencia para SQLite y JSON seeds
RUN mkdir -p /app/data /app/prisma && chown -R nextjs:nodejs /app/data /app/prisma

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/17_seed_data_parametros_2026.json ./
COPY --from=builder --chown=nextjs:nodejs /app/26_seed_fuentes_vivas_2026.json ./
COPY --chown=nextjs:nodejs docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/projects || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
