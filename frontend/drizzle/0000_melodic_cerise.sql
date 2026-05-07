CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_provider_account_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"attendance_date" date NOT NULL,
	"status" text DEFAULT 'off' NOT NULL,
	"clock_in_at" timestamp with time zone,
	"clock_in_style" text,
	"clock_out_at" timestamp with time zone,
	"clock_out_style" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendances_user_date_unique" UNIQUE("user_id","attendance_date"),
	CONSTRAINT "chk_attendances_status" CHECK ("attendances"."status" in ('off', 'working', 'away', 'done')),
	CONSTRAINT "chk_attendances_clock_in_style" CHECK ("attendances"."clock_in_style" is null or "attendances"."clock_in_style" in ('office', 'remote', 'direct_visit')),
	CONSTRAINT "chk_attendances_clock_out_style" CHECK ("attendances"."clock_out_style" is null or "attendances"."clock_out_style" in ('normal', 'direct_return')),
	CONSTRAINT "chk_attendances_clock_in_pair" CHECK (("attendances"."clock_in_at" is null and "attendances"."clock_in_style" is null) or ("attendances"."clock_in_at" is not null and "attendances"."clock_in_style" is not null)),
	CONSTRAINT "chk_attendances_clock_out_pair" CHECK (("attendances"."clock_out_at" is null and "attendances"."clock_out_style" is null) or ("attendances"."clock_out_at" is not null and "attendances"."clock_out_style" is not null)),
	CONSTRAINT "chk_attendances_clock_out_requires_clock_in" CHECK ("attendances"."clock_out_at" is null or "attendances"."clock_in_at" is not null),
	CONSTRAINT "chk_attendances_clock_order" CHECK ("attendances"."clock_out_at" is null or "attendances"."clock_in_at" <= "attendances"."clock_out_at"),
	CONSTRAINT "chk_attendances_status_consistency" CHECK ((
        ("attendances"."status" = 'off' and "attendances"."clock_in_at" is null and "attendances"."clock_out_at" is null) or
        ("attendances"."status" = 'working' and "attendances"."clock_in_at" is not null and "attendances"."clock_out_at" is null) or
        ("attendances"."status" = 'away' and "attendances"."clock_in_at" is not null and "attendances"."clock_out_at" is null) or
        ("attendances"."status" = 'done' and "attendances"."clock_in_at" is not null and "attendances"."clock_out_at" is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "away_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_away_periods_order" CHECK ("away_periods"."ended_at" is null or "away_periods"."started_at" <= "away_periods"."ended_at")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "chk_users_role" CHECK ("users"."role" in ('member', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "away_periods" ADD CONSTRAINT "away_periods_attendance_id_attendances_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user_id" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_attendances_date" ON "attendances" USING btree ("attendance_date");--> statement-breakpoint
CREATE INDEX "idx_attendances_user_date" ON "attendances" USING btree ("user_id","attendance_date");--> statement-breakpoint
CREATE INDEX "idx_attendances_status" ON "attendances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_away_periods_attendance_id" ON "away_periods" USING btree ("attendance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_away_periods_one_active_per_attendance" ON "away_periods" USING btree ("attendance_id") WHERE "away_periods"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_users_employee_id" ON "users" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("deactivated_at") WHERE "users"."deactivated_at" is null;--> statement-breakpoint
CREATE INDEX "idx_verifications_identifier" ON "verifications" USING btree ("identifier");