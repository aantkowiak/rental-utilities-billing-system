/* eslint-disable no-console */
import { timingSafeEqual } from "node:crypto";

import type { APIRoute } from "astro";

import { errorResponse } from "@/lib/errors";
import { dispatchTask, isSupportedTaskName, TaskDispatchError } from "@/lib/tasks";

const SERVICE_ROLE_HEADER = "x-service-role-key";

const jsonResponse = (body: Record<string, unknown>, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const getConfiguredServiceRoleKey = (): string | undefined => {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };

  const metaKey = meta.env?.SERVICE_ROLE_KEY;
  if (metaKey && metaKey.length > 0) {
    return metaKey;
  }

  const processEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;

  return processEnv?.SERVICE_ROLE_KEY;
};

const secureEquals = (expected: string, provided: string): boolean => {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
};

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const configuredKey = getConfiguredServiceRoleKey();

    if (!configuredKey) {
      console.error("[POST /v1/_tasks/run/:taskName] Missing SERVICE_ROLE_KEY environment variable");
      return errorResponse(500, "config_error", "Service role key is not configured");
    }

    const providedKey = request.headers.get(SERVICE_ROLE_HEADER);

    if (!providedKey) {
      return errorResponse(401, "unauthorized", "Missing service role key");
    }

    if (!secureEquals(configuredKey, providedKey)) {
      return errorResponse(401, "unauthorized", "Invalid service role key");
    }

    const rawTaskName = params.taskName;

    if (!rawTaskName) {
      return errorResponse(400, "invalid_request", "Task name is required");
    }

    if (!isSupportedTaskName(rawTaskName)) {
      return errorResponse(404, "task_not_found", `Unknown task: ${rawTaskName}`);
    }

    await dispatchTask(rawTaskName);

    return jsonResponse({ status: "queued" }, 202);
  } catch (error) {
    if (error instanceof TaskDispatchError) {
      console.error("[POST /v1/_tasks/run/:taskName] Task dispatch failed", error);
      return errorResponse(500, "dispatch_failed", "Failed to enqueue task");
    }

    console.error("[POST /v1/_tasks/run/:taskName] Unexpected error", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};
