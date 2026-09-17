import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migracije idu preko direktne konekcije — PgBouncer (pooler) transaction-mode
    // ne podržava prepared statements koje Prisma migrate treba.
    url: env("DIRECT_URL"),
  },
});
