import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";

export const bookingVaultRouter = Router();

bookingVaultRouter.use(authenticate, scopeTenant(), requireEntitlement("bookings"));

// --- Helper: Check Passport Expiry (< 6 Months Warning) ---
function checkPassportWarning(passportExpiry: Date | null | undefined, travelStart: Date | null | undefined) {
  if (!passportExpiry) return null;
  const refDate = travelStart ? new Date(travelStart) : new Date();
  const sixMonthsAhead = new Date(refDate);
  sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

  const expiry = new Date(passportExpiry);
  if (expiry < refDate) {
    return "EXPIRED";
  }
  if (expiry <= sixMonthsAhead) {
    return "EXPIRING_SOON"; // < 6 months validity
  }
  return "VALID";
}

// --- GET /api/bookings/:bookingId/vault ---
bookingVaultRouter.get("/:bookingId/vault", async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientId: req.clientId! },
      include: {
        customer: true,
        client: {
          include: { companyProfile: true },
        },
        travelers: {
          orderBy: [{ isLeadPassenger: "desc" }, { createdAt: "asc" }],
          include: { documents: true },
        },
        documents: {
          orderBy: { createdAt: "desc" },
          include: { traveler: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!booking) {
      return fail(res, 404, "Booking not found", "NOT_FOUND");
    }

    // Ensure docShareToken exists
    let shareToken = booking.docShareToken;
    if (!shareToken) {
      shareToken = crypto.randomBytes(24).toString("hex");
      await prisma.booking.update({
        where: { id: booking.id },
        data: { docShareToken: shareToken },
      });
    }

    // Process travelers with expiry warnings
    const travelersWithWarning = booking.travelers.map((t) => ({
      ...t,
      passportWarning: checkPassportWarning(t.passportExpiry, booking.travelStart),
    }));

    return ok(res, {
      booking: {
        id: booking.id,
        travelStart: booking.travelStart,
        travelEnd: booking.travelEnd,
        status: booking.status,
        docShareToken: shareToken,
        customer: booking.customer,
      },
      travelers: travelersWithWarning,
      documents: booking.documents,
    });
  } catch (err) {
    next(err);
  }
});

// --- POST /api/bookings/:bookingId/travelers ---
const createTravelerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  travelerType: z.enum(["ADULT", "CHILD", "INFANT"]).default("ADULT"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("MALE"),
  dateOfBirth: z.coerce.date().optional(),
  nationality: z.string().optional().default("Indian"),
  passportNumber: z.string().optional(),
  passportExpiry: z.coerce.date().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  foodPreference: z.string().optional(),
  specialRequests: z.string().optional(),
  isLeadPassenger: z.boolean().default(false),
});

bookingVaultRouter.post("/:bookingId/travelers", async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const body = createTravelerSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientId: req.clientId! },
    });
    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");

    // If this is set as lead passenger, unset other lead passengers
    if (body.isLeadPassenger) {
      await prisma.bookingTraveler.updateMany({
        where: { bookingId, clientId: req.clientId! },
        data: { isLeadPassenger: false },
      });
    }

    const traveler = await prisma.bookingTraveler.create({
      data: {
        clientId: req.clientId!,
        bookingId,
        ...body,
      },
    });

    return ok(res, traveler, "Traveler added successfully");
  } catch (err) {
    next(err);
  }
});

// --- PATCH /api/bookings/:bookingId/travelers/:travelerId ---
bookingVaultRouter.patch("/:bookingId/travelers/:travelerId", async (req, res, next) => {
  try {
    const { bookingId, travelerId } = req.params;
    const body = createTravelerSchema.partial().parse(req.body);

    const existing = await prisma.bookingTraveler.findFirst({
      where: { id: travelerId, bookingId, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Traveler not found", "NOT_FOUND");

    if (body.isLeadPassenger) {
      await prisma.bookingTraveler.updateMany({
        where: { bookingId, clientId: req.clientId!, id: { not: travelerId } },
        data: { isLeadPassenger: false },
      });
    }

    const updated = await prisma.bookingTraveler.update({
      where: { id: travelerId },
      data: body,
    });

    return ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// --- DELETE /api/bookings/:bookingId/travelers/:travelerId ---
bookingVaultRouter.delete("/:bookingId/travelers/:travelerId", async (req, res, next) => {
  try {
    const { bookingId, travelerId } = req.params;

    const existing = await prisma.bookingTraveler.findFirst({
      where: { id: travelerId, bookingId, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Traveler not found", "NOT_FOUND");

    await prisma.bookingTraveler.delete({ where: { id: travelerId } });

    return ok(res, { success: true, message: "Traveler removed from manifest" });
  } catch (err) {
    next(err);
  }
});

// --- POST /api/bookings/:bookingId/documents ---
const createDocumentSchema = z.object({
  title: z.string().min(1, "Document title is required"),
  category: z.enum([
    "PASSPORT_FRONT",
    "PASSPORT_BACK",
    "AADHAAR_FRONT",
    "AADHAAR_BACK",
    "PAN_CARD",
    "DRIVING_LICENSE",
    "VISA",
    "AIR_TICKET",
    "TRAVEL_INSURANCE",
    "VACCINATION_CERT",
    "HOTEL_VOUCHER",
    "PERMIT",
    "OTHER",
  ]).default("OTHER"),
  travelerId: z.string().optional(),
  fileUrl: z.string().min(1, "File data or URL is required"),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).default("VERIFIED"),
  notes: z.string().optional(),
});

bookingVaultRouter.post("/:bookingId/documents", async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const body = createDocumentSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientId: req.clientId! },
    });
    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const doc = await prisma.bookingDocument.create({
      data: {
        clientId: req.clientId!,
        bookingId,
        travelerId: body.travelerId || null,
        category: body.category,
        title: body.title,
        fileUrl: body.fileUrl,
        fileType: body.fileType,
        fileSize: body.fileSize,
        verificationStatus: body.verificationStatus,
        uploadedBy: (req as any).user?.name || "AGENCY_STAFF",
        notes: body.notes,
      },
      include: { traveler: { select: { id: true, fullName: true } } },
    });

    return ok(res, doc, "Document uploaded successfully");
  } catch (err) {
    next(err);
  }
});

// --- PATCH /api/bookings/:bookingId/documents/:docId/verify ---
const verifyDocSchema = z.object({
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

bookingVaultRouter.patch("/:bookingId/documents/:docId/verify", async (req, res, next) => {
  try {
    const { bookingId, docId } = req.params;
    const body = verifyDocSchema.parse(req.body);

    const existing = await prisma.bookingDocument.findFirst({
      where: { id: docId, bookingId, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Document not found", "NOT_FOUND");

    const updated = await prisma.bookingDocument.update({
      where: { id: docId },
      data: {
        verificationStatus: body.verificationStatus,
        rejectionReason: body.verificationStatus === "REJECTED" ? body.rejectionReason : null,
      },
      include: { traveler: { select: { id: true, fullName: true } } },
    });

    return ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// --- DELETE /api/bookings/:bookingId/documents/:docId ---
bookingVaultRouter.delete("/:bookingId/documents/:docId", async (req, res, next) => {
  try {
    const { bookingId, docId } = req.params;

    const existing = await prisma.bookingDocument.findFirst({
      where: { id: docId, bookingId, clientId: req.clientId! },
    });
    if (!existing) return fail(res, 404, "Document not found", "NOT_FOUND");

    await prisma.bookingDocument.delete({ where: { id: docId } });

    return ok(res, { success: true, message: "Document deleted" });
  } catch (err) {
    next(err);
  }
});

// --- POST /api/bookings/:bookingId/vault/token (Regenerate Share Token) ---
bookingVaultRouter.post("/:bookingId/vault/token", async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientId: req.clientId! },
    });
    if (!booking) return fail(res, 404, "Booking not found", "NOT_FOUND");

    const newToken = crypto.randomBytes(24).toString("hex");
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { docShareToken: newToken },
    });

    return ok(res, { docShareToken: updated.docShareToken });
  } catch (err) {
    next(err);
  }
});
