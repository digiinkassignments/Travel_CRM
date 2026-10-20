import { PrismaClient } from "../generated/client";

// One shared connection to the single database. Every tenant-scoped query
// MUST include a clientId filter — see common/scoped-prisma.ts and
// guards/tenant-scope.guard.ts. There is no per-client database anymore
// (see the architecture note at the top of prisma/schema.prisma).
export const prisma = new PrismaClient();
