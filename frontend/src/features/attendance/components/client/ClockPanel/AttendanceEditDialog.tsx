"use client";

import { useEffect, useState } from "react";

import type {
  AttendanceDTO,
  ClockInStyle,
  ClockOutStyle,
  UpdateAttendanceInput,
} from "@/external/dto/attendance.dto";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

type EditableAwayPeriod = {
  id?: string;
  startedAt: string;
  endedAt: string;
};

type AttendanceEditDialogProps = {
  attendance: AttendanceDTO;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onSave: (input: UpdateAttendanceInput) => void;
  targetLabel?: string;
};

export function AttendanceEditDialog({
  attendance,
  isOpen,
  isPending,
  onClose,
  onSave,
  targetLabel,
}: AttendanceEditDialogProps) {
  const [clockInAt, setClockInAt] = useState("");
  const [clockInStyle, setClockInStyle] = useState<ClockInStyle>("office");
  const [clockOutAt, setClockOutAt] = useState("");
  const [clockOutStyle, setClockOutStyle] = useState<ClockOutStyle>("normal");
  const [awayPeriods, setAwayPeriods] = useState<EditableAwayPeriod[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setClockInAt(toDateTimeLocalValue(attendance.clockIn?.at));
    setClockInStyle(attendance.clockIn?.style ?? "office");
    setClockOutAt(toDateTimeLocalValue(attendance.clockOut?.at));
    setClockOutStyle(attendance.clockOut?.style ?? "normal");
    setAwayPeriods(
      attendance.awayPeriods
        .filter((period) => period.endedAt)
        .map((period) => ({
          id: period.id,
          startedAt: toDateTimeLocalValue(period.startedAt),
          endedAt: toDateTimeLocalValue(period.endedAt),
        })),
    );
    setFormError(null);
  }, [attendance, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    try {
      const clockInIso = fromDateTimeLocalValue(clockInAt);
      const clockOutIso = fromDateTimeLocalValue(clockOutAt);

      if (!clockInIso && (clockOutIso || awayPeriods.length > 0)) {
        setFormError(
          "出勤時刻がない場合、退勤時刻と離業期間は登録できません。",
        );
        return;
      }

      const parsedAwayPeriods = awayPeriods.map((period) => {
        const startedAt = fromDateTimeLocalValue(period.startedAt);
        const endedAt = fromDateTimeLocalValue(period.endedAt);
        if (!startedAt || !endedAt) {
          throw new Error("離業期間の開始・終了時刻を入力してください。");
        }

        return {
          id: period.id,
          startedAt,
          endedAt,
        };
      });

      onSave({
        date: attendance.date,
        clockIn: clockInIso ? { at: clockInIso, style: clockInStyle } : null,
        clockOut: clockOutIso
          ? { at: clockOutIso, style: clockOutStyle }
          : null,
        awayPeriods: parsedAwayPeriods,
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "入力内容を確認してください。",
      );
    }
  };

  const updateAwayPeriod = (
    index: number,
    patch: Partial<EditableAwayPeriod>,
  ) => {
    setAwayPeriods((current) =>
      current.map((period, periodIndex) =>
        periodIndex === index ? { ...period, ...patch } : period,
      ),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold">
              {targetLabel ? `打刻情報を修正 - ${targetLabel}` : "打刻情報修正"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {attendance.date}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            閉じる
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="clockInAt">
              出勤時刻
            </label>
            <input
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              id="clockInAt"
              type="datetime-local"
              value={clockInAt}
              onChange={(event) => setClockInAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="clockInStyle">
              出勤形態
            </label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              id="clockInStyle"
              value={clockInStyle}
              onChange={(event) =>
                setClockInStyle(event.target.value as ClockInStyle)
              }
            >
              <option value="office">出社</option>
              <option value="remote">在宅勤務</option>
              <option value="direct_visit">直行</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="clockOutAt">
              退勤時刻
            </label>
            <input
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              id="clockOutAt"
              type="datetime-local"
              value={clockOutAt}
              onChange={(event) => setClockOutAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="clockOutStyle">
              退勤形態
            </label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              id="clockOutStyle"
              value={clockOutStyle}
              onChange={(event) =>
                setClockOutStyle(event.target.value as ClockOutStyle)
              }
            >
              <option value="normal">通常</option>
              <option value="direct_return">直帰</option>
            </select>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">離業期間</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAwayPeriods((current) => [
                  ...current,
                  { startedAt: "", endedAt: "" },
                ])
              }
            >
              追加
            </Button>
          </div>

          {awayPeriods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              クローズ済みの離業期間はありません。
            </p>
          ) : (
            awayPeriods.map((period, index) => {
              const key = period.id ?? `new-${index}`;
              const startedAtId = `away-started-at-${key}`;
              const endedAtId = `away-ended-at-${key}`;

              return (
                <div
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-md border p-3"
                  key={key}
                >
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor={startedAtId}
                    >
                      開始
                    </label>
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      id={startedAtId}
                      type="datetime-local"
                      value={period.startedAt}
                      onChange={(event) =>
                        updateAwayPeriod(index, {
                          startedAt: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={endedAtId}>
                      終了
                    </label>
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      id={endedAtId}
                      type="datetime-local"
                      value={period.endedAt}
                      onChange={(event) =>
                        updateAwayPeriod(index, { endedAt: event.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setAwayPeriods((current) =>
                        current.filter(
                          (_, periodIndex) => periodIndex !== index,
                        ),
                      )
                    }
                  >
                    削除
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {formError ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button disabled={isPending} type="button" onClick={handleSave}>
            {isPending ? "保存中" : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}
