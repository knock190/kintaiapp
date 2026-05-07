import { and, eq } from "drizzle-orm";

import { db } from "@/external/db";
import {
  attendances,
  awayPeriods as awayPeriodsTable,
} from "@/external/db/schema";
import type {
  AttendanceDTO,
  ClockInStyle,
  ClockOutStyle,
  UpdateAttendanceInput,
} from "@/external/dto/attendance.dto";
import {
  Attendance,
  AttendanceDomainError,
} from "@/features/attendance/domain/Attendance";
import { getJstDateString } from "@/shared/lib/datetime";

type AttendanceRow = typeof attendances.$inferSelect;
type AwayPeriodRow = typeof awayPeriodsTable.$inferSelect;

function serializeAttendance(
  attendance: AttendanceRow,
  awayPeriods: AwayPeriodRow[],
): AttendanceDTO {
  return {
    id: attendance.id,
    userId: attendance.userId,
    date: attendance.attendanceDate,
    status: attendance.status as AttendanceDTO["status"],
    clockIn:
      attendance.clockInAt && attendance.clockInStyle
        ? {
            at: attendance.clockInAt.toISOString(),
            style: attendance.clockInStyle as ClockInStyle,
          }
        : null,
    clockOut:
      attendance.clockOutAt && attendance.clockOutStyle
        ? {
            at: attendance.clockOutAt.toISOString(),
            style: attendance.clockOutStyle as ClockOutStyle,
          }
        : null,
    awayPeriods: awayPeriods
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map((period) => ({
        id: period.id,
        startedAt: period.startedAt.toISOString(),
        endedAt: period.endedAt?.toISOString() ?? null,
      })),
    createdAt: attendance.createdAt.toISOString(),
    updatedAt: attendance.updatedAt.toISOString(),
  };
}

async function findAttendance(userId: string, date: string) {
  const attendance = await db.query.attendances.findFirst({
    where: and(
      eq(attendances.userId, userId),
      eq(attendances.attendanceDate, date),
    ),
  });

  if (!attendance) {
    return null;
  }

  const periods = await db.query.awayPeriods.findMany({
    where: eq(awayPeriodsTable.attendanceId, attendance.id),
  });

  return serializeAttendance(attendance, periods);
}

async function ensureAttendance(userId: string, date: string) {
  const existing = await findAttendance(userId, date);
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(attendances)
    .values({
      userId,
      attendanceDate: date,
      status: "off",
    })
    .returning();

  return serializeAttendance(created, []);
}

async function persistAttendance(attendance: AttendanceDTO) {
  const now = new Date(attendance.updatedAt);

  await db.transaction(async (tx) => {
    await tx
      .update(attendances)
      .set({
        status: attendance.status,
        clockInAt: attendance.clockIn ? new Date(attendance.clockIn.at) : null,
        clockInStyle: attendance.clockIn?.style ?? null,
        clockOutAt: attendance.clockOut
          ? new Date(attendance.clockOut.at)
          : null,
        clockOutStyle: attendance.clockOut?.style ?? null,
        updatedAt: now,
      })
      .where(eq(attendances.id, attendance.id));

    await tx
      .delete(awayPeriodsTable)
      .where(eq(awayPeriodsTable.attendanceId, attendance.id));

    if (attendance.awayPeriods.length > 0) {
      await tx.insert(awayPeriodsTable).values(
        attendance.awayPeriods.map((period) => ({
          id: period.id,
          attendanceId: attendance.id,
          startedAt: new Date(period.startedAt),
          endedAt: period.endedAt ? new Date(period.endedAt) : null,
          updatedAt: now,
        })),
      );
    }
  });

  return attendance;
}

function toDomainError(error: unknown) {
  if (error instanceof AttendanceDomainError) {
    return error;
  }

  throw error;
}

async function mutateAttendance(
  userId: string,
  date: string,
  mutate: (attendance: Attendance) => void,
) {
  try {
    const dto = await ensureAttendance(userId, date);
    const attendance = new Attendance(dto);
    mutate(attendance);

    return await persistAttendance(attendance.toDTO());
  } catch (error) {
    throw toDomainError(error);
  }
}

export async function getMyAttendanceQuery(userId: string, date: string) {
  return ensureAttendance(userId, date);
}

export async function clockInCommand(
  userId: string,
  style: ClockInStyle,
  now = new Date(),
) {
  return mutateAttendance(userId, getJstDateString(now), (attendance) => {
    attendance.clockIn(now, style);
  });
}

export async function clockOutCommand(
  userId: string,
  style: ClockOutStyle,
  now = new Date(),
) {
  return mutateAttendance(userId, getJstDateString(now), (attendance) => {
    attendance.clockOut(now, style);
  });
}

export async function markAwayCommand(userId: string, now = new Date()) {
  return mutateAttendance(userId, getJstDateString(now), (attendance) => {
    attendance.markAway(now);
  });
}

export async function markBackCommand(userId: string, now = new Date()) {
  return mutateAttendance(userId, getJstDateString(now), (attendance) => {
    attendance.markBack(now);
  });
}

export async function updateMyAttendanceCommand(
  userId: string,
  input: UpdateAttendanceInput,
) {
  return mutateAttendance(userId, input.date, (attendance) => {
    attendance.update({
      clockIn: input.clockIn,
      clockOut: input.clockOut,
      awayPeriods: input.awayPeriods,
    });
  });
}
