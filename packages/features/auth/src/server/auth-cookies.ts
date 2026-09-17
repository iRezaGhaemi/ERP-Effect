import type { AuthOptions } from "./auth.options.js";
import type { AuthResult } from "./session.service.js";

export type CookieResponse = {
  cookie: (
    name: string,
    value: string,
    options: Record<string, unknown>,
  ) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
};

function cookieOptions(
  options: AuthOptions,
  httpOnly: boolean,
  maxAge: number,
) {
  return {
    httpOnly,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: options.cookieSecure,
  };
}

export function publicAuthBody(result: AuthResult) {
  return { user: result.user, sessionId: result.sessionId };
}

export function setAuthCookies(
  response: CookieResponse,
  result: AuthResult,
  options: AuthOptions,
): void {
  const restrictedMaxAge = 10 * 60 * 1_000;
  const accessMaxAge = result.user.mustChangePassword
    ? Math.min(restrictedMaxAge, options.accessTtlSeconds * 1_000)
    : options.accessTtlSeconds * 1_000;
  const refreshMaxAge = result.user.mustChangePassword
    ? restrictedMaxAge
    : options.refreshTtlDays * 86_400_000;
  response.cookie(
    "effect_access",
    result.accessToken,
    cookieOptions(options, true, accessMaxAge),
  );
  response.cookie(
    "effect_refresh",
    result.refreshToken,
    cookieOptions(options, true, refreshMaxAge),
  );
  response.cookie(
    "effect_csrf",
    result.csrfToken,
    cookieOptions(options, false, refreshMaxAge),
  );
}

export function clearAuthCookies(
  response: CookieResponse,
  options?: AuthOptions,
): void {
  const clearOptions = {
    path: "/",
    sameSite: "lax",
    secure: options?.cookieSecure ?? false,
  };
  response.clearCookie("effect_access", { ...clearOptions, httpOnly: true });
  response.clearCookie("effect_refresh", { ...clearOptions, httpOnly: true });
  response.clearCookie("effect_csrf", { ...clearOptions, httpOnly: false });
}
