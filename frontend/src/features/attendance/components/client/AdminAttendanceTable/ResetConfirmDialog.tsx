"use client";

import type { UserSummaryDTO } from "@/external/dto/attendance.dto";
import { Button } from "@/shared/ui/button";

type ResetConfirmDialogProps = {
  user: UserSummaryDTO;
  date: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ResetConfirmDialog({
  user,
  date,
  isPending,
  onCancel,
  onConfirm,
}: ResetConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div
        aria-labelledby="reset-confirm-title"
        aria-modal="true"
        className="w-full max-w-md rounded-md bg-card p-6 shadow-lg"
        role="alertdialog"
      >
        <h2 className="text-lg font-semibold" id="reset-confirm-title">
          打刻データをリセットしますか?
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {user.name}（{user.employeeId}）の {date}{" "}
          の打刻情報をクリアし、未出勤状態（休み）に戻します。
          勤怠レコード自体は保持されます。この操作は取り消せません。
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            disabled={isPending}
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            キャンセル
          </Button>
          <Button disabled={isPending} type="button" onClick={onConfirm}>
            {isPending ? "リセット中" : "リセット"}
          </Button>
        </div>
      </div>
    </div>
  );
}
