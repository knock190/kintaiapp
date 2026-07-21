import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";

import {
  employeeIdToEmail,
  normalizeEmployeeId,
} from "../src/features/auth/utils/employee-email";

for (const envFile of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), envFile);
  if (existsSync(path)) {
    config({ path });
  }
}

const password = process.env.GUEST_PASSWORD;

if (!password) {
  throw new Error("GUEST_PASSWORD is required.");
}

const guests = [
  {
    employeeId: normalizeEmployeeId(
      process.env.GUEST_MEMBER_EMPLOYEE_ID ?? "guest-member",
    ),
    name: process.env.GUEST_MEMBER_NAME ?? "ゲストメンバー",
    role: "member" as const,
  },
  {
    employeeId: normalizeEmployeeId(
      process.env.GUEST_ADMIN_EMPLOYEE_ID ?? "guest-admin",
    ),
    name: process.env.GUEST_ADMIN_NAME ?? "ゲスト管理者",
    role: "admin" as const,
  },
];

const now = new Date();
const passwordHash = await hashPassword(password);
const [{ db }, { accounts, users }] = await Promise.all([
  import("../src/external/db"),
  import("../src/external/db/schema"),
]);

for (const guest of guests) {
  const email = employeeIdToEmail(guest.employeeId);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.employeeId, guest.employeeId),
  });

  const userId = existingUser?.id ?? randomUUID();

  if (existingUser) {
    await db
      .update(users)
      .set({
        name: guest.name,
        email,
        emailVerified: true,
        role: guest.role,
        mustChangePassword: false,
        deactivatedAt: null,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
  } else {
    await db.insert(users).values({
      id: userId,
      name: guest.name,
      email,
      emailVerified: true,
      employeeId: guest.employeeId,
      role: guest.role,
      mustChangePassword: false,
      deactivatedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db
    .insert(accounts)
    .values({
      id: randomUUID(),
      userId,
      providerId: "credential",
      accountId: userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [accounts.providerId, accounts.accountId],
      set: {
        password: passwordHash,
        updatedAt: now,
      },
    });

  console.log(`Seeded guest ${guest.role}: ${guest.employeeId}`);
}
