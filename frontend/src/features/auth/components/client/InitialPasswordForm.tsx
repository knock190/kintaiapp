"use client";

import { useActionState } from "react";

import { changeInitialPasswordAction } from "@/features/auth/actions/change-initial-password.action";
import { Button } from "@/shared/ui/button";

export function InitialPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changeInitialPasswordAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="currentPassword">
          現在のパスワード
        </label>
        <input
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="newPassword">
          新しいパスワード
        </label>
        <input
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          htmlFor="newPasswordConfirmation"
        >
          新しいパスワード確認
        </label>
        <input
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          id="newPasswordConfirmation"
          name="newPasswordConfirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "変更中" : "パスワードを変更"}
      </Button>
    </form>
  );
}
