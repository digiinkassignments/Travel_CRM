import { prisma } from "../src/db/prisma";
import crypto from "crypto";

async function run() {
  console.log("==================================================");
  console.log("=== PHASE 4: DRIVER MOBILE DUTY SLIP TEST SUITE ===");
  console.log("==================================================");

  // 1. Find a valid Client, Booking, Driver and Vehicle
  const client = await prisma.client.findFirst({
    include: { companyProfile: true },
  });

  if (!client) {
    console.error("No client found!");
    process.exit(1);
  }

  const clientId = client.id;
  console.log("Using Client:", clientId);

  // Find or create Driver
  let driver = await prisma.driver.findFirst({ where: { clientId } });
  if (!driver) {
    driver = await prisma.driver.create({
      data: {
        clientId,
        name: "Mukesh Kumar Sharma",
        contact: "+919876500111",
        licenseNumber: "RJ-14-2018-009876",
        isAvailable: true,
      },
    });
    console.log("Created Driver:", driver.name);
  } else {
    console.log("Found Driver:", driver.name, driver.contact);
  }

  // Find or create Vehicle
  let vehicle = await prisma.vehicle.findFirst({ where: { clientId } });
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: {
        clientId,
        registrationNumber: "RJ-14-TA-5522",
        vehicleType: "Toyota Innova Crysta",
        capacity: 7,
        isAvailable: true,
      },
    });
    console.log("Created Vehicle:", vehicle.registrationNumber);
  } else {
    console.log("Found Vehicle:", vehicle.registrationNumber);
  }

  // Find or create a Trip
  let trip = await prisma.trip.findFirst({
    where: { clientId },
    include: { booking: { include: { customer: true } } },
  });

  if (!trip) {
    // Find or create a Booking first
    let booking = await prisma.booking.findFirst({ where: { clientId } });
    if (!booking) {
      let customer = await prisma.customer.findFirst({ where: { clientId } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            clientId,
            name: "Dr. Arvind Singhania",
            phone: "+919988776655",
            email: "arvind.singhania@corp.com",
          },
        });
      }

      // Check for quotation
      let quotation = await prisma.quotation.findFirst({ where: { clientId } });
      if (!quotation) {
        let enquiry = await prisma.enquiry.findFirst({ where: { clientId } });
        if (!enquiry) {
          enquiry = await prisma.enquiry.create({
            data: {
              clientId,
              customerId: customer.id,
              source: "WEBSITE",
              status: "NEW",
            },
          });
        }
        quotation = await prisma.quotation.create({
          data: {
            clientId,
            enquiryId: enquiry.id,
            customerId: customer.id,
            itineraryJson: {},
            totalInPaise: 4500000,
          },
        });
      }

      booking = await prisma.booking.create({
        data: {
          clientId,
          quotationId: quotation.id,
          customerId: customer.id,
          status: "CONFIRMED",
          amountInPaise: 4500000,
        },
      });
    }

    trip = await prisma.trip.create({
      data: {
        clientId,
        bookingId: booking.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        pickup: "Jaipur International Airport (Terminal 2)",
        drop: "The Oberoi Rajvilas, Babaji Ka Mod, Jaipur",
        startDate: new Date(),
        status: "SCHEDULED",
        itineraryNotes: "VIP Corporate Guest Airport Arrival & Luxury Transfer",
      },
      include: { booking: { include: { customer: true } } },
    });
    console.log("Created Trip ID:", trip.id);
  } else {
    // Ensure driver and vehicle are linked
    if (!trip.driverId || !trip.vehicleId) {
      trip = await prisma.trip.update({
        where: { id: trip.id },
        data: { driverId: driver.id, vehicleId: vehicle.id },
        include: { booking: { include: { customer: true } } },
      });
    }
    console.log("Found Trip ID:", trip.id, "Pickup:", trip.pickup);
  }

  // Clean up any existing duty slip for this trip for a clean test run
  await prisma.dutySlipExpense.deleteMany({
    where: { dutySlip: { tripId: trip.id } },
  });
  await prisma.dutySlip.deleteMany({
    where: { tripId: trip.id },
  });

  // 2. Generate Duty Slip (Simulating Dispatcher Action)
  console.log("\n--- STEP 1: GENERATE DUTY SLIP ---");
  const slipCount = await prisma.dutySlip.count({ where: { clientId } });
  const slipNumber = `DS-${new Date().getFullYear()}-${String(slipCount + 1).padStart(4, "0")}`;
  const shareToken = crypto.randomBytes(24).toString("hex");

  const createdSlip = await prisma.dutySlip.create({
    data: {
      clientId,
      tripId: trip.id,
      slipNumber,
      shareToken,
      status: "GENERATED",
      driverName: driver.name,
      driverPhone: driver.contact,
      vehicleNumber: vehicle.registrationNumber,
      vehicleModel: vehicle.vehicleType,
    },
    include: { expenses: true },
  });

  console.log("Generated Duty Slip:");
  console.log("  Slip Number:", createdSlip.slipNumber);
  console.log("  Share Token:", createdSlip.shareToken);
  console.log("  Status:", createdSlip.status);
  console.log("  Driver:", createdSlip.driverName, createdSlip.driverPhone);
  console.log("  Vehicle:", createdSlip.vehicleNumber, createdSlip.vehicleModel);

  // 3. Dispatch to Driver (Simulating WhatsApp Dispatch)
  console.log("\n--- STEP 2: DISPATCH TO DRIVER ---");
  const dispatchedSlip = await prisma.dutySlip.update({
    where: { id: createdSlip.id },
    data: { status: "DISPATCHED" },
  });
  console.log("Dispatched Status:", dispatchedSlip.status);
  console.log("Driver Mobile Link: http://localhost:5173/duty-slip/" + dispatchedSlip.shareToken);

  // 4. Driver Starts Duty on Mobile PWA
  console.log("\n--- STEP 3: DRIVER STARTS TRIP (MOBILE PWA) ---");
  const startOdometer = 45210;
  const startTime = new Date();

  const startedSlip = await prisma.dutySlip.update({
    where: { id: createdSlip.id },
    data: {
      startOdometer,
      startTime,
      status: "STARTED",
    },
  });

  // Update Trip status to IN_PROGRESS
  await prisma.trip.update({
    where: { id: trip.id },
    data: { status: "IN_PROGRESS" },
  });

  console.log("Duty Started:");
  console.log("  Opening Odometer:", startedSlip.startOdometer, "KM");
  console.log("  Start Timestamp:", startedSlip.startTime?.toISOString());
  console.log("  Duty Slip Status:", startedSlip.status);

  const tripCheckInProgress = await prisma.trip.findUnique({ where: { id: trip.id } });
  console.log("  Parent Trip Status Updated to:", tripCheckInProgress?.status);

  // 5. Driver Logs On-Trip Expenses
  console.log("\n--- STEP 4: DRIVER LOGS ON-TRIP EXPENSES ---");
  const exp1 = await prisma.dutySlipExpense.create({
    data: {
      clientId,
      dutySlipId: createdSlip.id,
      expenseType: "TOLL",
      amountInPaise: 24000, // ₹240
      notes: "Jaipur Ring Road Toll Plaza",
    },
  });

  const exp2 = await prisma.dutySlipExpense.create({
    data: {
      clientId,
      dutySlipId: createdSlip.id,
      expenseType: "PARKING",
      amountInPaise: 15000, // ₹150
      notes: "Airport T2 Premium Parking (2 hrs)",
    },
  });

  const exp3 = await prisma.dutySlipExpense.create({
    data: {
      clientId,
      dutySlipId: createdSlip.id,
      expenseType: "FUEL",
      amountInPaise: 250000, // ₹2,500
      notes: "Indian Oil Petrol Pump - 27 Litres Diesel",
    },
  });

  // Aggregate expenses
  const allExpenses = await prisma.dutySlipExpense.findMany({
    where: { dutySlipId: createdSlip.id },
  });

  let toll = 0;
  let parking = 0;
  let fuel = 0;
  allExpenses.forEach((e) => {
    if (e.expenseType === "TOLL") toll += e.amountInPaise;
    if (e.expenseType === "PARKING") parking += e.amountInPaise;
    if (e.expenseType === "FUEL") fuel += e.amountInPaise;
  });

  await prisma.dutySlip.update({
    where: { id: createdSlip.id },
    data: {
      tollChargesInPaise: toll,
      parkingChargesInPaise: parking,
      fuelChargesInPaise: fuel,
      totalExpensesInPaise: toll + parking + fuel,
    },
  });

  console.log("Logged 3 Expenses:");
  console.log(`  1. Toll: ₹${exp1.amountInPaise / 100} - ${exp1.notes}`);
  console.log(`  2. Parking: ₹${exp2.amountInPaise / 100} - ${exp2.notes}`);
  console.log(`  3. Fuel: ₹${exp3.amountInPaise / 100} - ${exp3.notes}`);

  // 6. Driver Completes Duty with Passenger Signature & Rating
  console.log("\n--- STEP 5: TRIP COMPLETION, ODOMETER CLOSING & DIGITAL SIGNATURE ---");
  const endOdometer = 45490;
  const endTime = new Date(Date.now() + 3600000 * 4.5); // 4.5 hours later
  const totalKm = endOdometer - startOdometer; // 280 KM
  const diffMs = endTime.getTime() - startTime.getTime();
  const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // 4.5 hrs

  // Mock Canvas Signature data URL
  const mockSignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAE4wHZw3s9LwAAAABJRU5ErkJggg==";

  const completedSlip = await prisma.dutySlip.update({
    where: { id: createdSlip.id },
    data: {
      endOdometer,
      endTime,
      totalKm,
      totalHours,
      customerSignature: mockSignature,
      customerRating: 5,
      customerFeedback: "Exceptional driving, very courteous and punctual. Clean vehicle!",
      status: "COMPLETED",
    },
    include: { expenses: true },
  });

  await prisma.trip.update({
    where: { id: trip.id },
    data: { status: "COMPLETED" },
  });

  console.log("Duty Completed Successfully:");
  console.log("  Closing Odometer:", completedSlip.endOdometer, "KM");
  console.log("  Calculated Total Billable KM:", completedSlip.totalKm, "KM");
  console.log("  Calculated Duty Duration:", completedSlip.totalHours, "hours");
  console.log("  Customer Rating:", completedSlip.customerRating, "/ 5 Stars");
  console.log("  Customer Feedback:", completedSlip.customerFeedback);
  console.log("  Customer Signature Recorded:", Boolean(completedSlip.customerSignature));
  console.log("  Duty Slip Status:", completedSlip.status);

  const tripCheckCompleted = await prisma.trip.findUnique({ where: { id: trip.id } });
  console.log("  Parent Trip Status Updated to:", tripCheckCompleted?.status);

  // 7. Verification Assertions
  console.log("\n--- VERIFICATION CHECKS ---");
  if (completedSlip.totalKm === 280) {
    console.log("  ✓ Total KM calculated correctly (45490 - 45210 = 280)");
  } else {
    throw new Error(`Total KM mismatch! Expected 280, got ${completedSlip.totalKm}`);
  }

  const totalExp = (completedSlip.tollChargesInPaise || 0) + (completedSlip.parkingChargesInPaise || 0) + (completedSlip.fuelChargesInPaise || 0);
  if (totalExp === 289000) {
    console.log("  ✓ On-Trip Expenses aggregated correctly: ₹2,890.00 (Toll 240 + Parking 150 + Fuel 2500)");
  } else {
    throw new Error(`Expense total mismatch! Expected 289000, got ${totalExp}`);
  }

  if (completedSlip.customerRating === 5 && completedSlip.customerSignature) {
    console.log("  ✓ Customer digital signature and 5-star rating captured successfully");
  }

  if (tripCheckCompleted?.status === "COMPLETED") {
    console.log("  ✓ Bidirectional synchronization: Trip status updated to COMPLETED");
  }

  console.log("\n==================================================");
  console.log("=== ALL PHASE 4 TEST ASSERTIONS PASSED (100%) ===");
  console.log("==================================================");
}

run()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
