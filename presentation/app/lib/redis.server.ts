import Redis from "ioredis";

// Reuse the connection across hot reloads in dev
declare global {
  var __redis: Redis | undefined;
}

export const redis =
  global.__redis ??
  (global.__redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379"));