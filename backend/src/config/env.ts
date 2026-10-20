import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),

  databaseUrl: required("DATABASE_URL"),

  jwt: {
    accessSecret: required("JWT_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },

  redisUrl: required("REDIS_URL", "redis://localhost:6379"),

  smtp: {
    host: process.env.SMTP_HOST || process.env.MAIL_HOST || "",
    port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587),
    user: process.env.SMTP_USER || process.env.MAIL_USER || "",
    password: process.env.SMTP_PASSWORD || process.env.MAIL_PASS || process.env.MAIL_PASSWORD || "",
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || "Digiink Solutions <hostingdigiink@gmail.com>",
  },

  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  apiUrl: process.env.API_URL ?? "http://localhost:4000",

  subscription: {
    expiringSoonDays: Number(process.env.SUBSCRIPTION_EXPIRING_SOON_DAYS ?? 7),
    graceDays: Number(process.env.SUBSCRIPTION_GRACE_DAYS ?? 3),
    deleteAfterDays: Number(process.env.SUBSCRIPTION_DELETE_AFTER_DAYS ?? 20),
  },
};
