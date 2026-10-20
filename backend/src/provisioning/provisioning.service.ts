import crypto from "crypto";
import { prisma } from "../db/prisma";
import { hashPassword, generateTemporaryPassword } from "../auth/password";
import { logSuperAdminAction } from "../audit/audit.service";

function slugify(businessName: string): string {
  return businessName.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8);
}

function generateSubdomain(businessName: string): string {
  const clean = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
  return `travel-${clean || "agency"}`;
}

/**
 * "Create Client" flow with automated dynamic subdomain provisioning and Nginx reload.
 */
export async function provisionNewClient(params: {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  planId: string;
  subscriptionStart: Date;
  subscriptionExpiry: Date;
  actorId: string;
  actorEmail: string;
}) {
  const clientCode = `${slugify(params.businessName)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const temporaryPassword = generateTemporaryPassword();

  let baseSubdomain = generateSubdomain(params.businessName);
  let subdomain = baseSubdomain;
  let counter = 1;
  while (await prisma.client.findFirst({ where: { subdomain } })) {
    subdomain = `${baseSubdomain}-${counter++}`;
  }

  const { client, adminUser } = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        clientCode,
        businessName: params.businessName,
        subdomain,
        ownerName: params.ownerName,
        email: params.email,
        phone: params.phone,
        planId: params.planId,
        subscriptionStatus: "ACTIVE",
        subscriptionStart: params.subscriptionStart,
        subscriptionExpiry: params.subscriptionExpiry,
      },
    });

    const adminRole = await tx.role.create({
      data: {
        clientId: client.id,
        name: "Client Admin",
        isSystemRole: true,
        permissionsJson: buildFullAccessPermissions(),
      },
    });

    const adminUser = await tx.user.create({
      data: {
        clientId: client.id,
        name: params.ownerName,
        email: params.email,
        passwordHash: await hashPassword(temporaryPassword),
        roleId: adminRole.id,
        isClientAdmin: true,
        mustChangePassword: true,
      },
    });

    return { client, adminUser };
  });

  // Automatically add the new client subdomain to Nginx and reload
  const { syncNginxSubdomains } = await import("./nginx-sync.service");
  await syncNginxSubdomains();

  await logSuperAdminAction({
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    action: "CREATE_CLIENT",
    targetClientId: client.id,
    metadata: { businessName: params.businessName, planId: params.planId, adminUserId: adminUser.id, subdomain: client.subdomain },
  });

  return { client, adminUser, temporaryPassword };
}

function buildFullAccessPermissions() {
  const modules = [
    "dashboard", "customers", "enquiries", "quotations", "bookings",
    "trips", "drivers", "vehicles", "payments", "invoices", "reports",
    "staff", "settings",
  ];
  const grid: Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean; export: boolean }> = {};
  for (const module of modules) {
    grid[module] = { view: true, add: true, edit: true, delete: true, export: true };
  }
  return grid;
}
