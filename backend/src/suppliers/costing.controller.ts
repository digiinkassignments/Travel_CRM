import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { logTenantAction } from "../audit/audit.service";

export const costingRouter = Router({ mergeParams: true });

costingRouter.use(authenticate, scopeTenant());

// -------------------------------------------------------------
// GET /api/bookings/:bookingId/costing
// Returns selling price, itemized net costs, real-time profit & margin
// -------------------------------------------------------------
costingRouter.get("/:bookingId/costing", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        costItems: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                type: true,
                phone: true,
                whatsapp: true,
                city: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true,
                upiId: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        supplierPayments: {
          include: {
            supplier: { select: { id: true, name: true, type: true } },
          },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const sellingPriceInPaise = booking.amountInPaise;
    const totalCostInPaise = booking.costItems.reduce((acc, item) => acc + item.totalCostInPaise, 0);
    const grossProfitInPaise = sellingPriceInPaise - totalCostInPaise;
    const profitMarginPct =
      sellingPriceInPaise > 0
        ? Number(((grossProfitInPaise / sellingPriceInPaise) * 100).toFixed(2))
        : 0;

    const totalPaidToSuppliersInPaise = booking.supplierPayments.reduce(
      (acc, p) => acc + p.amountInPaise,
      0
    );
    const pendingPayablesInPaise = Math.max(0, totalCostInPaise - totalPaidToSuppliersInPaise);

    return ok(res, {
      bookingId: booking.id,
      customer: booking.customer,
      sellingPriceInPaise,
      totalCostInPaise,
      grossProfitInPaise,
      profitMarginPct,
      totalPaidToSuppliersInPaise,
      pendingPayablesInPaise,
      costItems: booking.costItems,
      supplierPayments: booking.supplierPayments,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// POST /api/bookings/:bookingId/costing
// Add Cost Item to Booking
// -------------------------------------------------------------
const addCostItemSchema = z.object({
  supplierId: z.string().optional().nullable(),
  itemType: z.enum(["HOTEL", "TRANSPORT", "ACTIVITY", "GUIDE", "FLIGHT", "VISA", "MISC"]).default("HOTEL"),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.number().int().min(1).default(1),
  unitCostInPaise: z.number().int().nonnegative("Unit cost must be positive"),
  totalCostInPaise: z.number().int().nonnegative().optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID"]).default("UNPAID"),
  notes: z.string().optional(),
});

costingRouter.post("/:bookingId/costing", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientId },
    });
    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const input = addCostItemSchema.parse(req.body);

    const calculatedTotal =
      input.totalCostInPaise !== undefined
        ? input.totalCostInPaise
        : input.quantity * input.unitCostInPaise;

    const costItem = await prisma.bookingCostItem.create({
      data: {
        clientId,
        bookingId,
        supplierId: input.supplierId || null,
        itemType: input.itemType,
        description: input.description,
        quantity: input.quantity,
        unitCostInPaise: input.unitCostInPaise,
        totalCostInPaise: calculatedTotal,
        paymentStatus: input.paymentStatus,
        notes: input.notes || null,
      },
      include: {
        supplier: true,
      },
    });

    await logTenantAction({
      clientId,
      userId: req.auth!.sub,
      action: "ADD_BOOKING_COST_ITEM",
      target: costItem.id,
      metadata: { bookingId, totalCostInPaise: calculatedTotal, description: input.description },
    });

    return ok(res, costItem, "Cost item added");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// PATCH /api/bookings/:bookingId/costing/:itemId
// Update Cost Item
// -------------------------------------------------------------
const updateCostItemSchema = addCostItemSchema.partial();

costingRouter.patch("/:bookingId/costing/:itemId", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const { bookingId, itemId } = req.params;

    const existing = await prisma.bookingCostItem.findFirst({
      where: { id: itemId, bookingId, clientId },
    });
    if (!existing) return fail(res, 404, "Cost item not found", "NOT_FOUND");

    const input = updateCostItemSchema.parse(req.body);

    const quantity = input.quantity ?? existing.quantity;
    const unitCostInPaise = input.unitCostInPaise ?? existing.unitCostInPaise;
    const totalCostInPaise =
      input.totalCostInPaise ?? (input.quantity || input.unitCostInPaise ? quantity * unitCostInPaise : existing.totalCostInPaise);

    const updated = await prisma.bookingCostItem.update({
      where: { id: itemId },
      data: {
        ...(input.supplierId !== undefined ? { supplierId: input.supplierId || null } : {}),
        ...(input.itemType !== undefined ? { itemType: input.itemType } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        quantity,
        unitCostInPaise,
        totalCostInPaise,
        ...(input.paymentStatus !== undefined ? { paymentStatus: input.paymentStatus } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      },
      include: {
        supplier: true,
      },
    });

    return ok(res, updated, "Cost item updated");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// DELETE /api/bookings/:bookingId/costing/:itemId
// Delete Cost Item
// -------------------------------------------------------------
costingRouter.delete("/:bookingId/costing/:itemId", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const { bookingId, itemId } = req.params;

    const existing = await prisma.bookingCostItem.findFirst({
      where: { id: itemId, bookingId, clientId },
    });
    if (!existing) return fail(res, 404, "Cost item not found", "NOT_FOUND");

    await prisma.bookingCostItem.delete({ where: { id: itemId } });

    await logTenantAction({
      clientId,
      userId: req.auth!.sub,
      action: "DELETE_BOOKING_COST_ITEM",
      target: itemId,
      metadata: { bookingId },
    });

    return ok(res, null, "Cost item removed");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// POST /api/suppliers/payments
// Record Supplier Payout
// -------------------------------------------------------------
export const supplierPaymentsRouter = Router();
supplierPaymentsRouter.use(authenticate, scopeTenant());

const recordSupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  bookingId: z.string().optional().nullable(),
  amountInPaise: z.number().int().positive("Amount must be greater than 0"),
  paymentDate: z.coerce.date().default(() => new Date()),
  mode: z.enum(["UPI", "BANK_TRANSFER", "CASH", "CHEQUE", "CREDIT_CARD"]).default("UPI"),
  reference: z.string().trim().optional(),
  notes: z.string().optional(),
});

supplierPaymentsRouter.post("/", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const input = recordSupplierPaymentSchema.parse(req.body);

    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, clientId },
    });
    if (!supplier) return fail(res, 404, "Supplier not found", "NOT_FOUND");

    if (input.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: input.bookingId, clientId },
      });
      if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");
    }

    const payment = await prisma.supplierPayment.create({
      data: {
        clientId,
        supplierId: input.supplierId,
        bookingId: input.bookingId || null,
        amountInPaise: input.amountInPaise,
        paymentDate: input.paymentDate,
        mode: input.mode,
        reference: input.reference || null,
        notes: input.notes || null,
      },
      include: {
        supplier: true,
        booking: {
          select: { id: true, customer: { select: { name: true } } },
        },
      },
    });

    await logTenantAction({
      clientId,
      userId: req.auth!.sub,
      action: "RECORD_SUPPLIER_PAYMENT",
      target: payment.id,
      metadata: {
        supplierId: input.supplierId,
        amountInPaise: input.amountInPaise,
        mode: input.mode,
        reference: input.reference,
      },
    });

    return ok(res, payment, "Supplier payment recorded successfully");
  } catch (err) {
    next(err);
  }
});
