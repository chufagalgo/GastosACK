import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI de Prisma (migraciones y seed) usa la conexión "directa" (Session pooler
// de Supabase, puerto 5432). La app en Vercel usa DATABASE_URL (Transaction pooler, 6543).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
