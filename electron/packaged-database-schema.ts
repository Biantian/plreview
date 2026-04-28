import { PrismaClient } from "@prisma/client";

type EnsurePackagedDatabaseSchemaOptions = {
  databaseUrl?: string;
};

type TableInfoRow = {
  name?: string;
};

export async function ensurePackagedDatabaseSchema(
  options: EnsurePackagedDatabaseSchemaOptions,
) {
  const databaseUrl = options.databaseUrl?.trim();

  if (!databaseUrl?.startsWith("file:")) {
    return;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ["error"],
  });

  try {
    const ruleColumns = await prisma.$queryRawUnsafe<TableInfoRow[]>(
      'PRAGMA table_info("Rule")',
    );

    if (ruleColumns.some((column) => column.name === "deletedAt")) {
      return;
    }

    if (ruleColumns.length > 0) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Rule" ADD COLUMN "deletedAt" DATETIME');
    }
  } finally {
    await prisma.$disconnect();
  }
}
