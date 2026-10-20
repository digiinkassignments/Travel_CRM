import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { logTenantAction } from "../audit/audit.service";

export const suppliersRouter = Router();

suppliersRouter.use(authenticate, scopeTenant());

// -------------------------------------------------------------
// Overall Payables Summary for Tenant Dashboard
// -------------------------------------------------------------
suppliersRouter.get("/payables/summary", async (req, res, next) => {
  try {
    const clientId = req.clientId!;

    const [costSum, paidSum, supplierCount] = await Promise.all([
      prisma.bookingCostItem.aggregate({
        where: { clientId },
        _sum: { totalCostInPaise: true },
      }),
      prisma.supplierPayment.aggregate({
        where: { clientId },
        _sum: { amountInPaise: true },
      }),
      prisma.supplier.count({
        where: { clientId, isActive: true },
      }),
    ]);

    const totalBilledInPaise = costSum._sum.totalCostInPaise || 0;
    const totalPaidInPaise = paidSum._sum.amountInPaise || 0;
    const totalPendingInPaise = Math.max(0, totalBilledInPaise - totalPaidInPaise);

    return ok(res, {
      totalBilledInPaise,
      totalPaidInPaise,
      totalPendingInPaise,
      supplierCount,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// List Suppliers with Search, Filter & Financial Balance
// -------------------------------------------------------------
suppliersRouter.get("/", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const { search, type, city } = req.query as Record<string, string | undefined>;

    const where: any = { clientId };

    if (type) {
      where.type = type;
    }
    if (city) {
      where.city = { contains: city };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        costItems: {
          select: { totalCostInPaise: true },
        },
        payments: {
          select: { amountInPaise: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const enriched = suppliers.map((sup) => {
      const totalBilledInPaise = sup.costItems.reduce((acc, item) => acc + item.totalCostInPaise, 0);
      const totalPaidInPaise = sup.payments.reduce((acc, p) => acc + p.amountInPaise, 0);
      const balanceDueInPaise = totalBilledInPaise - totalPaidInPaise;

      const { costItems, payments, ...rest } = sup;
      return {
        ...rest,
        totalBilledInPaise,
        totalPaidInPaise,
        balanceDueInPaise,
      };
    });

    return ok(res, enriched);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Get Single Supplier with Full Transaction Ledger
// -------------------------------------------------------------
suppliersRouter.get("/:id", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, clientId },
      include: {
        costItems: {
          include: {
            booking: {
              include: {
                customer: { select: { id: true, name: true, phone: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        payments: {
          include: {
            booking: {
              select: { id: true, customer: { select: { name: true } } },
            },
          },
          orderBy: { paymentDate: "desc" },
        },
        vouchers: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!supplier) return fail(res, 404, "Supplier not found", "NOT_FOUND");

    const totalBilledInPaise = supplier.costItems.reduce((acc, item) => acc + item.totalCostInPaise, 0);
    const totalPaidInPaise = supplier.payments.reduce((acc, p) => acc + p.amountInPaise, 0);
    const balanceDueInPaise = totalBilledInPaise - totalPaidInPaise;

    return ok(res, {
      ...supplier,
      totalBilledInPaise,
      totalPaidInPaise,
      balanceDueInPaise,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Create Supplier Schema & Endpoint
// -------------------------------------------------------------
const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["HOTEL", "TRANSPORTER", "TOUR_GUIDE", "ACTIVITY_PROVIDER", "VISA_AGENT", "OTHER"]).default("HOTEL"),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  starRating: z.number().int().min(1).max(5).optional(),
  bankName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  ifscCode: z.string().trim().optional(),
  upiId: z.string().trim().optional(),
  notes: z.string().optional(),
});

suppliersRouter.post("/", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const input = createSupplierSchema.parse(req.body);

    const supplier = await prisma.supplier.create({
      data: {
        clientId,
        name: input.name,
        type: input.type,
        contactPerson: input.contactPerson || null,
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        email: input.email || null,
        city: input.city || null,
        address: input.address || null,
        starRating: input.starRating || null,
        bankName: input.bankName || null,
        accountNumber: input.accountNumber || null,
        ifscCode: input.ifscCode || null,
        upiId: input.upiId || null,
        notes: input.notes || null,
      },
    });

    await logTenantAction({
      clientId,
      userId: req.auth!.sub,
      action: "CREATE_SUPPLIER",
      target: supplier.id,
      metadata: { name: supplier.name, type: supplier.type },
    });

    return ok(res, supplier, "Supplier created successfully");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Update Supplier
// -------------------------------------------------------------
const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

suppliersRouter.patch("/:id", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, clientId },
    });

    if (!existing) return fail(res, 404, "Supplier not found", "NOT_FOUND");

    const input = updateSupplierSchema.parse(req.body);

    const updated = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp || null } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.city !== undefined ? { city: input.city || null } : {}),
        ...(input.address !== undefined ? { address: input.address || null } : {}),
        ...(input.starRating !== undefined ? { starRating: input.starRating || null } : {}),
        ...(input.bankName !== undefined ? { bankName: input.bankName || null } : {}),
        ...(input.accountNumber !== undefined ? { accountNumber: input.accountNumber || null } : {}),
        ...(input.ifscCode !== undefined ? { ifscCode: input.ifscCode || null } : {}),
        ...(input.upiId !== undefined ? { upiId: input.upiId || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    await logTenantAction({
      clientId,
      userId: req.auth!.sub,
      action: "UPDATE_SUPPLIER",
      target: updated.id,
    });

    return ok(res, updated, "Supplier updated");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// Delete / Deactivate Supplier
// -------------------------------------------------------------
suppliersRouter.delete("/:id", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, clientId },
    });

    if (!existing) return fail(res, 404, "Supplier not found", "NOT_FOUND");

    // Soft delete if referenced, or hard delete if no records exist
    const hasReferences = await prisma.bookingCostItem.count({
      where: { supplierId: req.params.id },
    });

    if (hasReferences > 0) {
      const updated = await prisma.supplier.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      return ok(res, updated, "Supplier deactivated as historical bookings exist");
    }

    await prisma.supplier.delete({ where: { id: req.params.id } });
    return ok(res, null, "Supplier deleted");
  } catch (err) {
    next(err);
  }
});
