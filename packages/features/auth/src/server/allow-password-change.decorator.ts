import { SetMetadata } from "@nestjs/common";

export const ALLOW_PASSWORD_CHANGE_METADATA_KEY =
  "effect:allow-password-change";

export const AllowPasswordChange = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_METADATA_KEY, true);
