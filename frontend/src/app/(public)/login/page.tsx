import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/external/db";
import { users } from "@/external/db/schema";
import { GuestLoginButtons } from "@/features/auth/components/client/GuestLoginButtons";
import { LoginForm } from "@/features/auth/components/client/LoginForm";
import { auth } from "@/features/auth/servers/auth";

async function redirectIfAuthenticated() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || user.deactivatedAt) {
    return;
  }

  if (user.mustChangePassword) {
    redirect("/password/initial");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  redirect("/member/dashboard");
}

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">ログイン</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            社員 ID とパスワードを入力してください。
          </p>
        </div>
        <LoginForm />
        <div className="border-t pt-6">
          <GuestLoginButtons />
        </div>
      </div>
    </div>
  );
}
