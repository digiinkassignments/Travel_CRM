import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const branchesRouter = Router();

// Multi-Branch is Enterprise only (SRS section 6/FR-12.1). Branch *creation*
// during onboarding already exists (onboarding.controller.ts); this router
// covers ongoing management once a client is live: editing branches,
// assigning staff to a branch, and the rolled-up cross-branch dashboard
// the SRS calls for ("each with its own staff and data view, rolled up
// for the Client Admin").
branchesRouter.use(authenticate, scopeTenant(), requireEntitlement("multi_branch"));

branchesRouter.get("/", requirePermission("settings", "view"), async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { clientId: req.clientId! },
      include: { _count: { select: { users: true, customers: true, enquiries: true, bookings: true } } },
      orderBy: { createdAt: "asc" },
    });
    return ok(res, branches);
  } catch (err) {
    next(err);
  }
});

const branchSchema = z.object({ name: z.string().min(1), address: z.string().optional() });

branchesRouter.post("/", requirePermission("settings", "add"), async (req, res, next) => {
  try {
    const input = branchSchema.parse(req.body);
    const branch = await prisma.branch.create({ data: { clientId: req.clientId!, ...input } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_BRANCH", target: branch.id });
    return ok(res, branch, "Branch created");
  } catch (err) {
    next(err);
  }
});

branchesRouter.patch("/:id", requirePermission("settings", "edit"), async (req, res, next) => {
  try {
    const input = branchSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.branch.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Branch not found", "NOT_FOUND");

    const branch = await prisma.branch.update({ where: { id: req.params.id }, data: input });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "UPDATE_BRANCH", target: branch.id });
    return ok(res, branch, "Branch updated");
  } catch (err) {
    next(err);
  }
});

// Assign (or unassign, with branchId: null) a staff member to a branch.
branchesRouter.patch("/assign-user/:userId", requirePermission("staff", "edit"), async (req, res, next) => {
  try {
    const { branchId } = z.object({ branchId: z.string().nullable() }).parse(req.body);

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, clientId: req.clientId! } });
      if (!branch) return fail(res, 404, "Branch not found", "NOT_FOUND");
    }

    const user = await prisma.user.findFirst({ where: { id: req.params.userId, clientId: req.clientId! } });
    if (!user) return fail(res, 404, "Staff member not found", "NOT_FOUND");

    const updated = await prisma.user.update({ where: { id: user.id }, data: { branchId } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "ASSIGN_USER_BRANCH", target: user.id, metadata: { branchId } });
    return ok(res, { ...updated, passwordHash: undefined }, "Staff branch assignment updated");
  } catch (err) {
    next(err);
  }
});

// Rolled-up cross-branch dashboard for the Client Admin (SRS FR-12.1).
branchesRouter.get("/rollup", requirePermission("dashboard", "view"), async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const branches = await prisma.branch.findMany({ where: { clientId } });

    const rows = await Promise.all(branches.map(async (branch) => {
      const [enquiryCount, wonCount, bookingAgg, staffCount] = await Promise.all([
        prisma.enquiry.count({ where: { clientId, branchId: branch.id } }),
        prisma.enquiry.count({ where: { clientId, branchId: branch.id, status: "WON" } }),
        prisma.booking.aggregate({ where: { clientId, branchId: branch.id }, _sum: { amountInPaise: true }, _count: { _all: true } }),
        prisma.user.count({ where: { clientId, branchId: branch.id, isActive: true } }),
      ]);
      return {
        branchId: branch.id,
        branchName: branch.name,
        isActive: branch.isActive,
        staffCount,
        enquiryCount,
        wonCount,
        bookingCount: bookingAgg._count._all,
        revenueInPaise: bookingAgg._sum.amountInPaise ?? 0,
      };
    }));

    // Anything not yet assigned to a branch still needs to be visible in
    // the rollup, otherwise data silently "disappears" from the totals.
    const [unassignedEnquiries, unassignedBookingAgg] = await Promise.all([
      prisma.enquiry.count({ where: { clientId, branchId: null } }),
      prisma.booking.aggregate({ where: { clientId, branchId: null }, _sum: { amountInPaise: true }, _count: { _all: true } }),
    ]);

    return ok(res, {
      branches: rows,
      unassigned: {
        enquiryCount: unassignedEnquiries,
        bookingCount: unassignedBookingAgg._count._all,
        revenueInPaise: unassignedBookingAgg._sum.amountInPaise ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});
