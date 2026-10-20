import { prisma } from "../db/prisma";

/**
 * Two audit trails, both now in the same physical database but kept as
 * logically separate tables: Super Admin actions (super_admin_audit_logs,
 * no clientId scope — Super Admin can act across clients) and per-client
 * business actions (audit_log, always written with clientId so a client's
 * own audit view can be filtered strictly to their data).
 */

export async function logSuperAdminAction(params: {
  actorId: string;
  actorEmail: string;
  action: string;
  targetClientId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await prisma.superAdminAuditLog.create({
    data: {
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: params.action,
      targetClientId: params.targetClientId,
      metadata: (params.metadata as any) ?? {},
      ipAddress: params.ipAddress,
    },
  });
}

export async function logTenantAction(params: {
  clientId: string;
  userId?: string;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      clientId: params.clientId,
      userId: params.userId,
      action: params.action,
      target: params.target,
      metadata: (params.metadata as any) ?? {},
      ipAddress: params.ipAddress,
    },
  });
}
