import { redirect } from "next/navigation";

import { InitialPasswordForm } from "@/features/auth/components/client/InitialPasswordForm";
import { getAuthenticatedSessionServer } from "@/features/auth/servers/redirect.server";

export default async function InitialPasswordPage() {
  const session = await getAuthenticatedSessionServer();

  if (!session.user.mustChangePassword) {
    if (session.user.role === "admin") {
      redirect("/admin/dashboard");
    }

    redirect("/member/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">初回パスワード変更</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            運用開始前に初期パスワードを変更してください。
          </p>
        </div>
        <InitialPasswordForm />
      </div>
    </div>
  );
}
