import { defineMiddleware } from "astro:middleware";

import { supabaseAdmin } from "../db/supabase.client.ts";
import { errorResponse } from "../lib/errors.ts";

const TASK_RATE_LIMIT_WINDOW_MS = 60_000;
const TASK_RATE_LIMIT_MAX_REQUESTS = 5;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const schedulerBuckets = new Map<string, RateLimitBucket>();

const isSchedulerTaskRequest = (url: URL): boolean => url.pathname.startsWith("/api/v1/_tasks/run");

const getClientIdentifier = (request: Request, fallbackAddress?: string): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first) {
      return first.trim();
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  if (fallbackAddress) {
    return fallbackAddress;
  }

  return "unknown";
};

const checkSchedulerRateLimit = (clientId: string): boolean => {
  const now = Date.now();
  const bucket = schedulerBuckets.get(clientId);

  if (!bucket || now > bucket.resetAt) {
    schedulerBuckets.set(clientId, {
      count: 1,
      resetAt: now + TASK_RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (bucket.count >= TASK_RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  return true;
};

export const onRequest = defineMiddleware(async (context, next) => {
  if (isSchedulerTaskRequest(new URL(context.request.url))) {
    const clientId = getClientIdentifier(context.request, (context as { clientAddress?: string }).clientAddress);

    if (!checkSchedulerRateLimit(clientId)) {
      return errorResponse(429, "rate_limited", "Too many scheduler task requests");
    }
  }

  context.locals.supabase = supabaseAdmin;
  return next();
});
