import { redirect } from "next/navigation";
import { getAuthenticatedSessionServer } from "@/features/auth/servers/redirect.server";
import { Header } from "@/shared/ui/Header";

export default async function MemberLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthenticatedSessionServer();

  if (session.user.mustChangePassword) {
    redirect("/password/initial");
  }

  return (
    <>
      <Header userName={session.user.name} userRole={session.user.role} />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
