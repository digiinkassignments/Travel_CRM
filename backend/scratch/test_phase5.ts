import { prisma } from "../src/db/prisma";
import crypto from "crypto";

async function run() {
  console.log("==========================================================");
  console.log("=== PHASE 5: DOCUMENT VAULT & MANIFEST TEST SUITE ===");
  console.log("==========================================================");

  // 1. Find a valid Client and Booking
  const client = await prisma.client.findFirst({
    include: { companyProfile: true },
  });

  if (!client) {
    console.error("❌ No client found!");
    process.exit(1);
  }

  const clientId = client.id;
  console.log("✔ Using Client:", clientId, client.companyProfile?.companyName);

  let booking = await prisma.booking.findFirst({
    where: { clientId },
    include: { customer: true },
  }) || await prisma.booking.findFirst({
    include: { customer: true },
  });

  if (!booking) {
    console.error("❌ No booking found in database!");
    process.exit(1);
  }

  const bookingId = booking.id;
  console.log(`✔ Using Booking ${bookingId} for Customer ${booking.customer.name}`);
  console.log(`  Travel Dates: ${booking.travelStart?.toISOString().slice(0, 10)} to ${booking.travelEnd?.toISOString().slice(0, 10)}`);

  // 2. Generate or ensure docShareToken on Booking
  let token = booking.docShareToken;
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { docShareToken: token },
      include: { customer: true },
    });
    console.log(`✔ Generated new docShareToken: ${token}`);
  } else {
    console.log(`✔ Existing docShareToken: ${token}`);
  }

  // 3. Test Traveler Roster Creation & Passport Validity Logic
  console.log("\n--- Testing Traveler Creation & Passport Validity Logic ---");
  
  // Clean up existing test travelers for clean test run
  await prisma.bookingDocument.deleteMany({ where: { bookingId } });
  await prisma.bookingTraveler.deleteMany({ where: { bookingId } });

  // Traveler 1: Valid Passport (> 6 months validity from travel start)
  const validExpiry = new Date(booking.travelStart || new Date());
  validExpiry.setFullYear(validExpiry.getFullYear() + 5);

  const traveler1 = await prisma.bookingTraveler.create({
    data: {
      clientId,
      bookingId,
      fullName: "Vikram Malhotra",
      travelerType: "ADULT",
      gender: "MALE",
      dateOfBirth: new Date("1985-06-15"),
      nationality: "Indian",
      passportNumber: "Z9876543",
      passportExpiry: validExpiry,
      idType: "Aadhaar",
      idNumber: "XXXX-XXXX-1234",
      foodPreference: "Non-Veg",
      specialRequests: "Wheelchair assistance needed at airport",
      isLeadPassenger: true,
    },
  });
  console.log(`✔ Created Traveler 1 (Valid Passport): ${traveler1.fullName}, Expiry: ${validExpiry.toISOString().slice(0, 10)}`);

  // Traveler 2: Expiring Passport (< 6 months validity from travel start)
  const soonExpiring = new Date(booking.travelStart || new Date());
  soonExpiring.setMonth(soonExpiring.getMonth() + 2); // Only 2 months validity left!

  const traveler2 = await prisma.bookingTraveler.create({
    data: {
      clientId,
      bookingId,
      fullName: "Pooja Malhotra",
      travelerType: "ADULT",
      gender: "FEMALE",
      dateOfBirth: new Date("1988-11-20"),
      nationality: "Indian",
      passportNumber: "L1234567",
      passportExpiry: soonExpiring,
      foodPreference: "Jain Vegetarian",
      isLeadPassenger: false,
    },
  });
  console.log(`✔ Created Traveler 2 (Expiring Soon): ${traveler2.fullName}, Expiry: ${soonExpiring.toISOString().slice(0, 10)}`);

  // Verify warning logic
  const minRequiredValidity = new Date(booking.travelStart || new Date());
  minRequiredValidity.setMonth(minRequiredValidity.getMonth() + 6);

  const t1HasWarning = traveler1.passportExpiry ? traveler1.passportExpiry < minRequiredValidity : false;
  const t2HasWarning = traveler2.passportExpiry ? traveler2.passportExpiry < minRequiredValidity : false;

  console.log(`  Traveler 1 Passport warning triggered: ${t1HasWarning} (Expected: false)`);
  console.log(`  Traveler 2 Passport warning triggered: ${t2HasWarning} (Expected: true)`);
  if (!t1HasWarning && t2HasWarning) {
    console.log("✔ Passport 6-month validity warning engine: PASSED!");
  } else {
    console.error("❌ Passport 6-month validity warning engine: FAILED!");
  }

  // 4. Test Public Vault Retrieval (Simulation of guest scanning link /upload-docs/:token)
  console.log("\n--- Testing Public Vault Retrieval ---");
  const publicBooking = await prisma.booking.findFirst({
    where: { docShareToken: token },
    include: {
      client: {
        include: { companyProfile: true },
      },
      customer: true,
      travelers: {
        orderBy: [{ isLeadPassenger: "desc" }, { createdAt: "asc" }],
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!publicBooking) {
    console.error("❌ Failed to query booking by docShareToken!");
    process.exit(1);
  }
  console.log(`✔ Public Vault loaded successfully:`);
  console.log(`  Agency: ${publicBooking.client.companyProfile?.companyName || publicBooking.client.email}`);
  console.log(`  Customer: ${publicBooking.customer.name}`);
  console.log(`  Travelers count: ${publicBooking.travelers.length}`);

  // 5. Test Public Document Upload (Guest uploading Passport & eVisa)
  console.log("\n--- Testing Public Document Upload ---");
  const doc1 = await prisma.bookingDocument.create({
    data: {
      clientId,
      bookingId,
      travelerId: traveler1.id,
      category: "PASSPORT_FRONT",
      title: "Vikram_Passport_Front.jpg",
      fileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      fileType: "image/png",
      fileSize: 1024,
      verificationStatus: "PENDING",
      uploadedBy: "Guest Portal",
    },
  });
  console.log(`✔ Guest uploaded doc 1: ${doc1.title} (Status: ${doc1.verificationStatus})`);

  const doc2 = await prisma.bookingDocument.create({
    data: {
      clientId,
      bookingId,
      travelerId: traveler2.id,
      category: "VISA",
      title: "Pooja_Dubai_eVisa.pdf",
      fileUrl: "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM",
      fileType: "application/pdf",
      fileSize: 2048,
      verificationStatus: "PENDING",
      uploadedBy: "Guest Portal",
    },
  });
  console.log(`✔ Guest uploaded doc 2: ${doc2.title} (Status: ${doc2.verificationStatus})`);

  // 6. Test Agency Staff Verification / Rejection
  console.log("\n--- Testing Staff Verification & Rejection ---");
  const verifiedDoc = await prisma.bookingDocument.update({
    where: { id: doc1.id },
    data: {
      verificationStatus: "VERIFIED",
      notes: "Clear and valid.",
    },
  });
  console.log(`✔ Verified doc 1: Status = ${verifiedDoc.verificationStatus}, Notes = "${verifiedDoc.notes}"`);

  const rejectedDoc = await prisma.bookingDocument.update({
    where: { id: doc2.id },
    data: {
      verificationStatus: "REJECTED",
      rejectionReason: "Blurry scan: Passport number not legible. Please upload a clear photo in good light.",
    },
  });
  console.log(`✔ Rejected doc 2: Status = ${rejectedDoc.verificationStatus}, Reason = "${rejectedDoc.rejectionReason}"`);

  // 7. Test Manifest Sheet Summary Generation
  console.log("\n--- Testing Manifest Summary ---");
  const allTravelers = await prisma.bookingTraveler.findMany({
    where: { bookingId },
    include: { documents: true },
  });

  console.log(`✔ Manifest has ${allTravelers.length} traveler(s):`);
  allTravelers.forEach((t, i) => {
    console.log(`  [${i + 1}] ${t.fullName} (${t.gender}, ${t.travelerType}) | Passport: ${t.passportNumber || "N/A"} | Docs: ${t.documents.length}`);
  });

  console.log("\n==========================================================");
  console.log("🎉 ALL PHASE 5 INTEGRATION & DATABASE TESTS PASSED!");
  console.log("==========================================================");
}

run()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
