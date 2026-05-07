"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AttendanceDTO } from "@/external/dto/attendance.dto";
import { AttendanceDomainError } from "@/features/attendance/domain/Attendance";
import {
  clockInCommand,
  clockOutCommand,
  getMyAttendanceQuery,
  markAwayCommand,
  markBackCommand,
  updateMyAttendanceCommand,
} from "@/features/attendance/services/attendance.service";
import { getAuthenticatedSessionServer } from "@/features/auth/servers/redirect.server";
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

const updateMyAttendanceInputSchema = z.object({
  date: dateSchema,
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

function toActionError(error: unknown): ActionResult<AttendanceDTO> {
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
