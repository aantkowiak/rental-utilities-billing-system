import { supabaseAdmin } from "../../db/supabase.client.ts";

type TaskPayload = Record<string, unknown>;

export type SchedulerTaskName = keyof typeof SUPPORTED_TASKS;

export interface TaskJobDefinition {
  taskName: SchedulerTaskName;
  queueName: string;
  payload?: TaskPayload;
}

export type TaskEnqueuer = (job: TaskJobDefinition) => Promise<void>;

const SUPPORTED_TASKS = {
  day1Reminder: { queueName: "scheduler.day1Reminder" },
  autoGenerate: { queueName: "scheduler.autoGenerate" },
  adminReminder: { queueName: "scheduler.adminReminder" },
} as const satisfies Record<string, { queueName: string }>;

export class UnknownTaskError extends Error {
  public readonly taskName: string;

  constructor(taskName: string) {
    super(`Unknown scheduler task: ${taskName}`);
    this.name = "UnknownTaskError";
    this.taskName = taskName;
  }
}

export class TaskDispatchError extends Error {
  public readonly taskName: SchedulerTaskName;
  public readonly cause?: unknown;

  constructor(taskName: SchedulerTaskName, message: string, cause?: unknown) {
    super(`Failed to enqueue task "${taskName}": ${message}`);
    this.name = "TaskDispatchError";
    this.taskName = taskName;
    this.cause = cause;
  }
}

const SUPABASE_EDGE_FUNCTION = "enqueue_scheduler_task";

const defaultTaskEnqueuer: TaskEnqueuer = async (job) => {
  const { error } = await supabaseAdmin.functions.invoke(SUPABASE_EDGE_FUNCTION, {
    body: {
      taskName: job.taskName,
      queueName: job.queueName,
      payload: job.payload ?? {},
    },
  });

  if (error) {
    throw new TaskDispatchError(
      job.taskName,
      error.message ?? "Unknown Supabase function error",
      error
    );
  }
};

let activeEnqueuer: TaskEnqueuer = defaultTaskEnqueuer;

export function registerTaskEnqueuer(enqueuer: TaskEnqueuer): void {
  activeEnqueuer = enqueuer;
}

export function resetTaskEnqueuer(): void {
  activeEnqueuer = defaultTaskEnqueuer;
}

export function getSupportedTaskNames(): SchedulerTaskName[] {
  return Object.keys(SUPPORTED_TASKS) as SchedulerTaskName[];
}

export function isSupportedTaskName(taskName: string): taskName is SchedulerTaskName {
  return Boolean((SUPPORTED_TASKS as Record<string, unknown>)[taskName]);
}

export async function dispatchTask(taskName: SchedulerTaskName, payload: TaskPayload = {}): Promise<void> {
  const task = (SUPPORTED_TASKS as Record<string, { queueName: string }>)[taskName];

  if (!task) {
    throw new UnknownTaskError(taskName);
  }

  await activeEnqueuer({
    taskName,
    queueName: task.queueName,
    payload,
  });
}



