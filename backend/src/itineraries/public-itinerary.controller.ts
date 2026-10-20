import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";

export const publicItineraryRouter = Router();

// --- View Itinerary by Share Slug (No Auth Required) ---
publicItineraryRouter.get("/:shareSlug", async (req, res, next) => {
  try {
    const { shareSlug } = req.params;

    const itinerary = await prisma.itinerary.findUnique({
      where: { shareSlug },
      include: {
        days: { orderBy: { dayNumber: "asc" } },
        pricingTiers: { orderBy: { totalPrice: "asc" } },
        client: {
          select: {
            id: true,
            businessName: true,
            email: true,
            phone: true,
            subscriptionStatus: true,
            companyProfile: {
              select: {
                companyName: true,
                logoUrl: true,
                phone: true,
                email: true,
                address: true,
                primaryColor: true,
                secondaryColor: true,
                whatsappNumber: true,
                websiteUrl: true,
                itineraryFooterNotes: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!itinerary) {
      return fail(res, 404, "NOT_FOUND", "Travel proposal or itinerary not found");
    }

    // Check if agency account is locked/deleted
    if (itinerary.client.subscriptionStatus === "LOCKED" || itinerary.client.subscriptionStatus === "DELETED") {
      return fail(res, 403, "SUBSCRIPTION_INACTIVE", "This travel agency account is currently inactive.");
    }

    const agency = {
      name: itinerary.client.companyProfile?.companyName || itinerary.client.businessName,
      logoUrl: itinerary.client.companyProfile?.logoUrl || null,
      phone: itinerary.client.companyProfile?.phone || itinerary.client.phone,
      email: itinerary.client.companyProfile?.email || itinerary.client.email,
      address: itinerary.client.companyProfile?.address || null,
      primaryColor: itinerary.client.companyProfile?.primaryColor || "#2563eb",
      secondaryColor: itinerary.client.companyProfile?.secondaryColor || "#0f172a",
      whatsappNumber: itinerary.client.companyProfile?.whatsappNumber || itinerary.client.phone,
      websiteUrl: itinerary.client.companyProfile?.websiteUrl || null,
      footerNotes: itinerary.client.companyProfile?.itineraryFooterNotes || null,
    };

    // Filter hotels/pricing if agency toggled them off
    const days = itinerary.days.map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title,
      stayCity: day.stayCity,
      description: day.description,
      meals: day.meals,
      hotelName: itinerary.showHotels ? day.hotelName : null,
      roomCategory: itinerary.showHotels ? day.roomCategory : null,
      hotelRating: itinerary.showHotels ? day.hotelRating : null,
      transferDetails: day.transferDetails,
      photos: day.photos,
    }));

    const pricingTiers = itinerary.showPricing
      ? itinerary.pricingTiers.map((tier) => ({
          id: tier.id,
          tierName: tier.tierName,
          pricePerPerson: tier.pricePerPerson,
          totalPrice: tier.totalPrice,
          hotelOverview: itinerary.showHotels ? tier.hotelOverview : null,
          isRecommended: tier.isRecommended,
        }))
      : [];

    return ok(res, {
      id: itinerary.id,
      shareSlug: itinerary.shareSlug,
      tripTitle: itinerary.tripTitle,
      destination: itinerary.destination,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      totalDays: itinerary.totalDays,
      totalNights: itinerary.totalNights,
      adultsCount: itinerary.adultsCount,
      childrenCount: itinerary.childrenCount,
      coverImageUrl: itinerary.coverImageUrl,
      inclusions: itinerary.inclusions,
      exclusions: itinerary.exclusions,
      termsAndConditions: itinerary.termsAndConditions,
      cancellationPolicy: itinerary.cancellationPolicy,
      status: itinerary.status,
      allowDirectAccept: itinerary.allowDirectAccept,
      showPricing: itinerary.showPricing,
      showHotels: itinerary.showHotels,
      customerName: itinerary.customer?.name,
      agency,
      days,
      pricingTiers,
    });
  } catch (err) {
    next(err);
  }
});

// --- Accept Itinerary by Traveler ---
publicItineraryRouter.post("/:shareSlug/accept", async (req, res, next) => {
  try {
    const { shareSlug } = req.params;
    const itinerary = await prisma.itinerary.findUnique({
      where: { shareSlug },
    });

    if (!itinerary) {
      return fail(res, 404, "NOT_FOUND", "Itinerary not found");
    }

    if (!itinerary.allowDirectAccept) {
      return fail(res, 400, "ACCEPT_DISABLED", "Direct online acceptance is disabled for this proposal.");
    }

    const updated = await prisma.itinerary.update({
      where: { id: itinerary.id },
      data: { status: "ACCEPTED" },
    });

    // If linked to enquiry, update enquiry status to WON
    if (itinerary.enquiryId) {
      await prisma.enquiry.update({
        where: { id: itinerary.enquiryId },
        data: { status: "WON" },
      });
    }

    return ok(res, {
      success: true,
      message: "Thank you! You have successfully accepted this travel itinerary.",
      status: updated.status,
    });
  } catch (err) {
    next(err);
  }
});

// --- Traveler Feedback / Request Customization ---
const feedbackSchema = z.object({
  travelerName: z.string().min(1).max(100),
  phone: z.string().min(5).max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  message: z.string().min(1).max(1000),
});

publicItineraryRouter.post("/:shareSlug/feedback", async (req, res, next) => {
  try {
    const { shareSlug } = req.params;
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, "VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Invalid feedback data");
    }

    const itinerary = await prisma.itinerary.findUnique({
      where: { shareSlug },
      include: { client: true },
    });

    if (!itinerary) {
      return fail(res, 404, "NOT_FOUND", "Itinerary not found");
    }

    // Append feedback as a note in enquiry or customer if available
    if (itinerary.enquiryId) {
      const enquiry = await prisma.enquiry.findUnique({ where: { id: itinerary.enquiryId } });
      const currentNotes = enquiry?.notes ? `${enquiry.notes}\n\n` : "";
      await prisma.enquiry.update({
        where: { id: itinerary.enquiryId },
        data: {
          notes: `${currentNotes}[Traveler Request on ${new Date().toLocaleDateString()}]: ${parsed.data.message} (From: ${parsed.data.travelerName}${parsed.data.phone ? `, Ph: ${parsed.data.phone}` : ""})`,
        },
      });
    }

    return ok(res, {
      success: true,
      message: "Your customization request has been sent directly to the travel planner!",
    });
  } catch (err) {
    next(err);
  }
});
