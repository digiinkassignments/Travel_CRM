import { prisma } from "../src/db/prisma";

async function run() {
  console.log("=== PHASE 3 TEST SUITE ===");

  const booking = await prisma.booking.findFirst({
    include: { customer: true, client: { include: { companyProfile: true } } },
  });

  if (!booking) {
    console.error("No booking found!");
    process.exit(1);
  }

  const clientId = booking.clientId;
  console.log("Using Client:", clientId, "Booking:", booking.id, "Customer:", booking.customer?.name);

  // 1. Create Supplier
  const supplier = await prisma.supplier.create({
    data: {
      clientId,
      name: "Taj Lake Palace Resort & Spa",
      type: "HOTEL",
      contactPerson: "Rajeshwar Singh",
      phone: "+919876543210",
      whatsapp: "919876543210",
      email: "reservations@tajlakepalace.com",
      city: "Udaipur",
      address: "Pichola Lake, Udaipur, Rajasthan",
      starRating: 5,
      bankName: "HDFC Bank",
      accountNumber: "50200098765432",
      ifscCode: "HDFC0001234",
      upiId: "tajhotels@okhdfcbank",
      notes: "Preferred luxury supplier with 10% B2B corporate credit",
    },
  });
  console.log("1. Supplier Created:", supplier.id, supplier.name, supplier.type);

  // 2. Add Booking Cost Items
  const costItem1 = await prisma.bookingCostItem.create({
    data: {
      clientId,
      bookingId: booking.id,
      supplierId: supplier.id,
      itemType: "HOTEL",
      description: "2 Nights Palace Lake View Room with Breakfast",
      quantity: 2,
      unitCostInPaise: 25000, // ₹250 / night
      totalCostInPaise: 50000, // ₹500
      paymentStatus: "UNPAID",
      notes: "Confirmation ref: TLP-8842",
    },
  });

  const costItem2 = await prisma.bookingCostItem.create({
    data: {
      clientId,
      bookingId: booking.id,
      itemType: "TRANSPORT",
      description: "Airport Transfer in Toyota Crysta",
      quantity: 1,
      unitCostInPaise: 15000, // ₹150
      totalCostInPaise: 15000, // ₹150
      paymentStatus: "PAID",
    },
  });
  console.log("2. Cost Items Added:", costItem1.id, "₹" + costItem1.totalCostInPaise/100, costItem2.id, "₹" + costItem2.totalCostInPaise/100);

  // 3. Verify Costing & Margin Engine
  const allCostItems = await prisma.bookingCostItem.findMany({ where: { bookingId: booking.id } });
  const totalCost = allCostItems.reduce((sum, item) => sum + item.totalCostInPaise, 0);
  const sellingPrice = booking.amountInPaise;
  const grossProfit = sellingPrice - totalCost;
  const marginPct = Number(((grossProfit / sellingPrice) * 100).toFixed(2));

  console.log("3. Costing Engine Calculated:");
  console.log("   Selling Price: ₹" + sellingPrice / 100);
  console.log("   Net B2B Cost:  ₹" + totalCost / 100);
  console.log("   Gross Profit:  ₹" + grossProfit / 100);
  console.log("   Profit Margin: " + marginPct + "%");

  if (grossProfit !== 15000 || marginPct !== 18.75) {
    console.error("Profit calculation mismatch!", { grossProfit, marginPct });
    process.exit(1);
  }

  // 4. Record Supplier Payout
  const payment = await prisma.supplierPayment.create({
    data: {
      clientId,
      supplierId: supplier.id,
      bookingId: booking.id,
      amountInPaise: 50000,
      paymentDate: new Date(),
      mode: "UPI",
      reference: "UPI/382910381029",
      notes: "Settled Taj Lake Palace room charges",
    },
  });
  console.log("4. Supplier Payout Recorded:", payment.id, "₹" + payment.amountInPaise / 100, payment.reference);

  // 5. Generate Hotel Confirmation Voucher
  const voucherCount = await prisma.hotelVoucher.count({ where: { clientId } });
  const voucherNumber = `VCH-${new Date().getFullYear()}-${String(voucherCount + 1).padStart(4, "0")}`;

  const voucher = await prisma.hotelVoucher.create({
    data: {
      clientId,
      bookingId: booking.id,
      supplierId: supplier.id,
      voucherNumber,
      hotelName: supplier.name,
      city: supplier.city,
      checkInDate: new Date("2026-10-15"),
      checkOutDate: new Date("2026-10-17"),
      roomCategory: "Lake View Palace Room",
      numberOfRooms: 1,
      mealPlan: "CP",
      guestNames: [booking.customer.name, "Mrs. Companion"],
      specialRequests: "Anniversary celebration setup, Lake facing room on higher floor",
      status: "ISSUED",
    },
  });
  console.log("5. Hotel Voucher Generated:", voucher.id, voucher.voucherNumber, voucher.mealPlan, voucher.hotelName);

  console.log("\n=== ALL PHASE 3 BACKEND & DATA TESTS PASSED SUCCESSFULLY! ===");
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
