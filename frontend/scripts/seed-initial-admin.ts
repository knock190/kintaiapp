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

const employeeId = normalizeEmployeeId(
  process.env.INITIAL_ADMIN_EMPLOYEE_ID ?? "admin",
);
const name = process.env.INITIAL_ADMIN_NAME ?? "初期管理者";
const password = process.env.INITIAL_ADMIN_PASSWORD;

if (!password) {
  throw new Error("INITIAL_ADMIN_PASSWORD is required.");
}

const email = employeeIdToEmail(employeeId);
const now = new Date();
const passwordHash = await hashPassword(password);
const [{ db }, { accounts, users }] = await Promise.all([
  import("../src/external/db"),
  import("../src/external/db/schema"),
]);

const existingUser = await db.query.users.findFirst({
  where: eq(users.employeeId, employeeId),
});

const userId = existingUser?.id ?? randomUUID();

if (existingUser) {
  await db
    .update(users)
    .set({
      name,
      email,
      emailVerified: true,
      role: "admin",
      mustChangePassword: true,
      deactivatedAt: null,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
} else {
  await db.insert(users).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    employeeId,
    role: "admin",
    mustChangePassword: true,
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

console.log(`Seeded initial admin: ${employeeId}`);
