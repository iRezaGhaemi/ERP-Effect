import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import { CSRF_TOKEN_BYTES } from "../contracts/index.js";
import { AUTH_OPTIONS, type AuthOptions } from "./auth.options.js";

const AccessTokenPayloadSchema = z.object({
  sub: z.uuid(),
  sid: z.uuid(),
  phone: z.string().min(1),
  cv: z.number().int().nonnegative(),
  mcp: z.boolean(),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
});

export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;

type SignAccessTokenInput = {
  userId: string;
  sessionId: string;
  phone: string;
  credentialVersion: number;
  mustChangePassword: boolean;
};

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

@Injectable()
export class TokenService {
  constructor(@Inject(AUTH_OPTIONS) private readonly options: AuthOptions) {}

  signAccessToken(input: SignAccessTokenInput): string {
    const iat = Math.floor(Date.now() / 1_000);
    const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
    const payload = base64UrlJson({
      sub: input.userId,
      sid: input.sessionId,
      phone: input.phone,
      cv: input.credentialVersion,
      mcp: input.mustChangePassword,
      iat,
      exp: iat + this.options.accessTtlSeconds,
    });
    const unsigned = `${header}.${payload}`;
    return `${unsigned}.${this.sign(unsigned)}`;
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    if (!header || !payload || !signature) return null;
    const unsigned = `${header}.${payload}`;
    if (!safeEqual(this.sign(unsigned), signature)) return null;
    let parsedHeader: unknown;
    let parsedPayload: unknown;
    try {
      parsedHeader = JSON.parse(Buffer.from(header, "base64url").toString());
      parsedPayload = JSON.parse(Buffer.from(payload, "base64url").toString());
    } catch {
      return null;
    }
    if (
      !parsedHeader ||
      typeof parsedHeader !== "object" ||
      (parsedHeader as { alg?: unknown }).alg !== "HS256" ||
      (parsedHeader as { typ?: unknown }).typ !== "JWT"
    ) {
      return null;
    }
    const result = AccessTokenPayloadSchema.safeParse(parsedPayload);
    if (!result.success) return null;
    if (result.data.exp <= Math.floor(Date.now() / 1_000)) return null;
    return result.data;
  }

  generateRefreshToken(): string {
    return randomBytes(32).toString("base64url");
  }

  generateCsrfToken(): string {
    return randomBytes(CSRF_TOKEN_BYTES).toString("base64url");
  }

  hashOpaqueToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private sign(unsigned: string): string {
    return createHmac("sha256", this.options.jwtAccessSecret)
      .update(unsigned)
      .digest("base64url");
  }
}
