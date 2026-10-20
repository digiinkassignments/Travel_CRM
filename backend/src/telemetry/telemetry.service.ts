import os from "os";
import fs from "fs";
import { prisma } from "../db/prisma";
import { subscriptionLifecycleQueue } from "../jobs/subscription-lifecycle.job";
import { automationEngineQueue } from "../jobs/automation-engine.job";
import { verifySmtpHealth } from "../email/email.service";
import IORedis from "ioredis";
import { env } from "../config/env";

export interface SystemTelemetryData {
  timestamp: string;
  overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL";
  process: {
    pid: number;
    nodeVersion: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
    platform: string;
    arch: string;
    hostname: string;
  };
  cpu: {
    cores: number;
    model: string;
    speedMhz: number;
    loadAvg: [number, number, number];
  };
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
    heapPercent: number;
    systemTotalMb: number;
    systemFreeMb: number;
    systemUsedMb: number;
    systemPercent: number;
  };
  disk?: {
    totalGb: number;
    freeGb: number;
    usedGb: number;
    usedPercent: number;
  };
  database: {
    status: "HEALTHY" | "DEGRADED" | "DOWN";
    latencyMs: number;
    version?: string;
    sizeMb?: number;
    activeConnections?: number;
    tableCounts: {
      clients: number;
      users: number;
      enquiries: number;
      bookings: number;
      quotations: number;
      invoices: number;
      trips: number;
      auditLogs: number;
      paymentNotices: number;
    };
    error?: string;
  };
  redis: {
    status: "HEALTHY" | "DOWN";
    latencyMs: number;
    error?: string;
  };
  queues: {
    subscriptionLifecycle: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    automationEngine: {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  };
  smtp: {
    configured: boolean;
    connected: boolean;
    host?: string;
    port?: number;
    from?: string;
    latencyMs?: number;
    error?: string;
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export async function collectSystemTelemetry(): Promise<SystemTelemetryData> {
  const now = new Date();

  // 1. Process & OS
  const uptimeSeconds = Math.floor(process.uptime());
  const mem = process.memoryUsage();
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : "Unknown";
  const cpuSpeed = cpus.length > 0 ? cpus[0].speed : 0;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10;
  const heapTotalMb = Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10;
  const rssMb = Math.round((mem.rss / 1024 / 1024) * 10) / 10;
  const externalMb = Math.round((mem.external / 1024 / 1024) * 10) / 10;
  const heapPercent = heapTotalMb > 0 ? Math.round((heapUsedMb / heapTotalMb) * 100) : 0;

  const systemTotalMb = Math.round((totalMem / 1024 / 1024) * 10) / 10;
  const systemFreeMb = Math.round((freeMem / 1024 / 1024) * 10) / 10;
  const systemUsedMb = Math.round((usedMem / 1024 / 1024) * 10) / 10;
  const systemPercent = systemTotalMb > 0 ? Math.round((systemUsedMb / systemTotalMb) * 100) : 0;

  // Disk Space (Node.js 18.15+)
  let disk: SystemTelemetryData["disk"] = undefined;
  try {
    if (typeof (fs.promises as any).statfs === "function") {
      const stats = await (fs.promises as any).statfs(".");
      const totalBytes = stats.bsize * stats.blocks;
      const freeBytes = stats.bsize * stats.bavail;
      const usedBytes = totalBytes - freeBytes;
      const totalGb = Math.round((totalBytes / 1024 / 1024 / 1024) * 10) / 10;
      const freeGb = Math.round((freeBytes / 1024 / 1024 / 1024) * 10) / 10;
      const usedGb = Math.round((usedBytes / 1024 / 1024 / 1024) * 10) / 10;
      const usedPercent = totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0;
      disk = { totalGb, freeGb, usedGb, usedPercent };
    }
  } catch {
    // Disk stats not supported or failed
  }

  // 2. Database Health
  let dbStatus: "HEALTHY" | "DEGRADED" | "DOWN" = "HEALTHY";
  let dbLatencyMs = 0;
  let dbVersion = "";
  let dbSizeMb = 0;
  let activeConnections = 0;
  let dbError: string | undefined;

  let tableCounts = {
    clients: 0,
    users: 0,
    enquiries: 0,
    bookings: 0,
    quotations: 0,
    invoices: 0,
    trips: 0,
    auditLogs: 0,
    paymentNotices: 0,
  };

  const dbStart = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1;");
    dbLatencyMs = Date.now() - dbStart;

    if (dbLatencyMs > 500) {
      dbStatus = "DEGRADED";
    }

    // Version (works in both MySQL and PostgreSQL)
    try {
      const versionRes: any = await prisma.$queryRawUnsafe("SELECT VERSION() as version;");
      if (Array.isArray(versionRes) && versionRes[0]?.version) {
        dbVersion = String(versionRes[0].version);
      }
    } catch {}

    // Size (MySQL / MariaDB calculation)
    try {
      const sizeRes: any = await prisma.$queryRawUnsafe(
        "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM information_schema.tables WHERE table_schema = DATABASE();"
      );
      if (Array.isArray(sizeRes) && (sizeRes[0]?.size_mb != null || sizeRes[0]?.SIZE_MB != null)) {
        dbSizeMb = Number(sizeRes[0].size_mb ?? sizeRes[0].SIZE_MB);
      }
    } catch {}

    // Active Connections (MySQL processlist)
    try {
      const connRes: any = await prisma.$queryRawUnsafe(
        "SELECT COUNT(*) as count FROM information_schema.processlist;"
      );
      if (Array.isArray(connRes) && (connRes[0]?.count != null || connRes[0]?.COUNT != null)) {
        activeConnections = Number(connRes[0].count ?? connRes[0].COUNT);
      }
    } catch {}

    // Table row counts in parallel
    const [
      clientsCount,
      usersCount,
      enquiriesCount,
      bookingsCount,
      quotationsCount,
      invoicesCount,
      tripsCount,
      auditLogsCount,
      paymentNoticesCount,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.user.count(),
      prisma.enquiry.count(),
      prisma.booking.count(),
      prisma.quotation.count(),
      prisma.invoice.count(),
      prisma.trip.count(),
      prisma.superAdminAuditLog.count(),
      prisma.paymentNotice.count(),
    ]);

    tableCounts = {
      clients: clientsCount,
      users: usersCount,
      enquiries: enquiriesCount,
      bookings: bookingsCount,
      quotations: quotationsCount,
      invoices: invoicesCount,
      trips: tripsCount,
      auditLogs: auditLogsCount,
      paymentNotices: paymentNoticesCount,
    };
  } catch (err: any) {
    dbStatus = "DOWN";
    dbLatencyMs = Date.now() - dbStart;
    dbError = err?.message || "Database connection error";
  }

  // 3. Redis & Queues
  let redisStatus: "HEALTHY" | "DOWN" = "HEALTHY";
  let redisLatencyMs = 0;
  let redisError: string | undefined;

  const redisClient = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: 0,
    connectTimeout: 1500,
    lazyConnect: true,
    retryStrategy: () => null, // do not auto-reconnect
  });
  redisClient.on("error", (e) => {
    // Suppress unhandled event crashes when redis is unreachable
    redisError = e?.message;
  });

  const redisStart = Date.now();
  try {
    const connectPromise = redisClient.connect().then(() => redisClient.ping());
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timed out")), 1500)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    redisLatencyMs = Date.now() - redisStart;
  } catch (err: any) {
    redisStatus = "DOWN";
    redisLatencyMs = Date.now() - redisStart;
    redisError = err?.message || "Failed to ping Redis";
  } finally {
    try {
      await redisClient.quit();
    } catch {
      try {
        redisClient.disconnect();
      } catch {}
    }
  }

  let lifecycleCounts = { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0 };
  let automationCounts = { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0 };

  if (redisStatus === "HEALTHY") {
    try {
      const countsPromise = Promise.all([
        subscriptionLifecycleQueue.getJobCounts("active", "waiting", "completed", "failed", "delayed"),
        automationEngineQueue.getJobCounts("active", "waiting", "completed", "failed", "delayed"),
      ]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Queue timeout")), 1500)
      );
      const [lc, ac] = await Promise.race([countsPromise, timeoutPromise]);
      lifecycleCounts = lc as any;
      automationCounts = ac as any;
    } catch {
      // Default to 0 if queue metrics timeout
    }
  }

  // 4. SMTP Email Health
  const smtp = await verifySmtpHealth();

  // 5. Compute Overall Status
  let overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY";
  if (dbStatus === "DOWN") {
    overallStatus = "CRITICAL";
  } else if (
    redisStatus === "DOWN" ||
    dbStatus === "DEGRADED" ||
    heapPercent > 90 ||
    systemPercent > 92 ||
    lifecycleCounts.failed > 50 ||
    automationCounts.failed > 50 ||
    (!smtp.connected && smtp.configured)
  ) {
    overallStatus = "DEGRADED";
  }

  return {
    timestamp: now.toISOString(),
    overallStatus,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeSeconds),
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
    },
    cpu: {
      cores: cpus.length,
      model: cpuModel,
      speedMhz: cpuSpeed,
      loadAvg: os.loadavg() as [number, number, number],
    },
    memory: {
      heapUsedMb,
      heapTotalMb,
      rssMb,
      externalMb,
      heapPercent,
      systemTotalMb,
      systemFreeMb,
      systemUsedMb,
      systemPercent,
    },
    disk,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      version: dbVersion || undefined,
      sizeMb: dbSizeMb || undefined,
      activeConnections: activeConnections || undefined,
      tableCounts,
      error: dbError,
    },
    redis: {
      status: redisStatus,
      latencyMs: redisLatencyMs,
      error: redisError,
    },
    queues: {
      subscriptionLifecycle: lifecycleCounts,
      automationEngine: automationCounts,
    },
    smtp,
  };
}
