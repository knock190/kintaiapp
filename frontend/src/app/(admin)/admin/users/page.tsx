import { requireAdmin } from "@/features/auth/servers/redirect.server";
import { AdminUsersTable } from "@/features/users/components/client/AdminUsersTable";
import { listUsersQuery } from "@/features/users/services/user.service";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const initialUsers = await listUsersQuery();

  return <AdminUsersTable initialUsers={initialUsers} />;
}
