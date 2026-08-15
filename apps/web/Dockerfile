# Build context is the repo root (needs sibling workspace packages).
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm run build --workspace packages/shared-types
RUN npm run build --workspace apps/web

FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
