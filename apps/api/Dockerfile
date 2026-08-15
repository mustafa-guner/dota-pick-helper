# Build context is the repo root (needs sibling workspace packages).
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN npm run build --workspace packages/shared-types
RUN npm run build --workspace apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=builder /app/apps/api/dist apps/api/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
