import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/external/db";
import { users } from "@/external/db/schema";
import { auth } from "@/features/auth/servers/auth";
import type {
  AuthenticatedSession,
  AuthenticatedUser,
  UserRole,
} from "@/features/auth/types";

function assertUserRole(value: string): UserRole {
  if (value === "admin" || value === "member") {
    return value;
  }

  return "member";
}

export async function getAuthenticatedSessionServer(): Promise<AuthenticatedSession> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser || dbUser.deactivatedAt) {
    await auth.api.signOut({
      headers: await headers(),
    });
    redirect("/login");
  }

  const user: AuthenticatedUser = {
    id: dbUser.id,
    employeeId: dbUser.employeeId,
    name: dbUser.name,
    email: dbUser.email,
    role: assertUserRole(dbUser.role),
    mustChangePassword: dbUser.mustChangePassword,
    deactivatedAt: dbUser.deactivatedAt,
  };

  return {
    user,
    session: {
      id: session.session.id,
      userId: session.session.userId,
      token: session.session.token,
      expiresAt: session.session.expiresAt,
    },
  };
}

export async function requireAuthServer() {
  await getAuthenticatedSessionServer();
}

export async function requireAdmin() {
  const session = await getAuthenticatedSessionServer();

  if (session.user.role !== "admin") {
    redirect("/member/dashboard");
  }

  return session;
}
