"use client";

import { getPendingOps, removeOp, updateOp, type QueuedSaleOp } from "./db";

export interface SyncOutcome {
  synced: number;
  failed: number;
  remaining: number;
}

/**
 * Push queued sales to the server sequentially. The server RPC is idempotent
 * on idempotency_key, so retries after a refresh or flaky network never create
 * duplicate sales. Validation failures (4xx) are marked as errors and left
 * visible; transient network failures keep the op pending for the next attempt.
 */
export async function syncPendingSales(): Promise<SyncOutcome> {
  const pending = await getPendingOps();
  let synced = 0;
  let failed = 0;

  for (const op of pending) {
    await updateOp(op.id, { status: "syncing" });
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(op.payload),
      });

      if (res.ok) {
        // Success (including idempotent replays) — safe to drop the local op.
        await removeOp(op.id);
        synced++;
      } else if (res.status >= 400 && res.status < 500) {
        // Permanent validation/stock conflict — keep it visible for the user.
        const body = await safeJson(res);
        await updateOp(op.id, {
          status: "error",
          retryCount: op.retryCount + 1,
          lastError: body?.error || `Server rejected the sale (${res.status})`,
        });
        failed++;
      } else {
        // Server error — retry later.
        await updateOp(op.id, {
          status: "pending",
          retryCount: op.retryCount + 1,
          lastError: `Server error (${res.status}); will retry`,
        });
      }
    } catch (err) {
      // Network error — keep pending, never discard.
      await updateOp(op.id, {
        status: "pending",
        retryCount: op.retryCount + 1,
        lastError: err instanceof Error ? err.message : "Network error; will retry",
      });
    }
  }

  const remaining = (await getPendingOps()).length;
  return { synced, failed, remaining };
}

async function safeJson(res: Response): Promise<{ error?: string } | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export type { QueuedSaleOp };
