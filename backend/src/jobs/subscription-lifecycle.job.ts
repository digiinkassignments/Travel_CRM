import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { computeEffectiveStatus } from "../subscriptions/subscription-state";
import { sendMail } from "../email/email.service";

const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const subscriptionLifecycleQueue = new Queue("subscription-lifecycle", { connection });

async function runLifecycleSweep() {
  const clients = await prisma.client.findMany({ where: { subscriptionStatus: { not: "DELETED" } } });

  for (const client of clients) {
    // If admin explicitly deactivated/locked this client, preserve the lock
    if (client.subscriptionStatus === "LOCKED" && client.lockedAt) {
      continue;
    }

    const { status, graceEndsAt, deleteAt } = computeEffectiveStatus({
      subscriptionExpiry: client.subscriptionExpiry,
      graceEndsAt: client.graceEndsAt,
      currentStatus: client.subscriptionStatus,
      lockedAt: client.lockedAt,
    });

    if (status !== client.subscriptionStatus) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          subscriptionStatus: status,
          graceEndsAt,
          lockedAt: status === "LOCKED" && !client.lockedAt ? new Date() : client.lockedAt,
        },
      });

      if (status === "EXPIRING_SOON") {
        await sendMail(client.email, "Your Digiink plan is expiring soon", "Renew to avoid interruption.");
      } else if (status === "GRACE") {
        await sendMail(client.email, "Your Digiink plan has expired", "You have a 3-day grace period to renew.");
      } else if (status === "LOCKED") {
        await sendMail(client.email, "Your Digiink account is locked", "Please complete payment to restore access.");
      }
    }

    const now = new Date();
    const warnAt = new Date(deleteAt);
    warnAt.setDate(warnAt.getDate() - 2);
    if (status === "LOCKED" && now >= warnAt && now < deleteAt) {
      await sendMail(client.email, "Final warning: your Digiink data will be deleted soon", "Pay now to avoid permanent data loss.");
    }

    if (status === "LOCKED" && now >= deleteAt) {
      // Flagged for manual Super Admin review — deletion (even soft-delete)
      // stays a deliberate, explicit action, never automatic.
      console.warn(`Client ${client.id} has passed Day 20 unpaid — flagged for Super Admin deletion review.`);
    }
  }
}

new Worker("subscription-lifecycle", async () => { await runLifecycleSweep(); }, { connection });

subscriptionLifecycleQueue.add(
  "hourly-sweep", {},
  { repeat: { every: 60 * 60 * 1000 }, removeOnComplete: true, removeOnFail: true }
);
