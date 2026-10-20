import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const invoicesRouter = Router();

invoicesRouter.use(authenticate, scopeTenant(), requireEntitlement("payments"));

invoicesRouter.get("/", requirePermission("invoices", "view"), async (req, res, next) => {
  try {
    const { customerId, bookingId } = req.query as Record<string, string | undefined>;
    const invoices = await prisma.invoice.findMany({
      where: {
        clientId: req.clientId!,
        ...(customerId ? { customerId } : {}),
        ...(bookingId ? { bookingId } : {}),
      },
      include: { customer: true, booking: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return ok(res, invoices);
  } catch (err) {
    next(err);
  }
});

invoicesRouter.get("/:id", requirePermission("invoices", "view"), async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: { customer: true, booking: { include: { quotation: true } } },
    });
    if (!invoice) return fail(res, 404, "Invoice not found", "NOT_FOUND");

    const companyProfile = await prisma.companyProfile.findUnique({ where: { clientId: req.clientId! } });
    return ok(res, { ...invoice, companyProfile });
  } catch (err) {
    next(err);
  }
});

// GST-compliant invoice generation (SRS FR-8.3). gstRatePercent defaults
// to 5% (typical for tour operator services under GST) but is editable —
// this app doesn't attempt to be a tax authority, just compute the split
// the user tells it to.
const createInvoiceSchema = z.object({
  bookingId: z.string(),
  hsnSac: z.string().optional(),
  gstRatePercent: z.number().min(0).max(100).default(5),
});

invoicesRouter.post("/", requirePermission("invoices", "add"), async (req, res, next) => {
  try {
    const input = createInvoiceSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({ where: { id: input.bookingId, clientId: req.clientId! } });
    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const existing = await prisma.invoice.findFirst({ where: { bookingId: booking.id, clientId: req.clientId! } });
    if (existing) return fail(res, 400, "An invoice already exists for this booking", "ALREADY_INVOICED");

    // Booking.amountInPaise is treated as the tax-inclusive-agreed amount;
    // back out the subtotal so subtotal + gst == total exactly.
    const subtotalInPaise = Math.round(booking.amountInPaise / (1 + input.gstRatePercent / 100));
    const gstInPaise = booking.amountInPaise - subtotalInPaise;

    const invoice = await prisma.invoice.create({
      data: {
        clientId: req.clientId!,
        bookingId: booking.id,
        customerId: booking.customerId,
        hsnSac: input.hsnSac,
        subtotalInPaise,
        gstInPaise,
        totalInPaise: booking.amountInPaise,
      },
    });

    await logTenantAction({ clientId: req.clientId!, userId: req.auth!.sub, action: "CREATE_INVOICE", target: invoice.id, metadata: { bookingId: booking.id } });
    return ok(res, invoice, "Invoice generated");
  } catch (err) {
    next(err);
  }
});
