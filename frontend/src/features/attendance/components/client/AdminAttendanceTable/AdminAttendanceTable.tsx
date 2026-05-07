"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type {
  AttendanceDTO,
  AttendanceListItemDTO,
  UpdateAttendanceInput,
  UserSummaryDTO,
} from "@/external/dto/attendance.dto";
import {
  listAttendancesAction,
  resetUserAttendanceAction,
  updateUserAttendanceAction,
} from "@/features/attendance/actions/attendance.action";
import { AdminAttendanceRow } from "@/features/attendance/components/client/AdminAttendanceTable/AdminAttendanceRow";
import { DateNav } from "@/features/attendance/components/client/AdminAttendanceTable/DateNav";
import { ResetConfirmDialog } from "@/features/attendance/components/client/AdminAttendanceTable/ResetConfirmDialog";
import { AttendanceEditDialog } from "@/features/attendance/components/client/ClockPanel/AttendanceEditDialog";
import { attendanceKeys } from "@/features/attendance/queries/keys";

const POLL_INTERVAL_MS = 30_000;

type AdminAttendanceTableProps = {
  initialDate: string;
  initialItems: AttendanceListItemDTO[];
  today: string;
};

function buildPlaceholderAttendance(
  user: UserSummaryDTO,
  date: string,
): AttendanceDTO {
  const now = new Date().toISOString();
  return {
    id: `placeholder-${user.id}-${date}`,
    userId: user.id,
    date,
    status: "off",
    clockIn: null,
    clockOut: null,
    awayPeriods: [],
    createdAt: now,
    updatedAt: now,
  };
}

function assertResult<T>(
  result: { ok: true; data: T } | { ok: false; error: { message: string } },
) {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.data;
}

export function AdminAttendanceTable({
  initialDate,
  initialItems,
  today,
}: AdminAttendanceTableProps) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(initialDate);
  const [editTarget, setEditTarget] = useState<{
    user: UserSummaryDTO;
    attendance: AttendanceDTO;
  } | null>(null);
  const [resetTarget, setResetTarget] = useState<UserSummaryDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryKey = attendanceKeys.list(date);

  const listQuery = useQuery({
    queryKey,
    queryFn: async () => assertResult(await listAttendancesAction({ date })),
    initialData: date === initialDate ? initialItems : undefined,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const items = listQuery.data ?? [];

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateAttendanceInput & { userId: string }) => {
      return assertResult(await updateUserAttendanceAction(input));
    },
    onSuccess: () => {
      setEditTarget(null);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (input: { userId: string; date: string }) => {
      return assertResult(await resetUserAttendanceAction(input));
    },
    onSuccess: () => {
      setResetTarget(null);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const handleEdit = (item: AttendanceListItemDTO) => {
    setErrorMessage(null);
    setEditTarget({
      user: item.user,
      attendance:
        item.attendance ?? buildPlaceholderAttendance(item.user, date),
    });
  };

  const handleReset = (user: UserSummaryDTO) => {
    setErrorMessage(null);
    setResetTarget(user);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">全員の勤怠</h2>
        <DateNav date={date} today={today} onChange={setDate} />
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">社員ID</th>
              <th className="px-4 py-3 font-medium">名前</th>
              <th className="px-4 py-3 font-medium">勤務形態</th>
              <th className="px-4 py-3 font-medium">出勤</th>
              <th className="px-4 py-3 font-medium">退勤</th>
              <th className="px-4 py-3 font-medium">ステータス</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-muted-foreground"
                  colSpan={7}
                >
                  {listQuery.isLoading
                    ? "読み込み中..."
                    : "対象ユーザーがいません。"}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <AdminAttendanceRow
                  item={item}
                  key={item.user.id}
                  onEdit={handleEdit}
                  onReset={handleReset}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {listQuery.isFetching ? (
        <p className="text-xs text-muted-foreground">最新データを取得中...</p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {editTarget ? (
        <AttendanceEditDialog
          attendance={editTarget.attendance}
          isOpen
          isPending={updateMutation.isPending}
          targetLabel={`${editTarget.user.name}（${editTarget.user.employeeId}）`}
          onClose={() => setEditTarget(null)}
          onSave={(input) =>
            updateMutation.mutate({
              ...input,
              userId: editTarget.user.id,
            })
          }
        />
      ) : null}

      {resetTarget ? (
        <ResetConfirmDialog
          date={date}
          isPending={resetMutation.isPending}
          user={resetTarget}
          onCancel={() => setResetTarget(null)}
          onConfirm={() =>
            resetMutation.mutate({
              userId: resetTarget.id,
              date,
            })
          }
        />
      ) : null}
    </section>
  );
}
