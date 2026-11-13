# Image API BrewLite (NestJS + Prisma). Build: docker build -t brewlite-api apps/api
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build \
 && npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --target es2022 --esModuleInterop --skipLibCheck

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production PORT=4000
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Chỉ cài thư viện chạy (gồm Prisma CLI để chạy migrate deploy); postinstall sinh Prisma Client cho Alpine
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1
# Ở local (Docker Compose) bật RUN_MIGRATIONS, RUN_SEED; production chạy migration trong pipeline CD (ADR-009)
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then npx prisma migrate deploy; fi && if [ \"$RUN_SEED\" = \"true\" ]; then node dist/prisma/seed.js; fi && exec node dist/main.js"]
