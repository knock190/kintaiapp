"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/external/db";
import { users } from "@/external/db/schema";
import { auth } from "@/features/auth/servers/auth";
import { getAuthenticatedSessionServer } from "@/features/auth/servers/redirect.server";

type InitialPasswordState = {
  error?: string;
};

export async function changeInitialPasswordAction(
  _prevState: InitialPasswordState,
  formData: FormData,
): Promise<InitialPasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirmation = String(
    formData.get("newPasswordConfirmation") ?? "",
  );

  if (newPassword.length < 8) {
    return { error: "新しいパスワードは 8 文字以上で入力してください。" };
  }

  if (newPassword !== newPasswordConfirmation) {
    return { error: "新しいパスワードが一致しません。" };
  }

  const session = await getAuthenticatedSessionServer();

  try {
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    return { error: "現在のパスワードが正しくありません。" };
  }

  await db
    .update(users)
    .set({
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  if (session.user.role === "admin") {
    redirect("/admin/dashboard");
  }

  redirect("/member/dashboard");
}
