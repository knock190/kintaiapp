import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedSessionServer } from "@/features/auth/servers/redirect.server";
import { Header } from "@/shared/ui/Header";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthenticatedSessionServer();

  if (session.user.mustChangePassword) {
    redirect("/password/initial");
  }

  if (session.user.role !== "admin") {
    redirect("/member/dashboard");
  }

  return (
    <>
      <Header userName={session.user.name} userRole={session.user.role} />
      <div className="border-b bg-card">
        <nav className="mx-auto flex max-w-6xl gap-4 px-6 py-3 text-sm">
          <Link href="/admin/dashboard" className="font-medium">
            ダッシュボード
          </Link>
          <Link href="/admin/users" className="font-medium">
            ユーザー管理
          </Link>
        </nav>
      </div>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
