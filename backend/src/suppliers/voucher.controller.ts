import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { logTenantAction } from "../audit/audit.service";

export const voucherRouter = Router({ mergeParams: true });
export const standaloneVoucherRouter = Router();

voucherRouter.use(authenticate, scopeTenant());
standaloneVoucherRouter.use(authenticate, scopeTenant());

// Helper to generate voucher numbers like VCH-2026-0042
async function generateVoucherNumber(clientId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.hotelVoucher.count({ where: { clientId } });
  const padded = String(count + 1).padStart(4, "0");
  return `VCH-${currentYear}-${padded}`;
}

// -------------------------------------------------------------
// GET /api/bookings/:bookingId/vouchers
// List vouchers for a booking
// -------------------------------------------------------------
voucherRouter.get("/:bookingId/vouchers", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const { bookingId } = req.params;

    const vouchers = await prisma.hotelVoucher.findMany({
      where: { bookingId, clientId },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, city: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(res, vouchers);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// POST /api/bookings/:bookingId/vouchers
// Generate Hotel Confirmation Voucher
// -------------------------------------------------------------
const createVoucherSchema = z.object({
  supplierId: z.string().optional().nullable(),
  hotelName: z.string().trim().min(1, "Hotel name is required"),
  city: z.string().trim().optional(),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  roomCategory: z.string().trim().default("Deluxe Room"),
  numberOfRooms: z.number().int().min(1).default(1),
  mealPlan: z.enum(["EP", "CP", "MAP", "AP"]).default("CP"),
  guestNames: z.array(z.string().trim()).default([]),
  specialRequests: z.string().optional(),
});

voucherRouter.post("/:bookingId/vouchers", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientId },
      include: { customer: true },
    });
    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const input = createVoucherSchema.parse(req.body);

    const voucherNumber = await generateVoucherNumber(clientId);

    // If no guests passed, default to customer name
    const guestList = input.guestNames.length > 0 ? input.guestNames : [booking.customer.name];

    const voucher = await prisma.hotelVoucher.create({
      data: {
        clientId,
        bookingId,
        supplierId: input.supplierId || null,
        voucherNumber,
        hotelName: input.hotelName,
        city: input.city || null,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        roomCategory: input.roomCategory,
        numberOfRooms: input.numberOfRooms,
        mealPlan: input.mealPlan,
        guestNames: guestList,
        specialRequests: input.specialRequests || null,
        status: "ISSUED",
      },
      include: {
        supplier: true,
      },
    });

    await logTenantAction({
      clientId,
      userId: req.auth!.sub,
      action: "GENERATE_HOTEL_VOUCHER",
      target: voucher.id,
      metadata: { voucherNumber, hotelName: input.hotelName, bookingId },
    });

    return ok(res, voucher, "Hotel voucher generated successfully");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// GET /api/vouchers/:id
// Complete voucher document with agency white-label profile
// -------------------------------------------------------------
standaloneVoucherRouter.get("/:id", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const voucher = await prisma.hotelVoucher.findFirst({
      where: { id: req.params.id, clientId },
      include: {
        supplier: true,
        booking: {
          include: {
            customer: true,
          },
        },
        client: {
          include: {
            companyProfile: true,
          },
        },
      },
    });

    if (!voucher) return fail(res, 404, "Voucher not found", "NOT_FOUND");

    return ok(res, voucher);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// PATCH /api/vouchers/:id/status
// -------------------------------------------------------------
standaloneVoucherRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const { status } = z
      .object({ status: z.enum(["ISSUED", "CONFIRMED", "CANCELLED"]) })
      .parse(req.body);

    const existing = await prisma.hotelVoucher.findFirst({
      where: { id: req.params.id, clientId },
    });
    if (!existing) return fail(res, 404, "Voucher not found", "NOT_FOUND");

    const updated = await prisma.hotelVoucher.update({
      where: { id: req.params.id },
      data: { status },
    });

    return ok(res, updated, `Voucher status updated to ${status}`);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// DELETE /api/vouchers/:id
// -------------------------------------------------------------
standaloneVoucherRouter.delete("/:id", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const existing = await prisma.hotelVoucher.findFirst({
      where: { id: req.params.id, clientId },
    });
    if (!existing) return fail(res, 404, "Voucher not found", "NOT_FOUND");

    await prisma.hotelVoucher.delete({ where: { id: req.params.id } });
    return ok(res, null, "Voucher deleted");
  } catch (err) {
    next(err);
  }
});
