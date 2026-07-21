"use client";

import { useState, useTransition } from "react";

import {
  type GuestRole,
  guestLoginAction,
} from "@/features/auth/actions/guest-login.action";
import { Button } from "@/shared/ui/button";

export function GuestLoginButtons() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(undefined);

  const handleClick = (role: GuestRole) => {
    setError(undefined);
    startTransition(async () => {
      const result = await guestLoginAction(role);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        アカウントを持っていない方は、ゲストとして体験できます。
      </p>
      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={isPending}
          onClick={() => handleClick("member")}
          type="button"
          variant="outline"
        >
          ゲスト（メンバー）
        </Button>
        <Button
          className="flex-1"
          disabled={isPending}
          onClick={() => handleClick("admin")}
          type="button"
          variant="outline"
        >
          ゲスト（管理者）
        </Button>
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
