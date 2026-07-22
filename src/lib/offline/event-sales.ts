"use client";

import { enqueueSale, removeOp } from "./db";
import type { CreateSaleInput } from "@/lib/validation";

export class SaleValidationError extends Error {}

export type RecordSaleResult =
  | { status: "synced"; saleId: string }
  | { status: "queued" };

/**
 * Local-first sale recording:
 *   1. Persist the operation to IndexedDB (nothing is ever lost).
 *   2. If online, try to sync immediately and capture the server sale id.
 *   3. On a permanent validation/stock error, remove the op and throw so the
 *      caller can roll back the optimistic UI.
 *   4. On a network error (or offline), leave the op queued for later sync.
 *
 * The DB function is idempotent on idempotency_key, so a queued op that also
 * partially succeeded will never double-charge.
 */
export async function recordSaleLocalFirst(
  payload: CreateSaleInput,
  meta: { userId: string | null; eventId: string | null },
): Promise<RecordSaleResult> {
  await enqueueSale({
    id: payload.idempotency_key,
    payload,
    userId: meta.userId,
    eventId: meta.eventId,
  });

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { status: "queued" };
  }

  try {
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const body = (await res.json()) as { result?: { sale_id?: string } };
      await removeOp(payload.idempotency_key);
      return { status: "synced", saleId: body.result?.sale_id ?? "" };
    }

    if (res.status >= 400 && res.status < 500 && res.status !== 408) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      await removeOp(payload.idempotency_key);
      throw new SaleValidationError(body?.error || "The sale was rejected.");
    }

    // 5xx / timeout — keep queued for retry.
    return { status: "queued" };
  } catch (err) {
    if (err instanceof SaleValidationError) throw err;
    // Network failure — keep queued.
    return { status: "queued" };
  }
}

/** Void a previously-synced sale (creates reversing inventory transactions). */
export async function voidSaleRemote(saleId: string, reason = "Undo"): Promise<void> {
  const res = await fetch("/api/sales/void", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sale_id: saleId, void_reason: reason }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not void the sale.");
  }
}

/** Remove a still-queued (unsynced) op so it never reaches the server. */
export async function cancelQueuedSale(idempotencyKey: string): Promise<void> {
  await removeOp(idempotencyKey);
}
