# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
RUN npm install --global turbo@2.10.10
WORKDIR /repo

# `turbo prune` computes the workspace-dependency subgraph for this app from
# turbo.json + the lockfile, so new packages/layers don't need a Dockerfile edit.
FROM base AS pruner
COPY . .
RUN turbo prune @nuxt-app/api --docker

FROM base AS development
COPY --from=pruner /repo/out/json/ .
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .

FROM base AS runner
ENV NODE_ENV=production
COPY --from=development /repo .
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
