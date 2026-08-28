FROM node:24-alpine AS base

WORKDIR /app
RUN corepack enable

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/features/audit/package.json packages/features/audit/package.json
COPY packages/features/users/package.json packages/features/users/package.json
COPY packages/platform/config/package.json packages/platform/config/package.json
COPY packages/platform/database/package.json packages/platform/database/package.json
COPY packages/platform/logger/package.json packages/platform/logger/package.json
COPY packages/platform/testing/package.json packages/platform/testing/package.json
COPY packages/shared/contracts/package.json packages/shared/contracts/package.json
COPY packages/shared/eslint-config/package.json packages/shared/eslint-config/package.json
COPY packages/shared/typescript-config/package.json packages/shared/typescript-config/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build

COPY . .
RUN pnpm --filter @effect/api build
RUN pnpm --filter @effect/api deploy --legacy --prod /app/deploy

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=build /app/deploy ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
