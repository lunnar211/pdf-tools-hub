// Prisma client, null-safe: returns null when DATABASE_URL is unset so the
// site keeps working as a guest tool and the build never touches a database.
import { PrismaClient } from "@prisma/client";

declare global {
  var __pthPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient | null = process.env.DATABASE_URL
  ? (globalThis.__pthPrisma ?? new PrismaClient())
  : null;

if (process.env.DATABASE_URL && !globalThis.__pthPrisma && prisma) {
  globalThis.__pthPrisma = prisma;
}

export const dbConfigured = () => prisma !== null;
