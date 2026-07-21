"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/external/db";
import { attendances, users } from "@/external/db/schema";
import { auth } from "@/features/auth/servers/auth";
import {
  employeeIdToEmail,
  normalizeEmployeeId,
} from "@/features/auth/utils/employee-email";

export type GuestRole = "member" | "admin";

type GuestLoginState = {
  error?: string;
};

const GENERIC_ERROR = "ゲストログインに失敗しました。";
const UNAVAILABLE_ERROR = "ゲストログインは利用できません。";

function resolveGuestEmployeeId(role: GuestRole) {
  const raw =
    role === "admin"
      ? (process.env.GUEST_ADMIN_EMPLOYEE_ID ?? "guest-admin")
      : (process.env.GUEST_MEMBER_EMPLOYEE_ID ?? "guest-member");
  return normalizeEmployeeId(raw);
}

export async function guestLoginAction(
  role: GuestRole,
): Promise<GuestLoginState> {
  const password = process.env.GUEST_PASSWORD;
  if (!password) {
    return { error: UNAVAILABLE_ERROR };
  }

  const employeeId = resolveGuestEmployeeId(role);
  const email = employeeIdToEmail(employeeId);

  const guest = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!guest || guest.deactivatedAt) {
    return { error: UNAVAILABLE_ERROR };
  }

  await db.delete(attendances).where(eq(attendances.userId, guest.id));

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    return { error: GENERIC_ERROR };
  }

  if (role === "admin") {
    redirect("/admin/dashboard");
  }
  redirect("/member/dashboard");
}
