export { AUTH_OPTIONS } from "./auth.options.js";
export type { AuthOptions } from "./auth.options.js";
export { AuthenticationGuard } from "./authentication.guard.js";
export { AuthController } from "./auth.controller.js";
export { AuthModule } from "./auth.module.js";
export { CredentialAdminController } from "./credential-admin.controller.js";
export { PasswordAuthService } from "./password-auth.service.js";
export {
  AllowPasswordChange,
  ALLOW_PASSWORD_CHANGE_METADATA_KEY,
} from "./allow-password-change.decorator.js";
export { RateLimitError, RateLimitService } from "./rate-limit.service.js";
export type { RateLimitPolicy, RateLimitScope } from "./rate-limit.service.js";
export { Public, PUBLIC_ROUTE_METADATA_KEY } from "./public.decorator.js";
export { SessionService } from "./session.service.js";
export type {
  AuthResult,
  MeResult,
  SessionListItem,
  UserSummary,
} from "./session.service.js";
export { TokenService } from "./token.service.js";
export type { AccessTokenPayload } from "./token.service.js";
