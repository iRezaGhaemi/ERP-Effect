import { AccessControlService } from "@effect/access-control/server";
import { AuditWriter } from "@effect/audit/server";
import { DomainError, type RequestContext } from "@effect-erp/contracts";
import {
  ChangePasswordSchema,
  ResetPasswordSchema,
  SetupCredentialsSchema,
} from "@effect/users/contracts";
import { UserEntity, UserStatus } from "@effect/users/entities";
import {
  passwordHasher,
  UserCredentialsService,
} from "@effect/users/server";
import { Inject, Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

import { LoginSchema, type LoginInput } from "../contracts/index.js";
import {
  AUTH_CONCURRENCY_HOOKS,
  type AuthConcurrencyHooks,
} from "./auth-concurrency-hooks.js";
import { RateLimitService } from "./rate-limit.service.js";
import { type AuthResult, SessionService } from "./session.service.js";

const LOGIN_POLICY = { limit: 5, windowSeconds: 15 * 60 } as const;
const LOGIN_IP_POLICY = { limit: 30, windowSeconds: 15 * 60 } as const;
const ACTOR_POLICY = { limit: 5, windowSeconds: 15 * 60 } as const;
const DUMMY_HASH =
  "$scrypt$v1$32768$8$3$ZWZmZWN0LWF1dGgtZHVtbQ$40_qiv56fTzgKHDpQiSetE-2sgLOd04TdUmj1zJUjT8M2dwfETUJUDZiyii9D8u7GHVILNwsyL2eHvcB8_Gjdg";

type AuthenticatedContext = RequestContext & {
  auth: {
    sessionId: string;
    credentialVersion: number;
    mustChangePassword: boolean;
  };
};

type CredentialSnapshot = {
  id: string;
  username: string | null;
  passwordHash: string | null;
  status: UserStatus;
  credentialVersion: number;
  mustChangePassword: boolean;
  temporaryPasswordExpiresAt: number | null;
};

function invalidCredentials(): DomainError {
  return new DomainError(
    "INVALID_CREDENTIALS",
    "نام کاربری یا رمز عبور نامعتبر است.",
  );
}

function permissionDenied(): DomainError {
  return new DomainError(
    "PERMISSION_DENIED",
    "دسترسی لازم برای این عملیات وجود ندارد.",
  );
}

function passwordReuse(): DomainError {
  return new DomainError(
    "PASSWORD_REUSE",
    "رمز عبور جدید نباید با رمز فعلی یکسان باشد.",
  );
}

function snapshot(user: UserEntity): CredentialSnapshot {
  return {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    status: user.status,
    credentialVersion: user.credentialVersion,
    mustChangePassword: user.mustChangePassword,
    temporaryPasswordExpiresAt:
      user.temporaryPasswordExpiresAt?.getTime() ?? null,
  };
}

function sameSnapshot(user: UserEntity, expected: CredentialSnapshot): boolean {
  const actual = snapshot(user);
  return (
    actual.id === expected.id &&
    actual.username === expected.username &&
    actual.passwordHash === expected.passwordHash &&
    actual.status === expected.status &&
    actual.credentialVersion === expected.credentialVersion &&
    actual.mustChangePassword === expected.mustChangePassword &&
    actual.temporaryPasswordExpiresAt === expected.temporaryPasswordExpiresAt
  );
}

function isUsable(user: UserEntity | null, now = new Date()): user is UserEntity {
  return Boolean(
    user?.username &&
      user.passwordHash &&
      user.status === UserStatus.ACTIVE &&
      (!user.mustChangePassword ||
        (user.temporaryPasswordExpiresAt !== null &&
          user.temporaryPasswordExpiresAt > now)),
  );
}

function authContext(context: RequestContext): AuthenticatedContext["auth"] {
  const auth = (context as Partial<AuthenticatedContext>).auth;
  if (
    !auth ||
    !auth.sessionId ||
    !Number.isInteger(auth.credentialVersion) ||
    typeof auth.mustChangePassword !== "boolean"
  )
    throw new DomainError("SESSION_INVALID", "نشست نامعتبر است.");
  return auth;
}

function uniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

@Injectable()
export class PasswordAuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly credentials: UserCredentialsService,
    private readonly rateLimits: RateLimitService,
    private readonly sessions: SessionService,
    private readonly access: AccessControlService,
    private readonly auditWriter: AuditWriter,
    @Inject(AUTH_CONCURRENCY_HOOKS)
    private readonly concurrencyHooks: AuthConcurrencyHooks,
  ) {}

  async login(input: LoginInput, context: RequestContext): Promise<AuthResult> {
    const values = LoginSchema.parse(input);
    const limits = await Promise.allSettled([
      this.rateLimits.consume("auth:username", values.username, LOGIN_POLICY),
      this.rateLimits.consume("auth:ip", context.ipAddress, LOGIN_IP_POLICY),
    ]);
    for (const result of limits)
      if (result.status === "rejected") throw result.reason;
    const candidate = await this.credentials.findByUsername(values.username);
    const candidateSnapshot = candidate ? snapshot(candidate) : null;
    const verified = await passwordHasher.verify(
      values.password,
      candidate?.passwordHash ?? DUMMY_HASH,
    );
    await this.concurrencyHooks.afterLoginVerify?.();
    if (!verified || !isUsable(candidate)) {
      await this.auditRejectedLogin(candidate?.id ?? null, context);
      throw invalidCredentials();
    }

    return this.dataSource.transaction(async (manager) => {
      const locked = await this.credentials.lockById(candidate.id, manager);
      if (
        !locked ||
        !candidateSnapshot ||
        !sameSnapshot(locked, candidateSnapshot) ||
        !isUsable(locked)
      )
        throw invalidCredentials();
      return this.sessions.createForLogin(locked, context, manager);
    });
  }

  async changePassword(
    actorId: string,
    input: unknown,
    context: RequestContext,
  ): Promise<AuthResult> {
    const values = ChangePasswordSchema.parse(input);
    const principal = authContext(context);
    await this.rateLimits.consume("auth:actor", actorId, ACTOR_POLICY);
    const actor = await this.findCredentialUser(actorId);
    const actorSnapshot = actor ? snapshot(actor) : null;
    const currentVerified = await passwordHasher.verify(
      values.currentPassword,
      actor?.passwordHash ?? DUMMY_HASH,
    );
    if (!actor || !actorSnapshot || !currentVerified || !isUsable(actor))
      throw invalidCredentials();
    if (await passwordHasher.verify(values.newPassword, actor.passwordHash!))
      throw passwordReuse();
    const nextHash = await passwordHasher.hash(values.newPassword);
    await this.concurrencyHooks.afterChangeHash?.();

    return this.dataSource.transaction(async (manager) => {
      const locked = await this.credentials.lockById(actorId, manager);
      if (
        !locked ||
        !sameSnapshot(locked, actorSnapshot) ||
        !isUsable(locked) ||
        principal.credentialVersion !== locked.credentialVersion ||
        principal.mustChangePassword !== locked.mustChangePassword
      )
        throw invalidCredentials();
      await this.sessions.assertCurrentSession(
        locked,
        principal.sessionId,
        principal.credentialVersion,
        true,
        manager,
      );
      await this.sessions.revokeForCredentialChange(
        actorId,
        "PASSWORD_CHANGED",
        manager,
      );
      const changed = await this.credentials.setPermanent(locked, nextHash, manager);
      await this.auditWriter.write(
        {
          actorId,
          action: "auth.password_changed",
          entityType: "users",
          entityId: actorId,
          metadata: {},
          ipAddress: context.ipAddress,
          requestId: context.requestId,
        },
        manager,
      );
      return this.sessions.createAfterPasswordChange(changed, context, manager);
    });
  }

  async setupCredentials(
    actorId: string,
    userId: string,
    input: unknown,
    context: RequestContext,
  ): Promise<void> {
    const values = SetupCredentialsSchema.parse(input);
    await this.adminCredentialMutation(
      actorId,
      userId,
      values.actorPassword,
      values.initialPassword,
      context,
      false,
      async (actor, target, hash, manager) => {
        if (target.username !== null || target.passwordHash !== null)
          throw new DomainError(
            "CREDENTIALS_ALREADY_CONFIGURED",
            "اطلاعات ورود کاربر قبلاً تنظیم شده است.",
          );
        await this.sessions.revokeForCredentialChange(
          target.id,
          "AUTH_METHOD_CHANGED",
          manager,
        );
        await this.credentials.setTemporary(target, values.username, hash, manager);
        await this.auditWriter.write(
          {
            actorId: actor.id,
            action: "auth.credentials_setup",
            entityType: "users",
            entityId: target.id,
            metadata: {},
            ipAddress: context.ipAddress,
            requestId: context.requestId,
          },
          manager,
        );
      },
    );
  }

  async resetPassword(
    actorId: string,
    userId: string,
    input: unknown,
    context: RequestContext,
  ): Promise<void> {
    const values = ResetPasswordSchema.parse(input);
    if (actorId === userId)
      throw new DomainError(
        "SELF_ADMIN_RESET_FORBIDDEN",
        "برای تغییر رمز خود از مسیر تغییر رمز استفاده کنید.",
      );
    await this.adminCredentialMutation(
      actorId,
      userId,
      values.actorPassword,
      values.newPassword,
      context,
      true,
      async (actor, target, hash, manager) => {
        if (target.username === null || target.passwordHash === null)
          throw new DomainError(
            "CREDENTIALS_NOT_CONFIGURED",
            "اطلاعات ورود کاربر هنوز تنظیم نشده است.",
          );
        if (
          (await this.isSystemSuperAdmin(target.id, manager)) &&
          !(await this.isSystemSuperAdmin(actor.id, manager))
        )
          throw permissionDenied();
        await this.sessions.revokeForCredentialChange(
          target.id,
          "PASSWORD_RESET",
          manager,
        );
        await this.credentials.setTemporary(target, target.username, hash, manager);
        await this.auditWriter.write(
          {
            actorId: actor.id,
            action: "auth.password_reset",
            entityType: "users",
            entityId: target.id,
            metadata: {},
            ipAddress: context.ipAddress,
            requestId: context.requestId,
          },
          manager,
        );
      },
    );
  }

  private async adminCredentialMutation(
    actorId: string,
    userId: string,
    actorPassword: string,
    newPassword: string,
    context: RequestContext,
    rejectTargetPasswordReuse: boolean,
    mutate: (
      actor: UserEntity,
      target: UserEntity,
      hash: string,
      manager: EntityManager,
    ) => Promise<void>,
  ): Promise<void> {
    const principal = authContext(context);
    await this.rateLimits.consume("auth:actor", actorId, ACTOR_POLICY);
    const actorCandidate = await this.findCredentialUser(actorId);
    const actorSnapshot = actorCandidate ? snapshot(actorCandidate) : null;
    if (
      !actorCandidate ||
      !actorSnapshot ||
      !(await passwordHasher.verify(
        actorPassword,
        actorCandidate.passwordHash ?? DUMMY_HASH,
      )) ||
      !isUsable(actorCandidate) ||
      actorCandidate.mustChangePassword
    )
      throw invalidCredentials();
    let targetSnapshot: CredentialSnapshot | null = null;
    if (rejectTargetPasswordReuse) {
      const targetCandidate = await this.findCredentialUser(userId);
      targetSnapshot = targetCandidate ? snapshot(targetCandidate) : null;
      if (
        targetCandidate?.passwordHash &&
        (await passwordHasher.verify(newPassword, targetCandidate.passwordHash))
      )
        throw passwordReuse();
      await this.concurrencyHooks.afterAdminTargetVerify?.();
    }
    const nextHash = await passwordHasher.hash(newPassword);

    try {
      await this.dataSource.transaction(async (manager) => {
        const locked = new Map<string, UserEntity>();
        for (const id of [...new Set([actorId, userId])].sort()) {
          const user = await this.credentials.lockById(id, manager);
          if (!user)
            throw new DomainError("USER_NOT_FOUND", "کاربر پیدا نشد.");
          locked.set(id, user);
        }
        const actor = locked.get(actorId)!;
        const target = locked.get(userId)!;
        if (
          rejectTargetPasswordReuse &&
          (!targetSnapshot || !sameSnapshot(target, targetSnapshot))
        )
          throw invalidCredentials();
        if (
          !sameSnapshot(actor, actorSnapshot) ||
          actor.status !== UserStatus.ACTIVE ||
          actor.mustChangePassword ||
          principal.mustChangePassword ||
          principal.credentialVersion !== actor.credentialVersion
        )
          throw invalidCredentials();
        await this.sessions.assertCurrentSession(
          actor,
          principal.sessionId,
          principal.credentialVersion,
          false,
          manager,
        );
        if (
          !(await this.access.hasPermission(
            actorId,
            "users:credentials:manage",
            manager,
          ))
        )
          throw permissionDenied();
        await mutate(actor, target, nextHash, manager);
      });
    } catch (error) {
      if (uniqueViolation(error))
        throw new DomainError(
          "USERNAME_ALREADY_EXISTS",
          "نام کاربری قبلاً ثبت شده است.",
        );
      throw error;
    }
  }

  private async findCredentialUser(id: string): Promise<UserEntity | null> {
    return this.dataSource.manager
      .getRepository(UserEntity)
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id })
      .getOne();
  }

  private async isSystemSuperAdmin(
    userId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    const rows = await manager.query<Array<{ present: boolean }>>(
      `SELECT EXISTS (
         SELECT 1 FROM user_roles ur
         INNER JOIN roles role ON role.id = ur.role_id
         WHERE ur.user_id = $1 AND role.slug = 'super-admin' AND role.is_system = true
       ) AS present`,
      [userId],
    );
    return rows[0]?.present === true;
  }

  private async auditRejectedLogin(
    actorId: string | null,
    context: RequestContext,
  ): Promise<void> {
    await this.auditWriter.write({
      actorId,
      action: "auth.login_rejected",
      entityType: "auth",
      entityId: null,
      metadata: {},
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  }
}
