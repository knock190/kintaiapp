"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/external/db";
import { auth } from "@/features/auth/servers/auth";
import { employeeIdToEmail } from "@/features/auth/utils/employee-email";

type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const employeeId = String(formData.get("employeeId") ?? "");
  const password = String(formData.get("password") ?? "");

  let email: string;
  try {
    email = employeeIdToEmail(employeeId);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "社員 ID またはパスワードが正しくありません。",
    };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    });
  } catch {
    return { error: "社員 ID またはパスワードが正しくありません。" };
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (!user) {
    return { error: "社員 ID またはパスワードが正しくありません。" };
  }

  if (user.mustChangePassword) {
    redirect("/password/initial");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  redirect("/member/dashboard");
}
