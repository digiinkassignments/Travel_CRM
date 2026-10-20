import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok, fail } from "../common/response";

export const publicDutySlipRouter = Router({ mergeParams: true });

// -------------------------------------------------------------
// GET /api/public/duty-slip/:shareToken
// Public mobile driver view for a duty slip
// -------------------------------------------------------------
publicDutySlipRouter.get("/:shareToken", async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const dutySlip = await prisma.dutySlip.findUnique({
      where: { shareToken },
      include: {
        expenses: {
          orderBy: { createdAt: "asc" },
        },
        trip: {
          include: {
            vehicle: true,
            driver: true,
            booking: {
              include: {
                customer: { select: { name: true, phone: true, email: true } },
              },
            },
          },
        },
        client: {
          include: {
            companyProfile: true,
          },
        },
      },
    });

    if (!dutySlip) {
      return fail(res, 404, "Duty slip not found or invalid link", "NOT_FOUND");
    }

    return ok(res, dutySlip);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// POST /api/public/duty-slip/:shareToken/upload
// Upload Odometer photos or Expense receipts from mobile camera
// -------------------------------------------------------------
const uploadSchema = z.object({
  dataUrl: z.string().min(1, "Image payload is required"),
  fileName: z.string().optional(),
});

publicDutySlipRouter.post("/:shareToken/upload", async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    const dutySlip = await prisma.dutySlip.findUnique({ where: { shareToken } });
    if (!dutySlip) return fail(res, 404, "Duty slip not found", "NOT_FOUND");

    const input = uploadSchema.parse(req.body);

    // If payload is data:image/...;base64, decode and save to uploads/duty-slips
    const matches = input.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      const ext = mimeType.split("/")[1] || "jpg";
      const cleanExt = ext.replace("jpeg", "jpg");
      const fileName = `ds_${dutySlip.id.slice(-6)}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${cleanExt}`;

      const uploadsDir = path.resolve(__dirname, "../../uploads/duty-slips");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/duty-slips/${fileName}`;
      return ok(res, { url: publicUrl }, "Photo uploaded successfully");
    }

    // Otherwise return input url directly if already a URL
    return ok(res, { url: input.dataUrl }, "Photo uploaded successfully");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// POST /api/public/duty-slip/:shareToken/arrive
// Driver Confirms Arrival at Pickup Point
// -------------------------------------------------------------
publicDutySlipRouter.post("/:shareToken/arrive", async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    const dutySlip = await prisma.dutySlip.findUnique({ where: { shareToken } });
    if (!dutySlip) return fail(res, 404, "Duty slip not found", "NOT_FOUND");

    const updatedSlip = await prisma.dutySlip.update({
      where: { id: dutySlip.id },
      data: {
        status: dutySlip.status === "GENERATED" ? "DISPATCHED" : dutySlip.status,
      },
      include: { expenses: true },
    });

    return ok(res, updatedSlip, "Chauffeur arrival at pickup point confirmed!");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// POST /api/public/duty-slip/:shareToken/start
// Driver Starts Duty: Opening Odometer + Optional Photo
// -------------------------------------------------------------
const startDutySchema = z.object({
  startOdometer: z.number().int().nonnegative("Start Odometer must be positive"),
  startOdoPhotoUrl: z.string().optional(),
});

publicDutySlipRouter.post("/:shareToken/start", async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const dutySlip = await prisma.dutySlip.findUnique({
      where: { shareToken },
      include: { trip: true },
    });
    if (!dutySlip) return fail(res, 404, "Duty slip not found", "NOT_FOUND");

    if (dutySlip.status === "COMPLETED" || dutySlip.status === "BILLED") {
      return fail(res, 400, "Duty slip is already completed", "ALREADY_COMPLETED");
    }

    const input = startDutySchema.parse(req.body);
    const now = new Date();

    const [updatedSlip] = await prisma.$transaction([
      prisma.dutySlip.update({
        where: { id: dutySlip.id },
        data: {
          startOdometer: input.startOdometer,
          startOdoPhotoUrl: input.startOdoPhotoUrl || null,
          startTime: now,
          status: "STARTED",
        },
        include: { expenses: true },
      }),
      prisma.trip.update({
        where: { id: dutySlip.tripId },
        data: { status: "IN_PROGRESS" },
      }),
    ]);

    // Mark vehicle as ON_TRIP
    if (dutySlip.trip?.vehicleId) {
      await prisma.vehicle.update({
        where: { id: dutySlip.trip.vehicleId },
        data: { operationalStatus: "ON_TRIP" },
      }).catch(() => {});
    }

    return ok(res, updatedSlip, "Trip started successfully! Have a safe journey.");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// POST /api/public/duty-slip/:shareToken/expense
// Driver logs on-trip Toll, Parking, State Tax, or Fuel expense
// -------------------------------------------------------------
const addExpenseSchema = z.object({
  expenseType: z.enum(["TOLL", "PARKING", "STATE_TAX", "FUEL", "DRIVER_ALLOWANCE", "MISC"]).default("TOLL"),
  amountInPaise: z.number().int().positive("Amount must be greater than 0"),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

publicDutySlipRouter.post("/:shareToken/expense", async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const dutySlip = await prisma.dutySlip.findUnique({
      where: { shareToken },
    });
    if (!dutySlip) return fail(res, 404, "Duty slip not found", "NOT_FOUND");

    const input = addExpenseSchema.parse(req.body);

    const expense = await prisma.dutySlipExpense.create({
      data: {
        clientId: dutySlip.clientId,
        dutySlipId: dutySlip.id,
        expenseType: input.expenseType,
        amountInPaise: input.amountInPaise,
        receiptUrl: input.receiptUrl || null,
        notes: input.notes || null,
      },
    });

    // Update aggregate sums on DutySlip
    const updateData: any = {
      totalExpensesInPaise: { increment: input.amountInPaise },
    };

    if (input.expenseType === "TOLL") updateData.tollChargesInPaise = { increment: input.amountInPaise };
    if (input.expenseType === "PARKING") updateData.parkingChargesInPaise = { increment: input.amountInPaise };
    if (input.expenseType === "STATE_TAX") updateData.stateTaxInPaise = { increment: input.amountInPaise };
    if (input.expenseType === "FUEL") updateData.fuelChargesInPaise = { increment: input.amountInPaise };
    if (input.expenseType === "DRIVER_ALLOWANCE") updateData.driverAllowanceInPaise = { increment: input.amountInPaise };
    if (input.expenseType === "MISC") updateData.otherChargesInPaise = { increment: input.amountInPaise };

    const updatedSlip = await prisma.dutySlip.update({
      where: { id: dutySlip.id },
      data: updateData,
      include: { expenses: true },
    });

    return ok(res, { expense, dutySlip: updatedSlip }, "Expense recorded successfully");
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// POST /api/public/duty-slip/:shareToken/complete
// Driver Ends Duty: Closing Odometer + Customer Touch Signature
// -------------------------------------------------------------
const completeDutySchema = z.object({
  endOdometer: z.number().int().nonnegative("End Odometer must be non-negative"),
  endOdoPhotoUrl: z.string().optional(),
  customerSignature: z.string().optional(), // Base64 data URL
  customerRating: z.number().int().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
});

publicDutySlipRouter.post("/:shareToken/complete", async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    const dutySlip = await prisma.dutySlip.findUnique({
      where: { shareToken },
      include: { trip: true },
    });
    if (!dutySlip) return fail(res, 404, "Duty slip not found", "NOT_FOUND");

    const input = completeDutySchema.parse(req.body);

    const startOdo = dutySlip.startOdometer || 0;
    if (input.endOdometer < startOdo) {
      return fail(
        res,
        400,
        `Closing KM (${input.endOdometer}) cannot be less than Opening KM (${startOdo})`,
        "INVALID_ODOMETER"
      );
    }

    const totalKm = input.endOdometer - startOdo;
    const now = new Date();
    const startTime = dutySlip.startTime || now;
    const durationMs = Math.max(0, now.getTime() - startTime.getTime());
    const totalHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;

    const [updatedSlip] = await prisma.$transaction([
      prisma.dutySlip.update({
        where: { id: dutySlip.id },
        data: {
          endOdometer: input.endOdometer,
          endOdoPhotoUrl: input.endOdoPhotoUrl || null,
          totalKm,
          endTime: now,
          totalHours,
          customerSignature: input.customerSignature || null,
          customerRating: input.customerRating || null,
          customerFeedback: input.customerFeedback || null,
          status: "COMPLETED",
        },
        include: { expenses: true },
      }),
      prisma.trip.update({
        where: { id: dutySlip.tripId },
        data: { status: "COMPLETED" },
      }),
    ]);

    // Update vehicle's live odometer & return to AVAILABLE status
    if (dutySlip.trip?.vehicleId) {
      await prisma.vehicle.update({
        where: { id: dutySlip.trip.vehicleId },
        data: {
          currentOdometer: input.endOdometer,
          operationalStatus: "AVAILABLE",
        },
      }).catch(() => {});
    }

    // Set driver back to available
    if (dutySlip.trip?.driverId) {
      await prisma.driver.update({
        where: { id: dutySlip.trip.driverId },
        data: { isAvailable: true },
      }).catch(() => {});
    }

    return ok(res, updatedSlip, "Duty completed successfully! Thank you.");
  } catch (err) {
    next(err);
  }
});
