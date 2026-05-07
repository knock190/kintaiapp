"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { UserDTO } from "@/external/dto/user.dto";
import { requireAdmin } from "@/features/auth/servers/redirect.server";
import {
  createUserInputSchema,
  deactivateUserInputSchema,
  listUsersInputSchema,
  reissuePasswordInputSchema,
} from "@/features/users/actions/user.schemas";
import {
  deactivateUserCommand,
  listUsersQuery,
  PasswordReissueService,
  UserCreationService,
  UserManagementError,
} from "@/features/users/services/user.service";
import type { ActionResult } from "@/shared/types/action-result";
import { err, ok } from "@/shared/types/action-result";

function toActionError<T>(error: unknown): ActionResult<T> {
  if (error instanceof UserManagementError) {
    return err(error.code, error.message, error.fieldErrors);
  }

  if (error instanceof z.ZodError) {
    return err(
      "VALIDATION_FAILED",
      "入力内容を確認してください。",
      z.flattenError(error).fieldErrors,
    );
  }

  console.error(error);
  return err("INTERNAL_ERROR", "処理中にエラーが発生しました。");
}

function revalidateUserPaths() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
}

export async function listUsersAction(
  input: unknown,
): Promise<ActionResult<UserDTO[]>> {
  try {
    await requireAdmin();
    listUsersInputSchema.parse(input);
    const items = await listUsersQuery();

    return ok(items);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createUserAction(
  input: unknown,
): Promise<ActionResult<UserDTO>> {
  try {
    await requireAdmin();
    const parsed = createUserInputSchema.parse(input);
    const user = await new UserCreationService().create(parsed);
    revalidateUserPaths();

    return ok(user);
  } catch (error) {
    return toActionError(error);
  }
}

export async function reissuePasswordAction(
  input: unknown,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdmin();
    const parsed = reissuePasswordInputSchema.parse(input);
    const result = await new PasswordReissueService().reissue(parsed);
    revalidateUserPaths();

    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivateUserAction(
  input: unknown,
): Promise<ActionResult<UserDTO>> {
  try {
    const session = await requireAdmin();
    const parsed = deactivateUserInputSchema.parse(input);

    if (session.user.id === parsed.userId) {
      return err("CONFLICT", "自分自身のアカウントは無効化できません。");
    }

    const user = await deactivateUserCommand(parsed.userId);
    revalidateUserPaths();

    return ok(user);
  } catch (error) {
    return toActionError(error);
  }
}
