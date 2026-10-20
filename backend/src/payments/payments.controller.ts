import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";
import { emitWorkflowEvent } from "../automation/automation.service";

export const paymentsRouter = Router();

// Payments/Receivables/Invoicing is Professional+ (SRS section 6/FR-8).
// Manual entry only — cash/UPI/bank transfer, no payment gateway, same
// "manual-payment-first" philosophy the SaaS billing side uses (SRS USP #5).
paymentsRouter.use(authenticate, scopeTenant(), requireEntitlement("payments"));

async function bookingPaymentSummary(clientId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, clientId } });
  if (!booking) return null;

  const paidAgg = await prisma.payment.aggregate({
    where: { bookingId, clientId },
    _sum: { amountInPaise: true },
  });
  const paidInPaise = paidAgg._sum.amountInPaise ?? 0;
  const pendingInPaise = Math.max(booking.amountInPaise - paidInPaise, 0);

  let status: "UNPAID" | "PARTIALLY_PAID" | "PAID" = "UNPAID";
  if (paidInPaise >= booking.amountInPaise && booking.amountInPaise > 0) status = "PAID";
  else if (paidInPaise > 0) status = "PARTIALLY_PAID";

  return {
    totalInPaise: booking.amountInPaise,
    paidInPaise,
    pendingInPaise,
    paymentStatus: status,
    dueDate: booking.paymentDueDate,
  };
}

paymentsRouter.get("/booking/:bookingId/summary", requirePermission("payments", "view"), async (req, res, next) => {
  try {
    const summary = await bookingPaymentSummary(req.clientId!, req.params.bookingId);
    if (!summary) return fail(res, 404, "Booking not found", "NOT_FOUND");
    return ok(res, summary);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.get("/", requirePermission("payments", "view"), async (req, res, next) => {
  try {
    const { bookingId, customerId } = req.query as Record<string, string | undefined>;
    const payments = await prisma.payment.findMany({
      where: {
        clientId: req.clientId!,
        ...(bookingId ? { bookingId } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: { customer: true, booking: { select: { id: true, amountInPaise: true } } },
      orderBy: { paymentDate: "desc" },
      take: 300,
    });
    return ok(res, payments);
  } catch (err) {
    next(err);
  }
});

// Support for installment payments (SRS FR-8.2) is simply: record as many
// payments against one booking as needed. This endpoint enforces that a
// payment can never push the booking's paid total past its agreed amount.
const createPaymentSchema = z.object({
  bookingId: z.string(),
  amountInPaise: z.number().int().positive(),
  mode: z.enum(["CASH", "UPI", "BANK_TRANSFER"]),
  paymentDate: z.coerce.date(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

paymentsRouter.post("/", requirePermission("payments", "add"), async (req, res, next) => {
  try {
    const input = createPaymentSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({ where: { id: input.bookingId, clientId: req.clientId! } });
    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const existingPaid = await prisma.payment.aggregate({
      where: { bookingId: booking.id, clientId: req.clientId! },
      _sum: { amountInPaise: true },
    });
    const alreadyPaid = existingPaid._sum.amountInPaise ?? 0;
    if (alreadyPaid + input.amountInPaise > booking.amountInPaise) {
      return fail(res, 400, "This payment would exceed the booking's total amount", "OVERPAYMENT");
    }

    const payment = await prisma.payment.create({
      data: { clientId: req.clientId!, customerId: booking.customerId, recordedById: req.auth!.sub, ...input },
    });

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "RECORD_PAYMENT", target: payment.id, metadata: { bookingId: booking.id, amountInPaise: input.amountInPaise } });

    emitWorkflowEvent({
      clientId: req.clientId!,
      eventType: "PAYMENT_RECEIVED",
      targetType: "PAYMENT",
      targetId: payment.id,
    }).catch((err) => {
      console.error("[workflow:PAYMENT_RECEIVED]", err);
    });

    return ok(res, payment, "Payment recorded");
  } catch (err) {
    next(err);
  }
});

paymentsRouter.delete("/:id", requirePermission("payments", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.payment.findFirst({ where: { id: req.params.id, clientId: req.clientId! } });
    if (!existing) return fail(res, 404, "Payment not found", "NOT_FOUND");

    await prisma.payment.delete({ where: { id: req.params.id } });
    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "DELETE_PAYMENT", target: req.params.id });
    return ok(res, {}, "Payment removed");
  } catch (err) {
    next(err);
  }
});
