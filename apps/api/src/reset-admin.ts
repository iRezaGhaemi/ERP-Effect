import "reflect-metadata";

import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { resolve } from "node:path";
import type { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";

import { AuditWriter, assertAuditDatabaseBoundary } from "@effect/audit/server";
import { UuidIdParamsSchema } from "@effect-erp/contracts";
import { createDataSource } from "@effect-erp/database";
import { NewPasswordSchema } from "@effect/users/contracts";
import {
  passwordHasher,
  UserCredentialsService,
} from "@effect/users/server";
import type { DataSource, EntityManager } from "typeorm";

type PasswordSource =
  | { kind: "terminal" }
  | { kind: "stdin" }
  | { kind: "file"; path: string };

export type ResetAdminArguments = {
  userId: string;
  passwordSource: PasswordSource;
};

type AuditAppender = Pick<AuditWriter, "write">;

const genericTargetError =
  "The requested system administrator is unavailable for recovery.";
const maximumSecretBytes = 1024;

function trimOneLineEnding(value: string): string {
  return value.endsWith("\r\n")
    ? value.slice(0, -2)
    : value.endsWith("\n")
      ? value.slice(0, -1)
      : value;
}

function assertSecretSize(value: string): string {
  if (Buffer.byteLength(value) > maximumSecretBytes || value.includes("\0")) {
    throw new Error("Password input is invalid.");
  }
  return trimOneLineEnding(value);
}

export function parseResetAdminArgs(argv: string[]): ResetAdminArguments {
  let userId: string | undefined;
  let passwordSource: PasswordSource | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--user-id" && userId === undefined) {
      userId = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument === "--password-stdin" && passwordSource === undefined) {
      passwordSource = { kind: "stdin" };
      continue;
    }
    if (argument === "--password-file" && passwordSource === undefined) {
      const path = argv[index + 1];
      if (!path) throw new Error("Password file path is required.");
      passwordSource = { kind: "file", path };
      index += 1;
      continue;
    }
    throw new Error("Invalid reset-admin arguments.");
  }
  if (!userId) throw new Error("A system administrator user id is required.");
  const parsedId = UuidIdParamsSchema.parse({ id: userId }).id;
  return {
    userId: parsedId,
    passwordSource: passwordSource ?? { kind: "terminal" },
  };
}

export async function readPasswordFile(path: string): Promise<string> {
  const handle = await open(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) throw new Error("Password source must be a regular file.");
    const processUid = process.getuid?.();
    if (processUid !== undefined && stats.uid !== processUid)
      throw new Error("Password file must be owned by the current user.");
    if ((stats.mode & 0o077) !== 0)
      throw new Error("Password file permissions must exclude group and others.");
    const value = await handle.readFile({ encoding: "utf8" });
    return assertSecretSize(value);
  } finally {
    await handle.close();
  }
}

async function readStreamPassword(input: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of input) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += value.length;
    if (size > maximumSecretBytes) throw new Error("Password input is invalid.");
    chunks.push(value);
  }
  return assertSecretSize(Buffer.concat(chunks).toString("utf8"));
}

async function readHiddenPassword(
  input: NodeJS.ReadStream,
  output: Writable,
): Promise<string> {
  if (!input.isTTY || typeof input.setRawMode !== "function")
    throw new Error("Interactive password entry requires a terminal.");
  output.write("New administrator password: ");
  const previousRawMode = input.isRaw;
  input.setRawMode(true);
  input.resume();
  return new Promise((resolvePassword, rejectPassword) => {
    let value = "";
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(Boolean(previousRawMode));
      input.pause();
      output.write("\n");
    };
    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString();
      if (text === "\u0003") {
        cleanup();
        rejectPassword(new Error("Password entry cancelled."));
        return;
      }
      if (text === "\r" || text === "\n") {
        cleanup();
        resolvePassword(assertSecretSize(value));
        return;
      }
      if (text === "\u007f" || text === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += text;
      if (Buffer.byteLength(value) > maximumSecretBytes) {
        cleanup();
        rejectPassword(new Error("Password input is invalid."));
      }
    };
    input.on("data", onData);
  });
}

async function isSystemSuperAdmin(
  manager: EntityManager,
  userId: string,
): Promise<boolean> {
  const [row] = await manager.query<Array<{ present: boolean }>>(
    `SELECT EXISTS (
       SELECT 1
         FROM user_roles assignment
         INNER JOIN roles role ON role.id = assignment.role_id
        WHERE assignment.user_id = $1
          AND role.slug = 'super-admin'
          AND role.is_system = true
     ) AS present`,
    [userId],
  );
  return row?.present === true;
}

export class AdminRecoveryService {
  private readonly credentials: UserCredentialsService;
  private readonly audit: AuditAppender;

  constructor(
    private readonly dataSource: DataSource,
    audit?: AuditAppender,
  ) {
    this.credentials = new UserCredentialsService(dataSource);
    this.audit = audit ?? new AuditWriter(dataSource);
  }

  async reset(userId: string, password: string): Promise<void> {
    const id = UuidIdParamsSchema.parse({ id: userId }).id;
    const validatedPassword = NewPasswordSchema.parse(password);
    await assertAuditDatabaseBoundary(this.dataSource);
    const hash = await passwordHasher.hash(validatedPassword);

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`reset-admin:${id}`],
      );
      const user = await this.credentials.lockById(id, manager);
      if (
        !user ||
        !user.username ||
        !user.passwordHash ||
        !(await isSystemSuperAdmin(manager, id))
      ) {
        throw new Error(genericTargetError);
      }

      const recoveredAt = new Date();
      await manager.query(
        `UPDATE sessions
            SET revoked_at = $2, revoked_reason = 'PASSWORD_RESET'
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [id, recoveredAt],
      );
      await manager.query(
        `UPDATE refresh_tokens token
            SET revoked_at = $2
           FROM sessions session
          WHERE token.session_id = session.id
            AND session.user_id = $1
            AND token.revoked_at IS NULL`,
        [id, recoveredAt],
      );
      await this.credentials.setTemporary(user, user.username, hash, manager);
      await this.audit.write(
        {
          actorId: null,
          action: "auth.password_recovered",
          entityType: "users",
          entityId: id,
          metadata: {},
          ipAddress: null,
          requestId: `reset_admin_${randomUUID()}`,
        },
        manager,
      );
    });
  }
}

export type ResetAdminRunner = {
  isTerminal: boolean;
  readTerminalPassword: () => Promise<string>;
  readStdinPassword: () => Promise<string>;
  readPasswordFile: (path: string) => Promise<string>;
  reset: (userId: string, password: string) => Promise<void>;
  write: (message: string) => void;
};

export async function runResetAdmin(
  argv: string[],
  runner: ResetAdminRunner,
): Promise<void> {
  const parsed = parseResetAdminArgs(argv);
  if (parsed.passwordSource.kind === "terminal" && !runner.isTerminal) {
    throw new Error(
      "Non-interactive recovery requires an explicit password source.",
    );
  }
  const password =
    parsed.passwordSource.kind === "terminal"
      ? await runner.readTerminalPassword()
      : parsed.passwordSource.kind === "stdin"
        ? assertSecretSize(await runner.readStdinPassword())
        : await runner.readPasswordFile(parsed.passwordSource.path);
  await runner.reset(parsed.userId, password);
  runner.write("Administrator password recovery completed.\n");
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Runtime database configuration is required.");
  const dataSource = createDataSource({ url: databaseUrl });
  try {
    await dataSource.initialize();
    const service = new AdminRecoveryService(dataSource);
    await runResetAdmin(process.argv.slice(2), {
      isTerminal: process.stdin.isTTY === true,
      readTerminalPassword: () => readHiddenPassword(process.stdin, process.stderr),
      readStdinPassword: () => readStreamPassword(process.stdin),
      readPasswordFile,
      reset: service.reset.bind(service),
      write: (message) => process.stdout.write(message),
    });
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void main().catch(() => {
    process.stderr.write("Administrator password recovery failed.\n");
    process.exitCode = 1;
  });
}
