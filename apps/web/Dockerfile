FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS base

WORKDIR /app
RUN corepack enable

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/features/audit/package.json packages/features/audit/package.json
COPY packages/features/access-control/package.json packages/features/access-control/package.json
COPY packages/features/users/package.json packages/features/users/package.json
COPY packages/features/auth/package.json packages/features/auth/package.json
COPY packages/platform/config/package.json packages/platform/config/package.json
COPY packages/platform/database/package.json packages/platform/database/package.json
COPY packages/platform/logger/package.json packages/platform/logger/package.json
COPY packages/platform/testing/package.json packages/platform/testing/package.json
COPY packages/shared/contracts/package.json packages/shared/contracts/package.json
COPY packages/shared/ui/package.json packages/shared/ui/package.json
COPY packages/shared/eslint-config/package.json packages/shared/eslint-config/package.json
COPY packages/shared/typescript-config/package.json packages/shared/typescript-config/package.json
RUN pnpm install --frozen-lockfile --store-dir=/pnpm/store

FROM dependencies AS build

ARG INTERNAL_API_URL=http://localhost:3001
ENV INTERNAL_API_URL=$INTERNAL_API_URL
COPY . .
RUN pnpm exec turbo run build --filter=@effect/web
RUN node apps/web/test/rewrite-manifest.mjs

FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
RUN chmod -R a-w /app
USER node
HEALTHCHECK --interval=5s --timeout=3s --retries=20 CMD wget -qO- http://127.0.0.1:3000/login || exit 1

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
