"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  AttendanceDTO,
  AttendanceListItemDTO,
} from "@/external/dto/attendance.dto";
import { AttendanceDomainError } from "@/features/attendance/domain/Attendance";
import {
  clockInCommand,
  clockOutCommand,
  getMyAttendanceQuery,
  listAttendancesQuery,
  markAwayCommand,
  markBackCommand,
  resetUserAttendanceCommand,
  updateMyAttendanceCommand,
  updateUserAttendanceCommand,
} from "@/features/attendance/services/attendance.service";
import {
  getAuthenticatedSessionServer,
  requireAdmin,
} from "@/features/auth/servers/redirect.server";
import { getJstDateString } from "@/shared/lib/datetime";
import type { ActionResult } from "@/shared/types/action-result";
import { err, ok } from "@/shared/types/action-result";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が正しくありません。");
const isoDateTimeSchema = z.string().datetime();

const clockInInputSchema = z.object({
  style: z.enum(["office", "remote", "direct_visit"]),
});

const clockOutInputSchema = z.object({
  style: z.enum(["normal", "direct_return"]),
});

const getMyAttendanceInputSchema = z.object({
  date: dateSchema.optional(),
});

const updateAttendancePayloadSchema = z.object({
  clockIn: z
    .object({
      at: isoDateTimeSchema,
      style: z.enum(["office", "remote", "direct_visit"]),
    })
    .nullable()
    .optional(),
  clockOut: z
    .object({
      at: isoDateTimeSchema,
      style: z.enum(["normal", "direct_return"]),
    })
    .nullable()
    .optional(),
  awayPeriods: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        startedAt: isoDateTimeSchema,
        endedAt: isoDateTimeSchema,
      }),
    )
    .optional(),
});

const updateMyAttendanceInputSchema = updateAttendancePayloadSchema.extend({
  date: dateSchema,
});

const listAttendancesInputSchema = z.object({
  date: dateSchema,
});

const updateUserAttendanceInputSchema = updateAttendancePayloadSchema.extend({
  userId: z.string().min(1),
  date: dateSchema,
});

const resetUserAttendanceInputSchema = z.object({
  userId: z.string().min(1),
  date: dateSchema,
});

function toActionError<T>(error: unknown): ActionResult<T> {
  if (error instanceof AttendanceDomainError) {
    return err(error.code, error.message);
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

function revalidateAttendancePaths() {
  revalidatePath("/member/dashboard");
  revalidatePath("/admin/dashboard");
}

export async function getMyAttendanceQueryAction(
  input: unknown,
): Promise<ActionResult<AttendanceDTO>> {
  try {
    const session = await getAuthenticatedSessionServer();
    const parsed = getMyAttendanceInputSchema.parse(input);
    const attendance = await getMyAttendanceQuery(
      session.user.id,
      parsed.date ?? getJstDateString(),
    );

    return ok(attendance);
  } catch (error) {
    return toActionError(error);
  }
}

export async function clockInCommandAction(
  input: unknown,
): Promise<ActionResult<AttendanceDTO>> {
  try {
    const session = await getAuthenticatedSessionServer();
    const parsed = clockInInputSchema.parse(input);
    const attendance = await clockInCommand(session.user.id, parsed.style);
    revalidateAttendancePaths();

    return ok(attendance);
  } catch (error) {
    return toActionError(error);
  }
}

export async function clockOutCommandAction(
  input: unknown,
): Promise<ActionResult<AttendanceDTO>> {
  try {
    const session = await getAuthenticatedSessionServer();
    const parsed = clockOutInputSchema.parse(input);
    const attendance = await clockOutCommand(session.user.id, parsed.style);
    revalidateAttendancePaths();

    return ok(attendance);
  } catch (error) {
    return toActionError(error);
  }
}

export async function markAwayCommandAction(): Promise<
  ActionResult<AttendanceDTO>
> {
  try {
    const session = await getAuthenticatedSessionServer();
    const attendance = await markAwayCommand(session.user.id);
    revalidateAttendancePaths();

    return ok(attendance);
  } catch (error) {
    return toActionError(error);
  }
}

export async function markBackCommandAction(): Promise<
  ActionResult<AttendanceDTO>
> {
  try {
    const session = await getAuthenticatedSessionServer();
    const attendance = await markBackCommand(session.user.id);
    revalidateAttendancePaths();

    return ok(attendance);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateMyAttendanceCommandAction(
  input: unknown,
): Promise<ActionResult<AttendanceDTO>> {
  try {
    const session = await getAuthenticatedSessionServer();
    const parsed = updateMyAttendanceInputSchema.parse(input);
    const attendance = await updateMyAttendanceCommand(session.user.id, parsed);
    revalidateAttendancePaths();

    return ok(attendance);
  } catch (error) {
    return toActionError(error);
  }
}

export async function listAttendancesAction(
  input: unknown,
): Promise<ActionResult<AttendanceListItemDTO[]>> {
  try {
    await requireAdmin();
    const parsed = listAttendancesInputSchema.parse(input);
    const items = await listAttendancesQuery(parsed.date);

    return ok(items);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserAttendanceAction(
  input: unknown,
): Promise<ActionResult<AttendanceDTO>> {
  try {
    await requireAdmin();
    const parsed = updateUserAttendanceInputSchema.parse(input);
    const attendance = await updateUserAttendanceCommand(parsed.userId, {
      date: parsed.date,
      clockIn: parsed.clockIn,
      clockOut: parsed.clockOut,
      awayPeriods: parsed.awayPeriods,
    });
    revalidateAttendancePaths();

    return ok(attendance);
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetUserAttendanceAction(
  input: unknown,
): Promise<ActionResult<AttendanceDTO>> {
  try {
    await requireAdmin();
    const parsed = resetUserAttendanceInputSchema.parse(input);
    const attendance = await resetUserAttendanceCommand(
      parsed.userId,
      parsed.date,
    );
    revalidateAttendancePaths();

    return ok(attendance);
  } catch (error) {
    return toActionError(error);
  }
}
