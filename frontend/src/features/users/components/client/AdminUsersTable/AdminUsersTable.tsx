"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, UserPlus } from "lucide-react";
import { useState } from "react";

import type { UserDTO, UserRole } from "@/external/dto/user.dto";
import {
  createUserAction,
  deactivateUserAction,
  listUsersAction,
  reissuePasswordAction,
} from "@/features/users/actions/user.action";
import { UserCreateDialog } from "@/features/users/components/client/AdminUsersTable/UserCreateDialog";
import { UserEditDialog } from "@/features/users/components/client/AdminUsersTable/UserEditDialog";
import { userKeys } from "@/features/users/queries/keys";
import type { ActionError } from "@/shared/types/action-result";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

type AdminUsersTableProps = {
  initialUsers: UserDTO[];
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

function assertResult<T>(
  result: { ok: true; data: T } | { ok: false; error: ActionError },
) {
  if (!result.ok) {
    const error = new Error(result.error.message) as Error & {
      fieldErrors?: Record<string, string[]>;
    };
    error.fieldErrors = result.error.fieldErrors;
    throw error;
  }

  return result.data;
}

function getFieldErrors(error: unknown) {
  if (error && typeof error === "object" && "fieldErrors" in error) {
    return error.fieldErrors as Record<string, string[]> | undefined;
  }

  return undefined;
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"}>
      {role === "admin" ? "管理者" : "メンバー"}
    </Badge>
  );
}

export function AdminUsersTable({ initialUsers }: AdminUsersTableProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserDTO | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[]> | undefined
  >();

  const query = useQuery({
    queryKey: userKeys.list(),
    queryFn: async () => assertResult(await listUsersAction({})),
    initialData: initialUsers,
  });

  const users = query.data ?? [];

  const createMutation = useMutation({
    mutationFn: async (input: {
      employeeId: string;
      name: string;
      role: UserRole;
      initialPassword: string;
    }) => assertResult(await createUserAction(input)),
    onSuccess: () => {
      setIsCreateOpen(false);
      setFieldErrors(undefined);
      setToast({ type: "success", message: "ユーザーを作成しました。" });
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
    onError: (error: Error) => {
      setFieldErrors(getFieldErrors(error));
      setToast({ type: "error", message: error.message });
    },
  });

  const reissueMutation = useMutation({
    mutationFn: async (input: { userId: string; newPassword: string }) =>
      assertResult(await reissuePasswordAction(input)),
    onSuccess: () => {
      setFieldErrors(undefined);
      setToast({ type: "success", message: "パスワードを再発行しました。" });
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
    onError: (error: Error) => {
      setFieldErrors(getFieldErrors(error));
      setToast({ type: "error", message: error.message });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (input: { userId: string }) =>
      assertResult(await deactivateUserAction(input)),
    onSuccess: () => {
      setEditTarget(null);
      setFieldErrors(undefined);
      setToast({ type: "success", message: "アカウントを無効化しました。" });
      queryClient.invalidateQueries({ queryKey: userKeys.list() });
    },
    onError: (error: Error) => {
      setToast({ type: "error", message: error.message });
    },
  });

  const openCreate = () => {
    setFieldErrors(undefined);
    setToast(null);
    setIsCreateOpen(true);
  };

  const openEdit = (user: UserDTO) => {
    setFieldErrors(undefined);
    setToast(null);
    setEditTarget(user);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ユーザー管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            アカウントの発行、パスワード再発行、無効化を行います。
          </p>
        </div>
        <Button onClick={openCreate} type="button">
          <UserPlus className="h-4 w-4" />
          新規ユーザー作成
        </Button>
      </div>

      {toast ? (
        <div
          className={
            toast.type === "success"
              ? "rounded-md border border-accent bg-accent/30 px-3 py-2 text-sm"
              : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {toast.message}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">社員ID</th>
              <th className="px-4 py-3 font-medium">名前</th>
              <th className="px-4 py-3 font-medium">ロール</th>
              <th className="px-4 py-3 font-medium">状態</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-muted-foreground"
                  colSpan={5}
                >
                  {query.isLoading ? "読み込み中..." : "ユーザーがいません。"}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr className="border-t" key={user.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {user.employeeId}
                  </td>
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "outline" : "destructive"}>
                      {user.isActive ? "有効" : "無効"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      onClick={() => openEdit(user)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Edit3 className="h-4 w-4" />
                      編集
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {query.isFetching ? (
        <p className="text-xs text-muted-foreground">最新データを取得中...</p>
      ) : null}

      {isCreateOpen ? (
        <UserCreateDialog
          fieldErrors={fieldErrors}
          isPending={createMutation.isPending}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={(input) => createMutation.mutate(input)}
        />
      ) : null}

      {editTarget ? (
        <UserEditDialog
          fieldErrors={fieldErrors}
          isDeactivatePending={deactivateMutation.isPending}
          isReissuePending={reissueMutation.isPending}
          onClose={() => setEditTarget(null)}
          onDeactivate={() =>
            deactivateMutation.mutate({ userId: editTarget.id })
          }
          onReissuePassword={(newPassword) =>
            reissueMutation.mutate({ userId: editTarget.id, newPassword })
          }
          user={editTarget}
        />
      ) : null}
    </section>
  );
}
