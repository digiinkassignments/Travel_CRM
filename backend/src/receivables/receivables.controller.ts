import { Router } from "express";
import { prisma } from "../db/prisma";
import { ok } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";

export const receivablesRouter = Router();

receivablesRouter.use(authenticate, scopeTenant(), requireEntitlement("payments"));

interface BookingWithPaid {
  id: string;
  amountInPaise: number;
  paymentDueDate: Date | null;
  customer: { id: string; name: string };
  paidInPaise: number;
}

async function loadBookingsWithPaidTotals(clientId: string): Promise<BookingWithPaid[]> {
  const bookings = await prisma.booking.findMany({
    where: { clientId, status: { not: "CANCELLED" } },
    include: { customer: { select: { id: true, name: true } }, payments: { select: { amountInPaise: true } } },
  });

  return bookings.map((b) => ({
    id: b.id,
    amountInPaise: b.amountInPaise,
    paymentDueDate: b.paymentDueDate,
    customer: b.customer,
    paidInPaise: b.payments.reduce((sum, p) => sum + p.amountInPaise, 0),
  }));
}

// Receivables dashboard (SRS section 24): Total Receivable, Due Today,
// Overdue, Due This Week, Paid.
receivablesRouter.get("/dashboard", requirePermission("payments", "view"), async (req, res, next) => {
  try {
    const bookings = await loadBookingsWithPaidTotals(req.clientId!);

    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(startOfToday); endOfWeek.setDate(endOfWeek.getDate() + 7);

    let totalReceivable = 0, dueToday = 0, overdue = 0, dueThisWeek = 0, paid = 0;

    for (const b of bookings) {
      const pending = Math.max(b.amountInPaise - b.paidInPaise, 0);
      paid += b.paidInPaise;
      totalReceivable += pending;
      if (pending === 0) continue;

      if (b.paymentDueDate) {
        if (b.paymentDueDate < startOfToday) overdue += pending;
        else if (b.paymentDueDate >= startOfToday && b.paymentDueDate <= endOfToday) dueToday += pending;
        else if (b.paymentDueDate <= endOfWeek) dueThisWeek += pending;
      }
    }

    return ok(res, { totalReceivable, dueToday, overdue, dueThisWeek, paid });
  } catch (err) {
    next(err);
  }
});

// List view with the filters called out in SRS section 24 (customer,
// booking, date, staff, payment status). Staff filtering matches whoever
// recorded at least one payment against the booking.
receivablesRouter.get("/", requirePermission("payments", "view"), async (req, res, next) => {
  try {
    const { customerId, paymentStatus } = req.query as Record<string, string | undefined>;
    const bookings = await loadBookingsWithPaidTotals(req.clientId!);

    const rows = bookings
      .filter((b) => !customerId || b.customer.id === customerId)
      .map((b) => {
        const pendingInPaise = Math.max(b.amountInPaise - b.paidInPaise, 0);
        const status = pendingInPaise === 0 ? "PAID" : b.paidInPaise > 0 ? "PARTIALLY_PAID" : "UNPAID";
        return {
          bookingId: b.id,
          customer: b.customer,
          totalInPaise: b.amountInPaise,
          paidInPaise: b.paidInPaise,
          pendingInPaise,
          dueDate: b.paymentDueDate,
          status,
        };
      })
      .filter((r) => !paymentStatus || r.status === paymentStatus)
      .sort((a, b) => b.pendingInPaise - a.pendingInPaise);

    return ok(res, rows);
  } catch (err) {
    next(err);
  }
});
