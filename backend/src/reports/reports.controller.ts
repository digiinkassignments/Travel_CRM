import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ok } from "../common/response";
import { authenticate } from "../guards/authenticate";
import { scopeTenant } from "../guards/tenant-scope.guard";
import { requireEntitlement } from "../guards/entitlement.guard";
import { requirePermission } from "../guards/rbac.guard";

export const reportsRouter = Router();

// Basic reports are Professional+; advanced reports are Business+ (SRS
// section 25/FR-9). The basic_reports check happens per-route below so
// the advanced-only routes can layer requireEntitlement("advanced_reports")
// on top instead of gating the whole router at one level.
reportsRouter.use(authenticate, scopeTenant(), requireEntitlement("basic_reports"), requirePermission("reports", "view"));

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function dateFilter(from?: Date, to?: Date) {
  if (!from && !to) return {};
  return { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
}

// --- Basic: Sales by Agent (SRS FR-9.2) ----------------------------------------
// "Sales" = won enquiries + the booking revenue attached to them, grouped
// by the staff member the enquiry was assigned to.
reportsRouter.get("/sales-by-agent", async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const clientId = req.clientId!;

    const enquiries = await prisma.enquiry.findMany({
      where: { clientId, status: "WON", ...dateFilter(from, to) },
      include: {
        assignedTo: { select: { id: true, name: true } },
        quotations: { include: { booking: { select: { amountInPaise: true } } } },
      },
    });

    const byAgent = new Map<string, { agentName: string; wonEnquiries: number; revenueInPaise: number }>();
    for (const e of enquiries) {
      const key = e.assignedTo?.id ?? "unassigned";
      const name = e.assignedTo?.name ?? "Unassigned";
      const revenue = e.quotations.reduce((sum, q) => sum + (q.booking?.amountInPaise ?? 0), 0);
      const existing = byAgent.get(key) ?? { agentName: name, wonEnquiries: 0, revenueInPaise: 0 };
      existing.wonEnquiries += 1;
      existing.revenueInPaise += revenue;
      byAgent.set(key, existing);
    }

    return ok(res, Array.from(byAgent.values()).sort((a, b) => b.revenueInPaise - a.revenueInPaise));
  } catch (err) {
    next(err);
  }
});

// --- Basic: Bookings by Status (SRS FR-9.2) ------------------------------------
reportsRouter.get("/bookings-by-status", async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const clientId = req.clientId!;

    const grouped = await prisma.booking.groupBy({
      by: ["status"],
      where: { clientId, ...dateFilter(from, to) },
      _count: { _all: true },
      _sum: { amountInPaise: true },
    });

    return ok(res, grouped.map((g) => ({
      status: g.status,
      count: g._count._all,
      totalAmountInPaise: g._sum.amountInPaise ?? 0,
    })));
  } catch (err) {
    next(err);
  }
});

// --- Advanced (Business+): Revenue by Destination ------------------------------
reportsRouter.get("/revenue-by-destination", requireEntitlement("advanced_reports"), async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const clientId = req.clientId!;

    const bookings = await prisma.booking.findMany({
      where: { clientId, status: { not: "CANCELLED" }, ...dateFilter(from, to) },
      include: { quotation: { include: { enquiry: { select: { destination: true } } } } },
    });

    const byDestination = new Map<string, number>();
    for (const b of bookings) {
      const destination = b.quotation?.enquiry?.destination ?? "Unspecified";
      byDestination.set(destination, (byDestination.get(destination) ?? 0) + b.amountInPaise);
    }

    return ok(res, Array.from(byDestination.entries())
      .map(([destination, revenueInPaise]) => ({ destination, revenueInPaise }))
      .sort((a, b) => b.revenueInPaise - a.revenueInPaise));
  } catch (err) {
    next(err);
  }
});

// --- Advanced: Driver Utilization ----------------------------------------------
// Utilization = share of days in the selected range the driver had at
// least one SCHEDULED/IN_PROGRESS/COMPLETED trip.
reportsRouter.get("/driver-utilization", requireEntitlement("advanced_reports"), async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const clientId = req.clientId!;
    const rangeStart = from ?? new Date(Date.now() - 30 * 86400000);
    const rangeEnd = to ?? new Date();
    const totalDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86400000));

    const drivers = await prisma.driver.findMany({
      where: { clientId },
      include: { trips: { where: { startDate: { not: null }, status: { not: "CANCELLED" } } } },
    });

    const rows = drivers.map((d) => {
      const activeDays = new Set<string>();
      for (const t of d.trips) {
        if (!t.startDate) continue;
        const start = t.startDate < rangeStart ? rangeStart : t.startDate;
        const end = (t.endDate ?? t.startDate) > rangeEnd ? rangeEnd : (t.endDate ?? t.startDate);
        for (let d2 = new Date(start); d2 <= end; d2.setDate(d2.getDate() + 1)) {
          activeDays.add(d2.toISOString().slice(0, 10));
        }
      }
      return {
        driverId: d.id,
        driverName: d.name,
        tripCount: d.trips.length,
        utilizationPercent: Math.round((activeDays.size / totalDays) * 100),
      };
    });

    return ok(res, rows.sort((a, b) => b.utilizationPercent - a.utilizationPercent));
  } catch (err) {
    next(err);
  }
});

// --- Advanced: Vehicle Utilization ----------------------------------------------
reportsRouter.get("/vehicle-utilization", requireEntitlement("advanced_reports"), async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const clientId = req.clientId!;
    const rangeStart = from ?? new Date(Date.now() - 30 * 86400000);
    const rangeEnd = to ?? new Date();
    const totalDays = Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86400000));

    const vehicles = await prisma.vehicle.findMany({
      where: { clientId },
      include: { trips: { where: { startDate: { not: null }, status: { not: "CANCELLED" } } } },
    });

    const rows = vehicles.map((v) => {
      const activeDays = new Set<string>();
      for (const t of v.trips) {
        if (!t.startDate) continue;
        const start = t.startDate < rangeStart ? rangeStart : t.startDate;
        const end = (t.endDate ?? t.startDate) > rangeEnd ? rangeEnd : (t.endDate ?? t.startDate);
        for (let d2 = new Date(start); d2 <= end; d2.setDate(d2.getDate() + 1)) {
          activeDays.add(d2.toISOString().slice(0, 10));
        }
      }
      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        tripCount: v.trips.length,
        utilizationPercent: Math.round((activeDays.size / totalDays) * 100),
      };
    });

    return ok(res, rows.sort((a, b) => b.utilizationPercent - a.utilizationPercent));
  } catch (err) {
    next(err);
  }
});

// --- Advanced: Agent Performance Trends -----------------------------------------
// Monthly won-enquiry count + revenue per agent over the selected range
// (defaults to the last 6 months) — the "trend" the SRS asks for.
reportsRouter.get("/agent-performance-trends", requireEntitlement("advanced_reports"), async (req, res, next) => {
  try {
    const { from, to } = dateRangeSchema.parse(req.query);
    const clientId = req.clientId!;
    const rangeStart = from ?? new Date(new Date().setMonth(new Date().getMonth() - 6));
    const rangeEnd = to ?? new Date();

    const enquiries = await prisma.enquiry.findMany({
      where: { clientId, status: "WON", createdAt: { gte: rangeStart, lte: rangeEnd } },
      include: {
        assignedTo: { select: { id: true, name: true } },
        quotations: { include: { booking: { select: { amountInPaise: true } } } },
      },
    });

    // Map<agentId, Map<yyyy-mm, { wonEnquiries, revenueInPaise }>>
    const trends = new Map<string, { agentName: string; months: Map<string, { wonEnquiries: number; revenueInPaise: number }> }>();
    for (const e of enquiries) {
      const agentId = e.assignedTo?.id ?? "unassigned";
      const agentName = e.assignedTo?.name ?? "Unassigned";
      const monthKey = e.createdAt.toISOString().slice(0, 7);
      const revenue = e.quotations.reduce((sum, q) => sum + (q.booking?.amountInPaise ?? 0), 0);

      if (!trends.has(agentId)) trends.set(agentId, { agentName, months: new Map() });
      const agentTrend = trends.get(agentId)!;
      const monthData = agentTrend.months.get(monthKey) ?? { wonEnquiries: 0, revenueInPaise: 0 };
      monthData.wonEnquiries += 1;
      monthData.revenueInPaise += revenue;
      agentTrend.months.set(monthKey, monthData);
    }

    const result = Array.from(trends.entries()).map(([agentId, { agentName, months }]) => ({
      agentId,
      agentName,
      months: Array.from(months.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    }));

    return ok(res, result);
  } catch (err) {
    next(err);
  }
});
