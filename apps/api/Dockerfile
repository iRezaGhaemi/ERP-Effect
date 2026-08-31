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

COPY . .
RUN pnpm --filter @effect/api build
RUN pnpm --filter @effect/api deploy --prod --offline --store-dir=/pnpm/store /app/deploy

FROM build AS test-build
ENV NODE_ENV=test
RUN pnpm --filter @effect/api exec tsc -p tsconfig.test-build.json

FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=build /app/deploy ./
RUN chmod -R a-w /app
USER node
HEALTHCHECK --interval=5s --timeout=3s --retries=20 CMD wget -qO- http://127.0.0.1:3001/api/v1/health/ready || exit 1

EXPOSE 3001
CMD ["node", "dist/main.js"]

FROM runtime AS test-runner
ENV NODE_ENV=test
COPY --from=test-build /app/apps/api/dist-test ./dist-test
CMD ["node", "dist-test/main.test.js"]

FROM runtime AS runner
