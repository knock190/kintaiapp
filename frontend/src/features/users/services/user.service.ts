import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { asc, eq } from "drizzle-orm";

import { db } from "@/external/db";
import { accounts, users } from "@/external/db/schema";
import type { UserDTO, UserRole } from "@/external/dto/user.dto";
import { employeeIdToEmail } from "@/features/auth/utils/employee-email";
import type {
  CreateUserInput,
  ReissuePasswordInput,
} from "@/features/users/actions/user.schemas";
import type { ActionErrorCode } from "@/shared/types/action-result";

type UserRow = typeof users.$inferSelect;

export class UserManagementError extends Error {
  constructor(
    public readonly code: ActionErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "UserManagementError";
  }
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  if ("code" in error && error.code === "23505") {
    return true;
  }

  if ("cause" in error) {
    return isUniqueViolation(error.cause);
  }

  return false;
}

function assertRole(role: string): UserRole {
  return role === "admin" ? "admin" : "member";
}

function toUserDTO(user: UserRow): UserDTO {
  return {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    role: assertRole(user.role),
    isActive: user.deactivatedAt === null,
    mustChangePassword: user.mustChangePassword,
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function listUsersQuery(): Promise<UserDTO[]> {
  const rows = await db.query.users.findMany({
    orderBy: [asc(users.employeeId)],
  });

  return rows.map(toUserDTO);
}

export class UserCreationService {
  async create(input: CreateUserInput): Promise<UserDTO> {
    const now = new Date();
    const userId = randomUUID();
    const email = employeeIdToEmail(input.employeeId);
    const passwordHash = await hashPassword(input.initialPassword);

    try {
      const createdUser = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            id: userId,
            name: input.name,
            email,
            emailVerified: true,
            employeeId: input.employeeId,
            role: input.role,
            mustChangePassword: true,
            deactivatedAt: null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        await tx.insert(accounts).values({
          id: randomUUID(),
          userId,
          providerId: "credential",
          accountId: userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });

        return user;
      });

      return toUserDTO(createdUser);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserManagementError(
          "CONFLICT",
          "同じ社員 ID のユーザーが既に存在します。",
          { employeeId: ["この社員 ID は既に使用されています。"] },
        );
      }

      throw error;
    }
  }
}

export class PasswordReissueService {
  async reissue(input: ReissuePasswordInput): Promise<{ userId: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
    });

    if (!user) {
      throw new UserManagementError(
        "NOT_FOUND",
        "対象ユーザーが見つかりません。",
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(input.newPassword);
    const [account] = await db
      .update(accounts)
      .set({
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(accounts.userId, input.userId))
      .returning();

    if (!account) {
      throw new UserManagementError(
        "NOT_FOUND",
        "対象アカウントが見つかりません。",
      );
    }

    await db
      .update(users)
      .set({
        updatedAt: now,
      })
      .where(eq(users.id, input.userId));

    return { userId: input.userId };
  }
}

export async function deactivateUserCommand(userId: string): Promise<UserDTO> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new UserManagementError(
      "NOT_FOUND",
      "対象ユーザーが見つかりません。",
    );
  }

  if (user.deactivatedAt) {
    throw new UserManagementError(
      "CONFLICT",
      "このユーザーは既に無効化されています。",
    );
  }

  const now = new Date();
  const [updated] = await db
    .update(users)
    .set({
      deactivatedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning();

  return toUserDTO(updated);
}
