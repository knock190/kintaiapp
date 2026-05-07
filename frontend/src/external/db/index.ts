import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/external/db/schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5433/kintaiapp?sslmode=disable";

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
