import { z } from "zod";

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が正しくありません。");

export const isoDateTimeSchema = z.string().datetime();

export const clockInInputSchema = z.object({
  style: z.enum(["office", "remote", "direct_visit"]),
});

export const clockOutInputSchema = z.object({
  style: z.enum(["normal", "direct_return"]),
});

export const getMyAttendanceInputSchema = z.object({
  date: dateSchema.optional(),
});

export const updateAttendancePayloadSchema = z.object({
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

export const updateMyAttendanceInputSchema =
  updateAttendancePayloadSchema.extend({
    date: dateSchema,
  });

export const listAttendancesInputSchema = z.object({
  date: dateSchema,
});

export const updateUserAttendanceInputSchema =
  updateAttendancePayloadSchema.extend({
    userId: z.string().min(1),
    date: dateSchema,
  });

export const resetUserAttendanceInputSchema = z.object({
  userId: z.string().min(1),
  date: dateSchema,
});
