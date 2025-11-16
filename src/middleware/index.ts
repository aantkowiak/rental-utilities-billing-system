import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "../db/supabase.server.ts";
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
  // Protect admin and app pages
  if (pathname.startsWith("/admin/") || pathname.startsWith("/app/")) {
    return true;
  }
  
  // Protect API endpoints except auth endpoints
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/v1/auth/")) {
    return true;
  }
  
  return false;
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

  // Create Supabase client with user's session from cookies
  const supabase = createSupabaseServerClient(context.cookies);
  context.locals.supabase = supabase;

  // Initialize auth as null
  context.locals.auth = null;

  // Check if route is protected
  if (isProtectedRoute(url.pathname)) {
    const isApiRoute = url.pathname.startsWith("/api/");
    
    // Validate session using the authenticated client
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("[middleware] Protected route:", url.pathname);
    console.log("[middleware] User:", user?.id, user?.email);
    console.log("[middleware] Error:", error?.message);

    if (error || !user) {
      // Not authenticated
      console.log("[middleware] No user or error - auth failed");
      if (isApiRoute) {
        // For API routes, return JSON error response
        return errorResponse(401, "unauthorized", "Authentication required");
      }
      // For pages, redirect to login
      return context.redirect("/auth/login");
    }

    // Fetch user profile for role and property_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, property_id")
      .eq("user_id", user.id)
      .single();

    console.log("[middleware] Profile:", profile);
    console.log("[middleware] Profile error:", profileError?.message);

    if (profileError || !profile) {
      // Profile not found
      console.log("[middleware] No profile - auth failed");
      if (isApiRoute) {
        return errorResponse(401, "unauthorized", "User profile not found");
      }
      return context.redirect("/auth/login");
    }

    // Validate role
    if (profile.role !== "tenant" && profile.role !== "admin") {
      // Invalid role
      console.log("[middleware] Invalid role - auth failed");
      if (isApiRoute) {
        return errorResponse(403, "forbidden", "Invalid user role");
      }
      return context.redirect("/auth/login");
    }

    // Set auth in locals
    context.locals.auth = {
      user,
      role: profile.role,
      propertyId: profile.property_id,
    };
    console.log("[middleware] Auth set successfully:", context.locals.auth.role);
  }

  return next();
});
