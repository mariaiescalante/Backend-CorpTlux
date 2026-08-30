# ── ETAPA 1: Dependencias ──
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── ETAPA 2: Compilación (Build) ──
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV production

RUN npm run build

# ── ETAPA 3: Imagen Ligera de Producción (Runner) ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 4000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]