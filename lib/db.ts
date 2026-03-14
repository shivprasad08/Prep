import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

const createDb = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
};

type DB = ReturnType<typeof createDb>;

let dbInstance: DB | null = null;

export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    if (!dbInstance) {
      dbInstance = createDb();
    }

    return Reflect.get(dbInstance as object, prop, receiver);
  },
});

export type { DB };