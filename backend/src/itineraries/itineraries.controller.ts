import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";
import { logTenantAction } from "../audit/audit.service";

export const itinerariesRouter = Router();

// Professional+ entitlement (shares quotation module entitlement or standalone)
itinerariesRouter.use(authenticate, scopeTenant(), requireEntitlement("quotation"));

// Photo upload directory for itineraries
const itineraryUploadDir = path.resolve(__dirname, "../../uploads/itineraries");
fs.mkdirSync(itineraryUploadDir, { recursive: true });

const itineraryPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: itineraryUploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `itn-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.mimetype));
  },
});

function generateShareSlug(title: string): string {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  return `${cleanTitle || "trip"}-${randomSuffix}`;
}

const dayInputSchema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.string().datetime().optional().nullable(),
  title: z.string().min(1),
  stayCity: z.string().optional().nullable(),
  description: z.string().default(""),
  meals: z.array(z.string()).default([]),
  hotelName: z.string().optional().nullable(),
  roomCategory: z.string().optional().nullable(),
  hotelRating: z.number().int().min(1).max(5).optional().nullable(),
  transferDetails: z.string().optional().nullable(),
  photos: z.array(z.string()).default([]),
});

const pricingTierInputSchema = z.object({
  tierName: z.string().min(1),
  pricePerPerson: z.number().int().nonnegative().default(0), // in Paise
  totalPrice: z.number().int().nonnegative().default(0),      // in Paise
  hotelOverview: z.string().optional().nullable(),
  isRecommended: z.boolean().default(false),
});

const itineraryInputSchema = z.object({
  tripTitle: z.string().min(1).max(180),
  destination: z.string().min(1).max(120),
  enquiryId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  totalDays: z.number().int().min(1).default(1),
  totalNights: z.number().int().min(0).default(0),
  adultsCount: z.number().int().min(1).default(1),
  childrenCount: z.number().int().min(0).default(0),
  coverImageUrl: z.string().url().or(z.string().startsWith("/uploads/")).optional().nullable(),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  termsAndConditions: z.string().optional().nullable(),
  cancellationPolicy: z.string().optional().nullable(),
  showPricing: z.boolean().default(true),
  showHotels: z.boolean().default(true),
  allowDirectAccept: z.boolean().default(true),
  days: z.array(dayInputSchema).default([]),
  pricingTiers: z.array(pricingTierInputSchema).default([]),
});

// --- Upload Photo ---
itinerariesRouter.post(
  "/upload-photo",
  requirePermission("quotations", "edit"),
  itineraryPhotoUpload.single("photo"),
  (req, res) => {
    if (!req.file) {
      return fail(res, 400, "VALIDATION_FAILED", "No valid image file uploaded (JPG, PNG, WebP up to 5MB)");
    }
    const relativeUrl = `/uploads/itineraries/${req.file.filename}`;
    return ok(res, { url: relativeUrl });
  }
);

// --- List Itineraries ---
itinerariesRouter.get("/", requirePermission("quotations", "view"), async (req, res, next) => {
  try {
    const { status, destination, customerId, enquiryId } = req.query as Record<string, string | undefined>;
    const itineraries = await prisma.itinerary.findMany({
      where: {
        clientId: req.clientId!,
        ...(status ? { status: status as any } : {}),
        ...(destination ? { destination: { contains: destination } } : {}),
        ...(customerId ? { customerId } : {}),
        ...(enquiryId ? { enquiryId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        enquiry: { select: { id: true, destination: true, travelDate: true } },
        _count: { select: { days: true, pricingTiers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok(res, itineraries);
  } catch (err) {
    next(err);
  }
});

// --- Get Single Itinerary ---
itinerariesRouter.get("/:id", requirePermission("quotations", "view"), async (req, res, next) => {
  try {
    const itinerary = await prisma.itinerary.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: {
        customer: true,
        enquiry: true,
        days: { orderBy: { dayNumber: "asc" } },
        pricingTiers: { orderBy: { totalPrice: "asc" } },
      },
    });
    if (!itinerary) {
      return fail(res, 404, "NOT_FOUND", "Itinerary not found");
    }
    return ok(res, itinerary);
  } catch (err) {
    next(err);
  }
});

// --- Create Itinerary ---
itinerariesRouter.post("/", requirePermission("quotations", "add"), async (req, res, next) => {
  try {
    const parsed = itineraryInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Invalid itinerary data");
    }
    const input = parsed.data;
    const shareSlug = generateShareSlug(input.tripTitle);

    const created = await prisma.$transaction(async (tx) => {
      const itn = await tx.itinerary.create({
        data: {
          clientId: req.clientId!,
          shareSlug,
          tripTitle: input.tripTitle,
          destination: input.destination,
          enquiryId: input.enquiryId || null,
          customerId: input.customerId || null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          totalDays: input.totalDays,
          totalNights: input.totalNights,
          adultsCount: input.adultsCount,
          childrenCount: input.childrenCount,
          coverImageUrl: input.coverImageUrl || null,
          inclusions: input.inclusions,
          exclusions: input.exclusions,
          termsAndConditions: input.termsAndConditions || null,
          cancellationPolicy: input.cancellationPolicy || null,
          showPricing: input.showPricing,
          showHotels: input.showHotels,
          allowDirectAccept: input.allowDirectAccept,
          days: {
            create: input.days.map((d, index) => ({
              dayNumber: d.dayNumber || index + 1,
              date: d.date ? new Date(d.date) : null,
              title: d.title,
              stayCity: d.stayCity || null,
              description: d.description,
              meals: d.meals,
              hotelName: d.hotelName || null,
              roomCategory: d.roomCategory || null,
              hotelRating: d.hotelRating || null,
              transferDetails: d.transferDetails || null,
              photos: d.photos,
            })),
          },
          pricingTiers: {
            create: input.pricingTiers.map((tier) => ({
              tierName: tier.tierName,
              pricePerPerson: tier.pricePerPerson,
              totalPrice: tier.totalPrice,
              hotelOverview: tier.hotelOverview || null,
              isRecommended: tier.isRecommended,
            })),
          },
        },
        include: {
          days: { orderBy: { dayNumber: "asc" } },
          pricingTiers: true,
          customer: true,
        },
      });

      // If tied to enquiry, update enquiry status to QUOTED
      if (input.enquiryId) {
        await tx.enquiry.update({
          where: { id: input.enquiryId },
          data: { status: "QUOTED" },
        });
      }

      return itn;
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth?.sub,
      action: "ITINERARY_CREATED",
      target: created.id,
      metadata: { title: created.tripTitle, destination: created.destination, days: created.totalDays },
    });

    return ok(res, created, "Itinerary created successfully");
  } catch (err) {
    next(err);
  }
});

// --- Update Itinerary ---
itinerariesRouter.put("/:id", requirePermission("quotations", "edit"), async (req, res, next) => {
  try {
    const existing = await prisma.itinerary.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
    });
    if (!existing) {
      return fail(res, 404, "NOT_FOUND", "Itinerary not found");
    }

    const parsed = itineraryInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Invalid itinerary data");
    }
    const input = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      // Delete old days and pricing tiers to replace with updated order
      await tx.itineraryDay.deleteMany({ where: { itineraryId: existing.id } });
      await tx.itineraryPricingTier.deleteMany({ where: { itineraryId: existing.id } });

      return tx.itinerary.update({
        where: { id: existing.id },
        data: {
          tripTitle: input.tripTitle,
          destination: input.destination,
          enquiryId: input.enquiryId || null,
          customerId: input.customerId || null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          totalDays: input.totalDays,
          totalNights: input.totalNights,
          adultsCount: input.adultsCount,
          childrenCount: input.childrenCount,
          coverImageUrl: input.coverImageUrl || null,
          inclusions: input.inclusions,
          exclusions: input.exclusions,
          termsAndConditions: input.termsAndConditions || null,
          cancellationPolicy: input.cancellationPolicy || null,
          showPricing: input.showPricing,
          showHotels: input.showHotels,
          allowDirectAccept: input.allowDirectAccept,
          days: {
            create: input.days.map((d, index) => ({
              dayNumber: d.dayNumber || index + 1,
              date: d.date ? new Date(d.date) : null,
              title: d.title,
              stayCity: d.stayCity || null,
              description: d.description,
              meals: d.meals,
              hotelName: d.hotelName || null,
              roomCategory: d.roomCategory || null,
              hotelRating: d.hotelRating || null,
              transferDetails: d.transferDetails || null,
              photos: d.photos,
            })),
          },
          pricingTiers: {
            create: input.pricingTiers.map((tier) => ({
              tierName: tier.tierName,
              pricePerPerson: tier.pricePerPerson,
              totalPrice: tier.totalPrice,
              hotelOverview: tier.hotelOverview || null,
              isRecommended: tier.isRecommended,
            })),
          },
        },
        include: {
          days: { orderBy: { dayNumber: "asc" } },
          pricingTiers: true,
          customer: true,
        },
      });
    });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth?.sub,
      action: "ITINERARY_UPDATED",
      target: updated.id,
      metadata: { title: updated.tripTitle },
    });

    return ok(res, updated, "Itinerary updated successfully");
  } catch (err) {
    next(err);
  }
});

// --- Duplicate Itinerary ---
itinerariesRouter.post("/:id/duplicate", requirePermission("quotations", "add"), async (req, res, next) => {
  try {
    const original = await prisma.itinerary.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: { days: true, pricingTiers: true },
    });
    if (!original) {
      return fail(res, 404, "NOT_FOUND", "Itinerary not found");
    }

    const newTitle = `${original.tripTitle} (Copy)`;
    const newSlug = generateShareSlug(newTitle);

    const duplicated = await prisma.itinerary.create({
      data: {
        clientId: req.clientId!,
        shareSlug: newSlug,
        tripTitle: newTitle,
        destination: original.destination,
        enquiryId: original.enquiryId,
        customerId: original.customerId,
        startDate: original.startDate,
        endDate: original.endDate,
        totalDays: original.totalDays,
        totalNights: original.totalNights,
        adultsCount: original.adultsCount,
        childrenCount: original.childrenCount,
        coverImageUrl: original.coverImageUrl,
        inclusions: original.inclusions ?? [],
        exclusions: original.exclusions ?? [],
        termsAndConditions: original.termsAndConditions,
        cancellationPolicy: original.cancellationPolicy,
        showPricing: original.showPricing,
        showHotels: original.showHotels,
        allowDirectAccept: original.allowDirectAccept,
        days: {
          create: original.days.map((d) => ({
            dayNumber: d.dayNumber,
            date: d.date,
            title: d.title,
            stayCity: d.stayCity,
            description: d.description,
            meals: d.meals ?? [],
            hotelName: d.hotelName,
            roomCategory: d.roomCategory,
            hotelRating: d.hotelRating,
            transferDetails: d.transferDetails,
            photos: d.photos ?? [],
          })),
        },
        pricingTiers: {
          create: original.pricingTiers.map((t) => ({
            tierName: t.tierName,
            pricePerPerson: t.pricePerPerson,
            totalPrice: t.totalPrice,
            hotelOverview: t.hotelOverview,
            isRecommended: t.isRecommended,
          })),
        },
      },
      include: { days: { orderBy: { dayNumber: "asc" } }, pricingTiers: true },
    });

    return ok(res, duplicated, "Itinerary duplicated successfully");
  } catch (err) {
    next(err);
  }
});

// --- Delete Itinerary ---
itinerariesRouter.delete("/:id", requirePermission("quotations", "delete"), async (req, res, next) => {
  try {
    const existing = await prisma.itinerary.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
    });
    if (!existing) {
      return fail(res, 404, "NOT_FOUND", "Itinerary not found");
    }

    await prisma.itinerary.delete({ where: { id: existing.id } });

    await logTenantAction({
      clientId: req.clientId!,
      userId: req.auth?.sub,
      action: "ITINERARY_DELETED",
      target: existing.id,
      metadata: { title: existing.tripTitle },
    });

    return ok(res, { success: true });
  } catch (err) {
    next(err);
  }
});

// --- Tour Templates (Reusable Master Itineraries) ---
itinerariesRouter.get("/templates/all", requirePermission("quotations", "view"), async (req, res, next) => {
  try {
    const templates = await prisma.tourTemplate.findMany({
      where: { clientId: req.clientId! },
      orderBy: { createdAt: "desc" },
    });
    return ok(res, templates);
  } catch (err) {
    next(err);
  }
});

itinerariesRouter.post("/templates/save-from-itinerary/:id", requirePermission("quotations", "add"), async (req, res, next) => {
  try {
    const itn = await prisma.itinerary.findFirst({
      where: { id: req.params.id, clientId: req.clientId! },
      include: { days: { orderBy: { dayNumber: "asc" } } },
    });
    if (!itn) {
      return fail(res, 404, "NOT_FOUND", "Itinerary not found");
    }

    const template = await prisma.tourTemplate.create({
      data: {
        clientId: req.clientId!,
        title: itn.tripTitle,
        destination: itn.destination,
        totalDays: itn.totalDays,
        totalNights: itn.totalNights,
        coverImageUrl: itn.coverImageUrl,
        defaultInclusions: itn.inclusions ?? [],
        defaultExclusions: itn.exclusions ?? [],
        defaultTerms: itn.termsAndConditions,
        days: itn.days.map((d) => ({
          dayNumber: d.dayNumber,
          title: d.title,
          stayCity: d.stayCity,
          description: d.description,
          meals: d.meals,
          hotelName: d.hotelName,
          roomCategory: d.roomCategory,
          hotelRating: d.hotelRating,
          transferDetails: d.transferDetails,
          photos: d.photos,
        })),
      },
    });

    return ok(res, template, "Tour template saved successfully");
  } catch (err) {
    next(err);
  }
});
