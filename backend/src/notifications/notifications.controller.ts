import { Router } from "express";
import { prisma } from "../db/prisma";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { ok } from "../common/response";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate, scopeTenant());

export interface AlertItem {
  id: string;
  type: "FOLLOW_UP" | "NEW_LEAD" | "DEPARTURE" | "PAYMENT" | "VOUCHER" | "FLEET_COMPLIANCE";
  severity: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  link: string;
  meta?: Record<string, any>;
}

// -----------------------------------------------------------------------------
// GET /api/notifications
// Compute operational alerts for the active tenant and user
// -----------------------------------------------------------------------------
notificationsRouter.get("/", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const userId = req.auth?.sub;
    const isClientAdmin = req.auth?.isClientAdmin ?? false;

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date();
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const in15Days = new Date();
    in15Days.setDate(in15Days.getDate() + 15);

    const alerts: AlertItem[] = [];

    // 1. Follow-ups Due or Overdue
    const followUpWhere: any = {
      clientId,
      status: { notIn: ["WON", "LOST"] },
      followUpDate: {
        not: null,
        lte: endOfTomorrow,
      },
    };
    if (!isClientAdmin && userId) {
      followUpWhere.assignedToId = userId;
    }

    const dueEnquiries = await prisma.enquiry.findMany({
      where: followUpWhere,
      select: {
        id: true,
        destination: true,
        followUpDate: true,
        customer: { select: { name: true, phone: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { followUpDate: "asc" },
      take: 20,
    });

    for (const enq of dueEnquiries) {
      if (!enq.followUpDate) continue;
      const isOverdue = enq.followUpDate < now;
      alerts.push({
        id: `followup-${enq.id}`,
        type: "FOLLOW_UP",
        severity: isOverdue ? "error" : "warning",
        title: isOverdue ? "Overdue Follow-up" : "Follow-up Due Today",
        message: `${enq.customer?.name || "Client"} (${enq.customer?.phone || "No phone"}) for ${enq.destination || "travel inquiry"}.`,
        timestamp: enq.followUpDate.toISOString(),
        link: `/app/enquiries/${enq.id}`,
        meta: {
          enquiryId: enq.id,
          customerName: enq.customer?.name,
          phone: enq.customer?.phone,
          isOverdue,
        },
      });
    }

    // 2. New Inbound Leads (created in last 48 hours still in NEW status)
    const newLeads = await prisma.enquiry.findMany({
      where: {
        clientId,
        status: "NEW",
        createdAt: { gte: fortyEightHoursAgo },
      },
      select: {
        id: true,
        source: true,
        pickupLocation: true,
        destination: true,
        createdAt: true,
        customer: { select: { name: true, phone: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    for (const lead of newLeads) {
      alerts.push({
        id: `newlead-${lead.id}`,
        type: "NEW_LEAD",
        severity: "info",
        title: "New Lead Received",
        message: `${lead.customer?.name || "Traveler"} requested ${lead.destination || "travel"}${lead.source ? ` via ${lead.source}` : ""}.`,
        timestamp: lead.createdAt.toISOString(),
        link: `/app/enquiries/${lead.id}`,
        meta: {
          enquiryId: lead.id,
          source: lead.source,
          customerName: lead.customer?.name,
          assignedTo: lead.assignedTo?.name || "Unassigned",
        },
      });
    }

    // 3. Upcoming Trip Departures (Starting today or next 48h)
    const upcomingTrips = await prisma.trip.findMany({
      where: {
        clientId,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        startDate: {
          gte: startOfToday,
          lte: endOfTomorrow,
        },
      },
      select: {
        id: true,
        pickup: true,
        drop: true,
        startDate: true,
        driver: { select: { name: true, contact: true } },
        vehicle: { select: { registrationNumber: true, vehicleName: true } },
        dutySlip: { select: { id: true, status: true, slipNumber: true } },
        booking: {
          select: {
            id: true,
            customer: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { startDate: "asc" },
      take: 15,
    });

    for (const trip of upcomingTrips) {
      if (!trip.startDate) continue;
      const hasDispatchedDutySlip = trip.dutySlip?.status === "DISPATCHED";
      const hasNoDriver = !trip.driver;

      alerts.push({
        id: `trip-${trip.id}`,
        type: "DEPARTURE",
        severity: hasNoDriver ? "error" : !hasDispatchedDutySlip ? "warning" : "info",
        title: hasNoDriver
          ? "Departure: Driver Missing!"
          : !hasDispatchedDutySlip
          ? "Departure: Duty Slip Pending"
          : "Upcoming Departure",
        message: `${trip.pickup || "Pickup"} → ${trip.drop || "Drop"}${
          trip.driver ? ` (Driver: ${trip.driver.name})` : " (No Driver Assigned)"
        }`,
        timestamp: trip.startDate.toISOString(),
        link: `/app/trips/${trip.id}`,
        meta: {
          tripId: trip.id,
          hasDriver: Boolean(trip.driver),
          hasDutySlip: Boolean(trip.dutySlip),
        },
      });
    }

    // 4. Pending Booking Receivables / Overdue Balances
    const pendingBookings = await prisma.booking.findMany({
      where: {
        clientId,
        status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
        OR: [
          { paymentDueDate: { lte: now } },
          { travelStart: { lte: now } },
        ],
      },
      select: {
        id: true,
        amountInPaise: true,
        paymentDueDate: true,
        travelStart: true,
        customer: { select: { name: true, phone: true } },
        payments: {
          select: { amountInPaise: true },
        },
      },
      take: 20,
    });

    for (const booking of pendingBookings) {
      const paidPaise = booking.payments.reduce((sum, p) => sum + p.amountInPaise, 0);
      const pendingPaise = booking.amountInPaise - paidPaise;
      if (pendingPaise > 0) {
        const referenceDate = booking.paymentDueDate || booking.travelStart || now;
        alerts.push({
          id: `payment-${booking.id}`,
          type: "PAYMENT",
          severity: "warning",
          title: "Outstanding Payment Balance",
          message: `${booking.customer?.name || "Client"}: Pending ₹${(pendingPaise / 100).toLocaleString(
            "en-IN"
          )} of ₹${(booking.amountInPaise / 100).toLocaleString("en-IN")}.`,
          timestamp: referenceDate.toISOString(),
          link: `/app/bookings/${booking.id}`,
          meta: {
            bookingId: booking.id,
            pendingAmount: pendingPaise / 100,
          },
        });
      }
    }

    // 5. Fleet Compliance Alerts (Vehicle papers expiring or expired, Grounded vehicles)
    const expiringVehicles = await prisma.vehicle.findMany({
      where: {
        clientId,
        OR: [
          { rcExpiry: { lte: in15Days } },
          { insuranceExpiry: { lte: in15Days } },
          { permitExpiry: { lte: in15Days } },
          { fitnessExpiry: { lte: in15Days } },
          { pucExpiry: { lte: in15Days } },
          { taxExpiry: { lte: in15Days } },
          { operationalStatus: "GROUNDED" },
        ],
      },
      select: {
        id: true,
        registrationNumber: true,
        vehicleName: true,
        vehicleType: true,
        rcExpiry: true,
        insuranceExpiry: true,
        permitExpiry: true,
        fitnessExpiry: true,
        pucExpiry: true,
        taxExpiry: true,
        operationalStatus: true,
      },
      take: 15,
    });

    for (const v of expiringVehicles) {
      const docChecks = [
        { name: "Insurance", date: v.insuranceExpiry },
        { name: "Fitness", date: v.fitnessExpiry },
        { name: "Permit", date: v.permitExpiry },
        { name: "PUC", date: v.pucExpiry },
        { name: "RC", date: v.rcExpiry },
        { name: "Road Tax", date: v.taxExpiry },
      ];

      for (const check of docChecks) {
        if (!check.date) continue;
        const isExp = check.date < now;
        const days = Math.ceil((new Date(check.date).getTime() - now.getTime()) / 86400000);
        if (days <= 15) {
          alerts.push({
            id: `fleet-${v.id}-${check.name.toLowerCase()}`,
            type: "FLEET_COMPLIANCE",
            severity: isExp ? "error" : "warning",
            title: isExp ? `Vehicle ${check.name} Expired!` : `Vehicle ${check.name} Expiring in ${days}d`,
            message: `${v.registrationNumber} (${v.vehicleName || v.vehicleType}): ${check.name} ${
              isExp ? "has expired. Vehicle cannot be legally dispatched." : `renewal required by ${check.date.toISOString().slice(0, 10)}.`
            }`,
            timestamp: check.date.toISOString(),
            link: `/app/vehicles/${v.id}`,
            meta: { vehicleId: v.id, registrationNumber: v.registrationNumber, docType: check.name, isExp },
          });
        }
      }

      if (v.operationalStatus === "GROUNDED") {
        alerts.push({
          id: `fleet-${v.id}-grounded`,
          type: "FLEET_COMPLIANCE",
          severity: "error",
          title: `Vehicle Grounded: ${v.registrationNumber}`,
          message: `${v.registrationNumber} is marked Grounded / Impounded. Do not allocate to upcoming trips.`,
          timestamp: now.toISOString(),
          link: `/app/vehicles/${v.id}`,
          meta: { vehicleId: v.id },
        });
      }
    }

    // 6. Driver Compliance Alerts (License expiring in ≤15 days or expired)
    const expiringDrivers = await prisma.driver.findMany({
      where: {
        clientId,
        licenseExpiry: { lte: in15Days },
      },
      select: {
        id: true,
        name: true,
        licenseNumber: true,
        licenseExpiry: true,
        contact: true,
      },
      take: 10,
    });

    for (const d of expiringDrivers) {
      if (!d.licenseExpiry) continue;
      const isExp = d.licenseExpiry < now;
      const days = Math.ceil((new Date(d.licenseExpiry).getTime() - now.getTime()) / 86400000);
      alerts.push({
        id: `driver-${d.id}-dl`,
        type: "FLEET_COMPLIANCE",
        severity: isExp ? "error" : "warning",
        title: isExp ? `Driver License Expired: ${d.name}` : `Driver License Expiring: ${d.name}`,
        message: `${d.name} (DL: ${d.licenseNumber}): License ${isExp ? "has expired" : `expires in ${days} days`}.`,
        timestamp: d.licenseExpiry.toISOString(),
        link: `/app/drivers`,
        meta: { driverId: d.id, driverName: d.name },
      });
    }

    // Sort alerts: error first, then warning, then info; within same severity sort by timestamp desc
    const severityWeight: Record<string, number> = { error: 3, warning: 2, info: 1, success: 0 };
    alerts.sort((a, b) => {
      const diff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (diff !== 0) return diff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const summary = {
      total: alerts.length,
      followUps: alerts.filter((a) => a.type === "FOLLOW_UP").length,
      newLeads: alerts.filter((a) => a.type === "NEW_LEAD").length,
      departures: alerts.filter((a) => a.type === "DEPARTURE").length,
      payments: alerts.filter((a) => a.type === "PAYMENT").length,
      fleetCompliance: alerts.filter((a) => a.type === "FLEET_COMPLIANCE").length,
      urgentCount: alerts.filter((a) => a.severity === "error" || a.severity === "warning").length,
    };

    return ok(res, { alerts, summary });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// GET /api/notifications/quick-search?q=...
// Fast universal search across leads, bookings, customers, trips, vehicles, drivers
// -----------------------------------------------------------------------------
notificationsRouter.get("/quick-search", async (req, res, next) => {
  try {
    const clientId = req.clientId!;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!q || q.length < 2) {
      return ok(res, { results: [] });
    }

    const [enquiries, customers, bookings, trips, vehicles, drivers] = await Promise.all([
      // Enquiries / Leads
      prisma.enquiry.findMany({
        where: {
          clientId,
          OR: [
            { destination: { contains: q } },
            { pickupLocation: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { phone: { contains: q } } },
          ],
        },
        select: {
          id: true,
          destination: true,
          pickupLocation: true,
          status: true,
          customer: { select: { name: true, phone: true } },
        },
        take: 5,
      }),

      // Customers
      prisma.customer.findMany({
        where: {
          clientId,
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
        take: 5,
      }),

      // Bookings
      prisma.booking.findMany({
        where: {
          clientId,
          OR: [
            { id: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { phone: { contains: q } } },
          ],
        },
        select: {
          id: true,
          status: true,
          amountInPaise: true,
          customer: { select: { name: true } },
        },
        take: 5,
      }),

      // Trips
      prisma.trip.findMany({
        where: {
          clientId,
          OR: [
            { id: { contains: q } },
            { pickup: { contains: q } },
            { drop: { contains: q } },
            { driver: { name: { contains: q } } },
          ],
        },
        select: {
          id: true,
          pickup: true,
          drop: true,
          status: true,
          driver: { select: { name: true } },
        },
        take: 5,
      }),

      // Vehicles
      prisma.vehicle.findMany({
        where: {
          clientId,
          OR: [
            { registrationNumber: { contains: q } },
            { vehicleName: { contains: q } },
            { vehicleType: { contains: q } },
          ],
        },
        select: {
          id: true,
          registrationNumber: true,
          vehicleName: true,
          vehicleType: true,
          operationalStatus: true,
        },
        take: 5,
      }),

      // Drivers
      prisma.driver.findMany({
        where: {
          clientId,
          OR: [
            { name: { contains: q } },
            { contact: { contains: q } },
            { licenseNumber: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          contact: true,
          licenseNumber: true,
        },
        take: 5,
      }),
    ]);

    const results = [
      ...enquiries.map((e) => ({
        id: `enq-${e.id}`,
        category: "Leads",
        title: `${e.customer?.name || "Lead"} — ${e.destination || "Inquiry"}`,
        subtitle: `${e.pickupLocation ? `${e.pickupLocation} → ` : ""}${e.destination || ""} • ${
          e.customer?.phone || ""
        } [${e.status}]`,
        link: `/app/enquiries/${e.id}`,
      })),
      ...customers.map((c) => ({
        id: `cust-${c.id}`,
        category: "Customers",
        title: c.name,
        subtitle: `${c.phone}${c.email ? ` • ${c.email}` : ""}`,
        link: `/app/customers/${c.id}`,
      })),
      ...bookings.map((b) => ({
        id: `book-${b.id}`,
        category: "Bookings",
        title: `Booking #${b.id.slice(-6).toUpperCase()} — ${b.customer?.name || "Customer"}`,
        subtitle: `₹${(b.amountInPaise / 100).toLocaleString("en-IN")} • Status: ${b.status}`,
        link: `/app/bookings/${b.id}`,
      })),
      ...trips.map((t) => ({
        id: `trip-${t.id}`,
        category: "Trips",
        title: `Trip #${t.id.slice(-6).toUpperCase()} (${t.status})`,
        subtitle: `${t.pickup || ""} → ${t.drop || ""}${t.driver ? ` (Driver: ${t.driver.name})` : ""}`,
        link: `/app/trips/${t.id}`,
      })),
      ...vehicles.map((v) => ({
        id: `veh-${v.id}`,
        category: "Vehicles",
        title: `${v.registrationNumber} — ${v.vehicleName || v.vehicleType}`,
        subtitle: `Type: ${v.vehicleType} • Status: ${v.operationalStatus}`,
        link: `/app/vehicles/${v.id}`,
      })),
      ...drivers.map((d) => ({
        id: `drv-${d.id}`,
        category: "Drivers",
        title: `${d.name} (Chauffeur)`,
        subtitle: `Contact: ${d.contact} • DL: ${d.licenseNumber}`,
        link: `/app/drivers`,
      })),
    ];

    return ok(res, { results });
  } catch (err) {
    next(err);
  }
});
