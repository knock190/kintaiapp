import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/external/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5433/kintaiapp?sslmode=disable",
  },
  strict: true,
  verbose: true,
});
