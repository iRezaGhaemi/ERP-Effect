FROM node:24-alpine AS base

WORKDIR /app
RUN corepack enable

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
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
RUN pnpm --dir packages/platform/config exec tsc --declaration false --sourceMap false --module NodeNext --moduleResolution NodeNext --target ES2024 --skipLibCheck --outDir src src/index.ts src/env.ts
RUN pnpm --dir packages/platform/database exec tsc --declaration false --sourceMap false --module NodeNext --moduleResolution NodeNext --target ES2024 --skipLibCheck --outDir src src/index.ts src/data-source.ts src/entity-registry.ts
RUN pnpm --dir packages/platform/logger exec tsc --declaration false --sourceMap false --module NodeNext --moduleResolution NodeNext --target ES2024 --skipLibCheck --outDir src src/index.ts src/logger.ts

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages ./packages

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
