import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { executeRuleAction } from "../automation/automation.service";
import { getEffectiveEntitlements } from "../guards/entitlement.guard";

const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const automationEngineQueue = new Queue("automation-engine", { connection });

// Cooldown windows per trigger type so the same target doesn't get
// re-flagged every sweep once its condition is already true.
const COOLDOWN_HOURS: Record<string, number> = {
  ENQUIRY_NO_CONTACT_WITHIN_HOURS: 24,
  QUOTATION_NOT_FOLLOWED_UP: 24,
  BOOKING_PAYMENT_OVERDUE: 24,
  PAYMENT_DUE_REMINDER: 24 * 3,
  PRE_DEPARTURE_REMINDER: 24 * 7,
  POST_TRIP_FEEDBACK: 24 * 14,
  VEHICLE_DOCUMENT_EXPIRING: 24 * 7,
};

async function alreadyFiredRecently(ruleId: string, targetId: string, cooldownHours: number): Promise<boolean> {
  const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
  const recent = await prisma.automationLog.findFirst({
    where: { ruleId, targetId, createdAt: { gte: since } },
  });
  return !!recent;
}

async function evaluateRule(rule: any) {
  const cooldown = COOLDOWN_HOURS[rule.triggerType] ?? 24;

  // 1. Lead Uncontacted Escalation
  if (rule.triggerType === "ENQUIRY_NO_CONTACT_WITHIN_HOURS") {
    const hours = Number(rule.triggerConfig.hours ?? 2);
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const candidates = await prisma.enquiry.findMany({
      where: { clientId: rule.clientId, status: { in: ["NEW", "CONTACTED"] }, createdAt: { lte: cutoff } },
      include: { followUps: { where: { activityType: { in: ["CALL", "FOLLOW_UP"] } }, take: 1 } },
    });

    for (const enquiry of candidates) {
      if (enquiry.followUps.length > 0) continue; // already contacted
      if (await alreadyFiredRecently(rule.id, enquiry.id, cooldown)) continue;
      await executeRuleAction(rule, "ENQUIRY", enquiry.id, { destination: enquiry.destination, assignedToId: enquiry.assignedToId, ageHours: hours });
    }
  }

  // 2. Quotation Follow-up Reminder
  if (rule.triggerType === "QUOTATION_NOT_FOLLOWED_UP") {
    const days = Number(rule.triggerConfig.days ?? 3);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const candidates = await prisma.quotation.findMany({
      where: { clientId: rule.clientId, status: "SENT", updatedAt: { lte: cutoff } },
      include: { enquiry: { select: { assignedToId: true } } },
    });

    for (const q of candidates) {
      if (await alreadyFiredRecently(rule.id, q.id, cooldown)) continue;
      await executeRuleAction(rule, "QUOTATION", q.id, { version: q.version, assignedToId: q.enquiry.assignedToId, daysSinceSent: days });
    }
  }

  // 3. Payment Overdue Reminder
  if (rule.triggerType === "BOOKING_PAYMENT_OVERDUE") {
    const bookings = await prisma.booking.findMany({
      where: { clientId: rule.clientId, status: { not: "CANCELLED" }, paymentDueDate: { lt: new Date() } },
      include: { payments: { select: { amountInPaise: true } } },
    });

    for (const b of bookings) {
      const paid = b.payments.reduce((sum, p) => sum + p.amountInPaise, 0);
      if (paid >= b.amountInPaise) continue; // fully paid
      if (await alreadyFiredRecently(rule.id, b.id, cooldown)) continue;
      await executeRuleAction(rule, "BOOKING", b.id, { pendingInPaise: b.amountInPaise - paid, dueDate: b.paymentDueDate });
    }
  }

  // 4. Payment Balance Due Reminder (X days before due date)
  if (rule.triggerType === "PAYMENT_DUE_REMINDER") {
    const days = Number(rule.triggerConfig.days ?? 3);
    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        clientId: rule.clientId,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        paymentDueDate: { gte: windowStart, lte: windowEnd },
      },
      include: { payments: { select: { amountInPaise: true } } },
    });

    for (const b of bookings) {
      const paid = b.payments.reduce((sum, p) => sum + p.amountInPaise, 0);
      if (paid >= b.amountInPaise) continue; // already paid in full
      if (await alreadyFiredRecently(rule.id, b.id, cooldown)) continue;
      await executeRuleAction(rule, "BOOKING", b.id, { pendingInPaise: b.amountInPaise - paid, dueDate: b.paymentDueDate });
    }
  }

  // 5. Pre-Departure Traveler Briefing (X days before trip)
  if (rule.triggerType === "PRE_DEPARTURE_REMINDER") {
    const days = Number(rule.triggerConfig.days ?? 2);
    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        clientId: rule.clientId,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        travelStart: { gte: windowStart, lte: windowEnd },
      },
    });

    for (const b of bookings) {
      if (await alreadyFiredRecently(rule.id, b.id, cooldown)) continue;
      await executeRuleAction(rule, "BOOKING", b.id, { daysBeforeDeparture: days });
    }
  }

  // 6. Post-Trip Feedback & Review Request (X days after trip completion)
  if (rule.triggerType === "POST_TRIP_FEEDBACK") {
    const days = Number(rule.triggerConfig.days ?? 1);
    const cutoffRecent = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffOldest = new Date(Date.now() - (days + 3) * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        clientId: rule.clientId,
        status: { in: ["COMPLETED", "CONFIRMED"] },
        travelEnd: { lte: cutoffRecent, gte: cutoffOldest },
      },
    });

    for (const b of bookings) {
      if (await alreadyFiredRecently(rule.id, b.id, cooldown)) continue;
      await executeRuleAction(rule, "BOOKING", b.id, { daysAfterTrip: days });
    }
  }

  // 7. Vehicle Document Expiring Alert
  if (rule.triggerType === "VEHICLE_DOCUMENT_EXPIRING") {
    const days = Number(rule.triggerConfig.days ?? 30);
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const vehicles = await prisma.vehicle.findMany({
      where: {
        clientId: rule.clientId,
        OR: [
          { rcExpiry: { lte: cutoff } },
          { insuranceExpiry: { lte: cutoff } },
          { permitExpiry: { lte: cutoff } },
          { fitnessExpiry: { lte: cutoff } },
        ],
      },
    });

    for (const v of vehicles) {
      if (await alreadyFiredRecently(rule.id, v.id, cooldown)) continue;
      await executeRuleAction(rule, "VEHICLE", v.id, { registrationNumber: v.registrationNumber });
    }
  }
}

async function runAutomationSweep() {
  // Only clients whose plan actually includes workflow_automation and
  // whose subscription is in a usable state get their rules evaluated.
  const clients = await prisma.client.findMany({
    where: { subscriptionStatus: { in: ["ACTIVE", "EXPIRING_SOON", "GRACE"] } },
    include: { plan: true },
  });

  for (const client of clients) {
    const entitlements = getEffectiveEntitlements(client);
    if (!entitlements.workflow_automation) continue;

    const rules = await prisma.automationRule.findMany({ where: { clientId: client.id, isActive: true } });
    for (const rule of rules) {
      try {
        await evaluateRule(rule);
      } catch (err) {
        console.error(`Automation rule ${rule.id} (${rule.triggerType}) failed:`, err);
      }
    }
  }
}

new Worker("automation-engine", async () => { await runAutomationSweep(); }, { connection });

automationEngineQueue.add(
  "sweep", {},
  { repeat: { every: 15 * 60 * 1000 }, removeOnComplete: true, removeOnFail: true }
);
