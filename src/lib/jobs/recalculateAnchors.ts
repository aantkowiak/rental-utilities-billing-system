import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { RecalculateAnchorsCmd } from "@/types";

type Supabase = SupabaseClient<Database>;

interface AnchorRecalculationTask extends RecalculateAnchorsCmd {
  requestedAt: string;
}

const taskQueue: AnchorRecalculationTask[] = [];
let isProcessing = false;

export const enqueueAnchorRecalculation = async (supabase: Supabase, payload: RecalculateAnchorsCmd): Promise<void> => {
  taskQueue.push({
    ...payload,
    requestedAt: new Date().toISOString(),
  });

  // Process in background without blocking the response cycle
  void processQueue(supabase);
};

export const getPendingAnchorTasks = (): AnchorRecalculationTask[] => [...taskQueue];

const processQueue = async (supabase: Supabase): Promise<void> => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    while (taskQueue.length > 0) {
      const task = taskQueue.shift();
      if (!task) {
        continue;
      }

      try {
        await handleAnchorRecalculation(supabase, task);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[anchor-recalc] Failed to process task", { task, error });
      }
    }
  } finally {
    isProcessing = false;
  }
};

const handleAnchorRecalculation = async (supabase: Supabase, task: AnchorRecalculationTask): Promise<void> => {
  // Placeholder implementation. In production this should call a stored procedure or
  // a server-side worker to backfill anchor readings.
  // eslint-disable-next-line no-console
  console.info("[anchor-recalc] Processing task", task);

  // Example stub: upsert a row into a hypothetical table or call an RPC.
  // await supabase.rpc("recalculate_anchor_readings", task);

  // Simulate async workload to allow queue draining without blocking
  await new Promise((resolve) => setTimeout(resolve, 10));
};
