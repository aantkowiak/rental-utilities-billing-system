/// <reference types="vitest" />

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "../[taskName].post";
import {
  registerTaskEnqueuer,
  resetTaskEnqueuer,
  TaskDispatchError,
  type TaskJobDefinition,
} from "../../../../../../lib/tasks";

const buildContext = (taskName: string, headers?: HeadersInit) => {
  const url = `http://localhost/api/v1/_tasks/run/${taskName}`;
  const request = new Request(url, {
    method: "POST",
    headers,
  });

  return {
    request,
    params: { taskName },
    locals: {} as Record<string, never>,
  } as Parameters<typeof POST>[0];
};

describe("POST /v1/_tasks/run/:taskName", () => {
  const serviceKey = "svc-secret-key";

  beforeEach(() => {
    process.env.SERVICE_ROLE_KEY = serviceKey;
    resetTaskEnqueuer();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.SERVICE_ROLE_KEY;
    resetTaskEnqueuer();
  });

  it("enqueues known task when header matches", async () => {
    const enqueueSpy = vi.fn<[TaskJobDefinition], Promise<void>>().mockResolvedValue();

    registerTaskEnqueuer(async (job: TaskJobDefinition) => enqueueSpy(job));

    const context = buildContext("day1Reminder", [["x-service-role-key", serviceKey]]);

    const response = await POST(context);
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json).toEqual({ status: "queued" });
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskName: "day1Reminder",
        queueName: "scheduler.day1Reminder",
      })
    );
  });

  it("rejects when service key header is missing", async () => {
    const context = buildContext("day1Reminder");

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("rejects when service key header is invalid", async () => {
    const context = buildContext("day1Reminder", [["x-service-role-key", "wrong"]]);

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("returns 404 for unsupported task", async () => {
    const context = buildContext("unknownTask", [["x-service-role-key", serviceKey]]);

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("task_not_found");
  });

  it("handles dispatcher failures", async () => {
    registerTaskEnqueuer(async () => {
      throw new TaskDispatchError("day1Reminder", "boom");
    });

    const context = buildContext("day1Reminder", [["x-service-role-key", serviceKey]]);

    const response = await POST(context);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("dispatch_failed");
  });
});
