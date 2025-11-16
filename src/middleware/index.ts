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

const isProtectedRoute = (pathname: string): boolean => {
  return pathname.startsWith("/admin/") || pathname.startsWith("/app/");
};

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
  const url = new URL(context.request.url);

  // Handle scheduler task rate limiting
  if (isSchedulerTaskRequest(url)) {
    const clientId = getClientIdentifier(context.request, (context as { clientAddress?: string }).clientAddress);

    if (!checkSchedulerRateLimit(clientId)) {
      return errorResponse(429, "rate_limited", "Too many scheduler task requests");
    }
  }

  // Inject supabase client
  context.locals.supabase = supabaseAdmin;

  // Initialize auth as null
  context.locals.auth = null;

  // Check if route is protected
  if (isProtectedRoute(url.pathname)) {
    // Validate session
    const { data: { user }, error } = await supabaseAdmin.auth.getUser();

    if (error || !user) {
      // Not authenticated - redirect to login
      return context.redirect("/auth/login");
    }

    // Fetch user profile for role and property_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, property_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      // Profile not found - redirect to login
      return context.redirect("/auth/login");
    }

    // Validate role
    if (profile.role !== "tenant" && profile.role !== "admin") {
      // Invalid role - redirect to login
      return context.redirect("/auth/login");
    }

    // Set auth in locals
    context.locals.auth = {
      user,
      role: profile.role,
      propertyId: profile.property_id,
    };
  }

  return next();
});
