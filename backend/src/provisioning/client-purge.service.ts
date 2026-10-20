import { prisma } from "../db/prisma";

/**
 * Completely purges a client and all associated records across all tenant tables
 * in reverse topological dependency order within a single transaction.
 */
export async function purgeClientData(clientId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify client exists
    const client = await tx.client.findUnique({
      where: { id: clientId },
      select: { id: true, clientCode: true, businessName: true, email: true },
    });
    if (!client) {
      throw new Error(`Client with ID "${clientId}" not found.`);
    }

    // 2. Resolve sub-resource IDs that have child tables without direct clientId
    const itineraries = await tx.itinerary.findMany({
      where: { clientId },
      select: { id: true },
    });
    const itineraryIds = itineraries.map((i) => i.id);

    const users = await tx.user.findMany({
      where: { clientId },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    // 3. Delete Itinerary sub-items
    if (itineraryIds.length > 0) {
      await tx.itineraryDay.deleteMany({ where: { itineraryId: { in: itineraryIds } } });
      await tx.itineraryPricingTier.deleteMany({ where: { itineraryId: { in: itineraryIds } } });
    }

    // 4. Delete user OTPs (LoginOtp & PasswordResetOtp have no clientId FK, keyed by userId)
    if (userIds.length > 0) {
      await tx.loginOtp.deleteMany({ where: { userId: { in: userIds } } });
      await tx.passwordResetOtp.deleteMany({ where: { userId: { in: userIds } } });
    }

    // 5. Delete Duty Slip & Fleet Operations
    await tx.dutySlipExpense.deleteMany({ where: { clientId } });
    await tx.dutySlip.deleteMany({ where: { clientId } });

    // 6. Delete Booking Sub-items
    await tx.bookingDocument.deleteMany({ where: { clientId } });
    await tx.bookingTraveler.deleteMany({ where: { clientId } });
    await tx.hotelVoucher.deleteMany({ where: { clientId } });
    await tx.bookingCostItem.deleteMany({ where: { clientId } });
    await tx.supplierPayment.deleteMany({ where: { clientId } });
    await tx.supplier.deleteMany({ where: { clientId } });

    // 7. Delete Financials & Trips
    await tx.payment.deleteMany({ where: { clientId } });
    await tx.invoice.deleteMany({ where: { clientId } });
    await tx.trip.deleteMany({ where: { clientId } });
    await tx.booking.deleteMany({ where: { clientId } });

    // 8. Delete Tour & Sales Pipeline
    await tx.itinerary.deleteMany({ where: { clientId } });
    await tx.tourTemplate.deleteMany({ where: { clientId } });
    await tx.quotation.deleteMany({ where: { clientId } });
    await tx.followUp.deleteMany({ where: { clientId } });
    await tx.enquiry.deleteMany({ where: { clientId } });

    // 9. Delete Maintenance, Documents, Fleet & Customers
    await tx.vehicleMaintenance.deleteMany({ where: { clientId } });
    await tx.document.deleteMany({ where: { clientId } });
    await tx.vehicle.deleteMany({ where: { clientId } });
    await tx.driver.deleteMany({ where: { clientId } });
    await tx.customer.deleteMany({ where: { clientId } });

    // 10. Delete Custom Fields
    await tx.customFieldValue.deleteMany({ where: { clientId } });
    await tx.customFieldDefinition.deleteMany({ where: { clientId } });

    // 11. Delete Messaging & Automation
    await tx.whatsAppMessage.deleteMany({ where: { clientId } });
    await tx.whatsAppTemplate.deleteMany({ where: { clientId } });
    await tx.whatsAppConfig.deleteMany({ where: { clientId } });
    await tx.automationLog.deleteMany({ where: { clientId } });
    await tx.automationRule.deleteMany({ where: { clientId } });

    // 12. Delete Tenant Audit & Profile
    await tx.auditLog.deleteMany({ where: { clientId } });
    await tx.paymentNotice.deleteMany({ where: { clientId } });
    await tx.paymentLog.deleteMany({ where: { clientId } });
    await tx.companyProfile.deleteMany({ where: { clientId } });

    // 13. Delete Users, Roles, Branches
    await tx.user.deleteMany({ where: { clientId } });
    await tx.role.deleteMany({ where: { clientId } });
    await tx.branch.deleteMany({ where: { clientId } });

    // 14. Finally delete the Client row
    await tx.client.delete({ where: { id: clientId } });

    return client;
  });
}
