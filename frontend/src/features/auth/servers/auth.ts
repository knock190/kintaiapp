import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { db } from "@/external/db";
import * as schema from "@/external/db/schema";

const authOptions = {
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "development-secret-change-me-at-least-32-characters",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  disabledPaths: ["/sign-up/email"],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") {
        return;
      }

      const email = typeof ctx.body?.email === "string" ? ctx.body.email : "";
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase()),
      });

      if (user?.deactivatedAt) {
        throw APIError.from("UNAUTHORIZED", {
          code: "INVALID_EMPLOYEE_ID_OR_PASSWORD",
          message: "社員 ID またはパスワードが正しくありません。",
        });
      }
    }),
  },
  plugins: [
    customSession(async ({ user, session }) => {
      const dbUser = await db.query.users.findFirst({
        where: eq(schema.users.id, user.id),
      });

      return {
        user: {
          ...user,
          employeeId: dbUser?.employeeId ?? "",
          role: dbUser?.role ?? "member",
          mustChangePassword: dbUser?.mustChangePassword ?? true,
          deactivatedAt: dbUser?.deactivatedAt ?? null,
        },
        session,
      };
    }),
    nextCookies(),
  ],
} satisfies Parameters<typeof betterAuth>[0];

export const auth = betterAuth(authOptions);
