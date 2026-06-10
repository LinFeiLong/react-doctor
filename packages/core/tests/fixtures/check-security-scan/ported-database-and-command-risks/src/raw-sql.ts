import { PrismaClient } from "@prisma/client";
import { sql } from "drizzle-orm";

const prisma = new PrismaClient();

export const loadUser = async (userId: string) => {
  return prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = '${userId}'`);
};

export const deleteFromTenantTable = async (tableName: string) => {
  return sql.raw(`DELETE FROM ${tableName}`);
};
