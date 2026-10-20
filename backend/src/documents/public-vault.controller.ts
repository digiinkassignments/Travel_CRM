import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";

export const publicVaultRouter = Router();

// --- GET /api/public/vault/:shareToken ---
publicVaultRouter.get("/:shareToken", async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { docShareToken: shareToken },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        client: {
          include: {
            companyProfile: {
              select: {
                companyName: true,
                logoUrl: true,
                phone: true,
                email: true,
                primaryColor: true,
              },
            },
          },
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
      return fail(res, 404, "Invalid or expired document upload link", "NOT_FOUND");
    }

    const company = booking.client.companyProfile || {
      companyName: booking.client.businessName,
      logoUrl: null,
      phone: null,
      email: null,
      primaryColor: "#2563eb",
    };

    return ok(res, {
      booking: {
        id: booking.id,
        travelStart: booking.travelStart,
        travelEnd: booking.travelEnd,
        status: booking.status,
        customer: booking.customer,
      },
      company,
      travelers: booking.travelers,
      documents: booking.documents,
    });
  } catch (err) {
    next(err);
  }
});

// --- POST /api/public/vault/:shareToken/traveler ---
const guestAddTravelerSchema = z.object({
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
});

publicVaultRouter.post("/:shareToken/traveler", async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    const body = guestAddTravelerSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({
      where: { docShareToken: shareToken },
    });
    if (!booking) {
      return fail(res, 404, "Invalid or expired document upload link", "NOT_FOUND");
    }

    const traveler = await prisma.bookingTraveler.create({
      data: {
        clientId: booking.clientId,
        bookingId: booking.id,
        ...body,
        isLeadPassenger: false,
      },
    });

    return ok(res, traveler, "Traveler added successfully");
  } catch (err) {
    next(err);
  }
});

// --- POST /api/public/vault/:shareToken/upload ---
const guestUploadDocSchema = z.object({
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
  fileUrl: z.string().min(1, "File data is required"),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  notes: z.string().optional(),
});

publicVaultRouter.post("/:shareToken/upload", async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    const body = guestUploadDocSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({
      where: { docShareToken: shareToken },
    });
    if (!booking) {
      return fail(res, 404, "Invalid or expired document upload link", "NOT_FOUND");
    }

    const doc = await prisma.bookingDocument.create({
      data: {
        clientId: booking.clientId,
        bookingId: booking.id,
        travelerId: body.travelerId || null,
        category: body.category,
        title: body.title,
        fileUrl: body.fileUrl,
        fileType: body.fileType,
        fileSize: body.fileSize,
        verificationStatus: "PENDING",
        uploadedBy: "CUSTOMER",
        notes: body.notes,
      },
      include: { traveler: { select: { id: true, fullName: true } } },
    });

    return ok(res, doc, "Document uploaded successfully");
  } catch (err) {
    next(err);
  }
});
