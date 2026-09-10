FROM node:22-alpine

RUN npm install -g pnpm@12.3.4

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/app/package.json ./apps/app/
COPY apps/admin/package.json ./apps/admin/
COPY packages/ui/package.json ./packages/ui/
COPY packages/auth/package.json ./packages/auth/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts
COPY apps/api/server/database ./apps/api/server/database

WORKDIR /app/apps/api

EXPOSE 4983

CMD ["pnpm", "exec", "drizzle-kit", "studio", "--host", "0.0.0.0", "--port", "4983"]
