"use client";

import { KeyRound, UserX, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import type { UserDTO } from "@/external/dto/user.dto";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

type UserEditDialogProps = {
  fieldErrors?: Record<string, string[]>;
  isDeactivatePending: boolean;
  isReissuePending: boolean;
  onClose: () => void;
  onDeactivate: () => void;
  onReissuePassword: (newPassword: string) => void;
  user: UserDTO;
};

export function UserEditDialog({
  fieldErrors,
  isDeactivatePending,
  isReissuePending,
  onClose,
  onDeactivate,
  onReissuePassword,
  user,
}: UserEditDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [isDeactivateConfirming, setIsDeactivateConfirming] = useState(false);
  const isPending = isDeactivatePending || isReissuePending;

  const handleReissue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onReissuePassword(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-lg rounded-md border bg-card p-5 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            ユーザー編集 - {user.name}（{user.employeeId}）
          </h2>
          <Button
            aria-label="閉じる"
            disabled={isPending}
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 grid gap-3 rounded-md bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">ロール</span>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role === "admin" ? "管理者" : "メンバー"}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">状態</span>
            <Badge variant={user.isActive ? "outline" : "destructive"}>
              {user.isActive ? "有効" : "無効"}
            </Badge>
          </div>
        </div>

        <form className="mt-5 border-t pt-5" onSubmit={handleReissue}>
          <h3 className="text-sm font-semibold">パスワード再発行</h3>
          <label className="mt-3 block text-sm font-medium">
            新しいパスワード
            <input
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={isPending}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </label>
          {fieldErrors?.newPassword?.[0] ? (
            <p className="mt-1 text-xs text-destructive">
              {fieldErrors.newPassword[0]}
            </p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <Button disabled={isPending || !user.isActive} type="submit">
              <KeyRound className="h-4 w-4" />
              {isReissuePending ? "再発行中..." : "パスワードを再発行"}
            </Button>
          </div>
        </form>

        <div className="mt-5 border-t pt-5">
          <h3 className="text-sm font-semibold">アカウント無効化</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            無効化するとログイン不可になります。過去の勤怠データは保持されます。
          </p>
          {isDeactivateConfirming ? (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                このアカウントを無効化しますか。
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  disabled={isPending}
                  onClick={() => setIsDeactivateConfirming(false)}
                  type="button"
                  variant="outline"
                >
                  キャンセル
                </Button>
                <Button
                  disabled={isPending}
                  onClick={onDeactivate}
                  type="button"
                  variant="destructive"
                >
                  {isDeactivatePending ? "無効化中..." : "無効化する"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex justify-end">
              <Button
                disabled={isPending || !user.isActive}
                onClick={() => setIsDeactivateConfirming(true)}
                type="button"
                variant="destructive"
              >
                <UserX className="h-4 w-4" />
                アカウントを無効化
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            disabled={isPending}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
