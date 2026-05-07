"use client";

import { X } from "lucide-react";
import { type FormEvent, useState } from "react";

import type { UserRole } from "@/external/dto/user.dto";
import { Button } from "@/shared/ui/button";

type UserCreateInput = {
  employeeId: string;
  name: string;
  role: UserRole;
  initialPassword: string;
};

type UserCreateDialogProps = {
  fieldErrors?: Record<string, string[]>;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: UserCreateInput) => void;
};

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-destructive">{message}</p>
  ) : null;
}

export function UserCreateDialog({
  fieldErrors,
  isPending,
  onClose,
  onSubmit,
}: UserCreateDialogProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [initialPassword, setInitialPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ employeeId, name, role, initialPassword });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <form
        className="w-full max-w-lg rounded-md border bg-card p-5 shadow-lg"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">新規ユーザー作成</h2>
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

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            社員 ID
            <input
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={isPending}
              onChange={(event) => setEmployeeId(event.target.value)}
              value={employeeId}
            />
            <FieldError message={fieldErrors?.employeeId?.[0]} />
          </label>

          <label className="block text-sm font-medium">
            名前
            <input
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={isPending}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
            <FieldError message={fieldErrors?.name?.[0]} />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">ロール</legend>
            <div className="flex flex-wrap gap-3">
              {(["member", "admin"] as const).map((value) => (
                <label
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  key={value}
                >
                  <input
                    checked={role === value}
                    disabled={isPending}
                    name="role"
                    onChange={() => setRole(value)}
                    type="radio"
                  />
                  {value === "admin" ? "管理者" : "メンバー"}
                </label>
              ))}
            </div>
            <FieldError message={fieldErrors?.role?.[0]} />
          </fieldset>

          <label className="block text-sm font-medium">
            初期パスワード
            <input
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={isPending}
              onChange={(event) => setInitialPassword(event.target.value)}
              type="password"
              value={initialPassword}
            />
            <FieldError message={fieldErrors?.initialPassword?.[0]} />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            disabled={isPending}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            キャンセル
          </Button>
          <Button disabled={isPending} type="submit">
            {isPending ? "作成中..." : "作成"}
          </Button>
        </div>
      </form>
    </div>
  );
}
