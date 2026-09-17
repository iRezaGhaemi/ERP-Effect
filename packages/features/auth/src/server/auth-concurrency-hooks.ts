export type AuthConcurrencyHooks = {
  afterLoginVerify?: () => Promise<void>;
  afterChangeHash?: () => Promise<void>;
  afterAdminTargetVerify?: () => Promise<void>;
  afterRefreshLookup?: () => Promise<void>;
};

export const AUTH_CONCURRENCY_HOOKS = Symbol("AUTH_CONCURRENCY_HOOKS");
