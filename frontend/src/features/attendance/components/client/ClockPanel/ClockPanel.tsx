"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type {
  AttendanceDTO,
  ClockInStyle,
  ClockOutStyle,
  UpdateAttendanceInput,
} from "@/external/dto/attendance.dto";
import {
  clockInCommandAction,
  clockOutCommandAction,
  getMyAttendanceQueryAction,
  markAwayCommandAction,
  markBackCommandAction,
  updateMyAttendanceCommandAction,
} from "@/features/attendance/actions/attendance.action";
import { AttendanceEditDialog } from "@/features/attendance/components/client/ClockPanel/AttendanceEditDialog";
import { attendanceKeys } from "@/features/attendance/queries/keys";
import { formatJstDateTime, formatJstTime } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { WorkStylePill } from "@/shared/ui/WorkStylePill";

type ClockPanelProps = {
  initialAttendance: AttendanceDTO;
  date: string;
};

type MutationContext = {
  previousAttendance?: AttendanceDTO;
};

function assertResult(
  result: Awaited<ReturnType<typeof getMyAttendanceQueryAction>>,
) {
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export function ClockPanel({ initialAttendance, date }: ClockPanelProps) {
  const queryClient = useQueryClient();
  const queryKey = attendanceKeys.my(date);
  const [clockInStyle, setClockInStyle] = useState<ClockInStyle>("office");
  const [clockOutStyle, setClockOutStyle] = useState<ClockOutStyle>("normal");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const attendanceQuery = useQuery({
    queryKey,
    queryFn: async () =>
      assertResult(await getMyAttendanceQueryAction({ date })),
    initialData: initialAttendance,
  });

  const attendance = attendanceQuery.data;

  const mutationOptions = useMemo(
    () => ({
      onMutate: async (optimisticAttendance: AttendanceDTO) => {
        await queryClient.cancelQueries({ queryKey });
        const previousAttendance =
          queryClient.getQueryData<AttendanceDTO>(queryKey);
        queryClient.setQueryData(queryKey, optimisticAttendance);
        setErrorMessage(null);

        return { previousAttendance };
      },
      onError: (
        error: Error,
        _variables: unknown,
        context?: MutationContext,
      ) => {
        if (context?.previousAttendance) {
          queryClient.setQueryData(queryKey, context.previousAttendance);
        }
        setErrorMessage(error.message);
      },
      onSuccess: (result: AttendanceDTO) => {
        queryClient.setQueryData(queryKey, result);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }),
    [queryClient, queryKey],
  );

  const clockInMutation = useMutation({
    mutationFn: async (style: ClockInStyle) => {
      const result = await clockInCommandAction({ style });
      return assertResult(result);
    },
    onMutate: (style) =>
      mutationOptions.onMutate({
        ...attendance,
        status: "working",
        clockIn: { at: new Date().toISOString(), style },
        updatedAt: new Date().toISOString(),
      }),
    onError: mutationOptions.onError,
    onSuccess: mutationOptions.onSuccess,
    onSettled: mutationOptions.onSettled,
  });

  const clockOutMutation = useMutation({
    mutationFn: async (style: ClockOutStyle) => {
      const result = await clockOutCommandAction({ style });
      return assertResult(result);
    },
    onMutate: (style) =>
      mutationOptions.onMutate({
        ...attendance,
        status: "done",
        clockOut: { at: new Date().toISOString(), style },
        awayPeriods: attendance.awayPeriods.map((period) =>
          period.endedAt
            ? period
            : { ...period, endedAt: new Date().toISOString() },
        ),
        updatedAt: new Date().toISOString(),
      }),
    onError: mutationOptions.onError,
    onSuccess: mutationOptions.onSuccess,
    onSettled: mutationOptions.onSettled,
  });

  const markAwayMutation = useMutation({
    mutationFn: async () => {
      const result = await markAwayCommandAction();
      return assertResult(result);
    },
    onMutate: () =>
      mutationOptions.onMutate({
        ...attendance,
        status: "away",
        awayPeriods: [
          ...attendance.awayPeriods,
          {
            id: crypto.randomUUID(),
            startedAt: new Date().toISOString(),
            endedAt: null,
          },
        ],
        updatedAt: new Date().toISOString(),
      }),
    onError: mutationOptions.onError,
    onSuccess: mutationOptions.onSuccess,
    onSettled: mutationOptions.onSettled,
  });

  const markBackMutation = useMutation({
    mutationFn: async () => {
      const result = await markBackCommandAction();
      return assertResult(result);
    },
    onMutate: () =>
      mutationOptions.onMutate({
        ...attendance,
        status: "working",
        awayPeriods: attendance.awayPeriods.map((period) =>
          period.endedAt
            ? period
            : { ...period, endedAt: new Date().toISOString() },
        ),
        updatedAt: new Date().toISOString(),
      }),
    onError: mutationOptions.onError,
    onSuccess: mutationOptions.onSuccess,
    onSettled: mutationOptions.onSettled,
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateAttendanceInput) => {
      const result = await updateMyAttendanceCommandAction(input);
      return assertResult(result);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
      setIsEditOpen(false);
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const isPending =
    clockInMutation.isPending ||
    clockOutMutation.isPending ||
    markAwayMutation.isPending ||
    markBackMutation.isPending ||
    updateMutation.isPending;

  return (
    <section className="space-y-4">
      <div className="rounded-md border bg-card p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={attendance.status} />
              {attendance.clockIn ? (
                <WorkStylePill style={attendance.clockIn.style} />
              ) : null}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">あなたのステータス</h1>
              <p className="mt-1 text-sm text-muted-foreground">{date}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditOpen(true)}
          >
            修正
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-md bg-muted p-4">
            <p className="text-muted-foreground">出勤時刻</p>
            <p className="mt-2 text-lg font-semibold">
              {formatJstTime(attendance.clockIn?.at)}
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="text-muted-foreground">退勤時刻</p>
            <p className="mt-2 text-lg font-semibold">
              {formatJstTime(attendance.clockOut?.at)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold">離業履歴</h2>
          <div className="mt-3 space-y-2 text-sm">
            {attendance.awayPeriods.length === 0 ? (
              <p className="text-muted-foreground">離業履歴はありません。</p>
            ) : (
              attendance.awayPeriods.map((period) => (
                <div
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                  key={period.id}
                >
                  <span>
                    {formatJstDateTime(period.startedAt)} -{" "}
                    {period.endedAt
                      ? formatJstDateTime(period.endedAt)
                      : "離業中"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {attendance.status === "off" ? (
            <>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={clockInStyle}
                onChange={(event) =>
                  setClockInStyle(event.target.value as ClockInStyle)
                }
              >
                <option value="office">出社</option>
                <option value="remote">在宅勤務</option>
                <option value="direct_visit">直行</option>
              </select>
              <Button
                disabled={isPending}
                type="button"
                onClick={() => clockInMutation.mutate(clockInStyle)}
              >
                出勤打刻
              </Button>
            </>
          ) : null}

          {attendance.status === "working" ? (
            <Button
              disabled={isPending}
              type="button"
              variant="outline"
              onClick={() => markAwayMutation.mutate(undefined)}
            >
              離業
            </Button>
          ) : null}

          {attendance.status === "away" ? (
            <Button
              disabled={isPending}
              type="button"
              variant="outline"
              onClick={() => markBackMutation.mutate(undefined)}
            >
              業務復帰
            </Button>
          ) : null}

          {attendance.status === "working" || attendance.status === "away" ? (
            <>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={clockOutStyle}
                onChange={(event) =>
                  setClockOutStyle(event.target.value as ClockOutStyle)
                }
              >
                <option value="normal">通常</option>
                <option value="direct_return">直帰</option>
              </select>
              <Button
                disabled={isPending}
                type="button"
                onClick={() => clockOutMutation.mutate(clockOutStyle)}
              >
                退勤打刻
              </Button>
            </>
          ) : null}
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <AttendanceEditDialog
        attendance={attendance}
        isOpen={isEditOpen}
        isPending={updateMutation.isPending}
        onClose={() => setIsEditOpen(false)}
        onSave={(input) => updateMutation.mutate(input)}
      />
    </section>
  );
}
