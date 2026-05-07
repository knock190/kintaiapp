import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    employeeId: text("employee_id").notNull().unique(),
    role: text("role").notNull().default("member"),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_users_employee_id").on(table.employeeId),
    index("idx_users_active")
      .on(table.deactivatedAt)
      .where(sql`${table.deactivatedAt} is null`),
    check("chk_users_role", sql`${table.role} in ('member', 'admin')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("idx_accounts_user_id").on(table.userId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_verifications_identifier").on(table.identifier)],
);

export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    attendanceDate: date("attendance_date").notNull(),
    status: text("status").notNull().default("off"),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }),
    clockInStyle: text("clock_in_style"),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    clockOutStyle: text("clock_out_style"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("attendances_user_date_unique").on(
      table.userId,
      table.attendanceDate,
    ),
    index("idx_attendances_date").on(table.attendanceDate),
    index("idx_attendances_user_date").on(table.userId, table.attendanceDate),
    index("idx_attendances_status").on(table.status),
    check(
      "chk_attendances_status",
      sql`${table.status} in ('off', 'working', 'away', 'done')`,
    ),
    check(
      "chk_attendances_clock_in_style",
      sql`${table.clockInStyle} is null or ${table.clockInStyle} in ('office', 'remote', 'direct_visit')`,
    ),
    check(
      "chk_attendances_clock_out_style",
      sql`${table.clockOutStyle} is null or ${table.clockOutStyle} in ('normal', 'direct_return')`,
    ),
    check(
      "chk_attendances_clock_in_pair",
      sql`(${table.clockInAt} is null and ${table.clockInStyle} is null) or (${table.clockInAt} is not null and ${table.clockInStyle} is not null)`,
    ),
    check(
      "chk_attendances_clock_out_pair",
      sql`(${table.clockOutAt} is null and ${table.clockOutStyle} is null) or (${table.clockOutAt} is not null and ${table.clockOutStyle} is not null)`,
    ),
    check(
      "chk_attendances_clock_out_requires_clock_in",
      sql`${table.clockOutAt} is null or ${table.clockInAt} is not null`,
    ),
    check(
      "chk_attendances_clock_order",
      sql`${table.clockOutAt} is null or ${table.clockInAt} <= ${table.clockOutAt}`,
    ),
    check(
      "chk_attendances_status_consistency",
      sql`(
        (${table.status} = 'off' and ${table.clockInAt} is null and ${table.clockOutAt} is null) or
        (${table.status} = 'working' and ${table.clockInAt} is not null and ${table.clockOutAt} is null) or
        (${table.status} = 'away' and ${table.clockInAt} is not null and ${table.clockOutAt} is null) or
        (${table.status} = 'done' and ${table.clockInAt} is not null and ${table.clockOutAt} is not null)
      )`,
    ),
  ],
);

export const awayPeriods = pgTable(
  "away_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendances.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_away_periods_attendance_id").on(table.attendanceId),
    uniqueIndex("idx_away_periods_one_active_per_attendance")
      .on(table.attendanceId)
      .where(sql`${table.endedAt} is null`),
    check(
      "chk_away_periods_order",
      sql`${table.endedAt} is null or ${table.startedAt} <= ${table.endedAt}`,
    ),
  ],
);
