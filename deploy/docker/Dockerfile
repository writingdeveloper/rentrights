# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js 16 standalone output. Pin node:22-alpine to a
# digest before production for reproducibility.

# --- deps: resolve node_modules from the lockfile ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile the standalone server ---
FROM node:22-alpine AS build
WORKDIR /app
# NEXT_PUBLIC_* are INLINED at build time, so the canonical/OG/sitemap origin
# must be passed here (not at runtime). The committed .env.production already
# carries the Cloudflare production origin; this ARG overrides it if set.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: minimal standalone runtime, non-root ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# Standalone server + the static/public assets it serves (server.js serves these
# when copied to .next/standalone/{public,.next/static}).
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
