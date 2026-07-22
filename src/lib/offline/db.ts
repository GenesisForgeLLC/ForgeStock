"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CreateSaleInput } from "@/lib/validation";

export type OpStatus = "pending" | "syncing" | "synced" | "error";

export interface QueuedSaleOp {
  /** Equal to payload.idempotency_key. Primary key. */
  id: string;
  type: "sale";
  userId: string | null;
  eventId: string | null;
  payload: CreateSaleInput;
  status: OpStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: number; // local timestamp (ms)
  updatedAt: number;
}

/** A cached snapshot of an open event + its sellable catalog for offline use. */
export interface EventCacheEntry {
  eventId: string;
  event: unknown;
  items: unknown[];
  cachedAt: number;
}

interface ForgeStockDB extends DBSchema {
  operations: {
    key: string;
    value: QueuedSaleOp;
    indexes: { "by-status": OpStatus; "by-event": string };
  };
  eventCache: {
    key: string;
    value: EventCacheEntry;
  };
}

const DB_NAME = "forgestock";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ForgeStockDB>> | null = null;

export function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<ForgeStockDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("operations")) {
          const store = db.createObjectStore("operations", { keyPath: "id" });
          store.createIndex("by-status", "status");
          store.createIndex("by-event", "eventId");
        }
        if (!db.objectStoreNames.contains("eventCache")) {
          db.createObjectStore("eventCache", { keyPath: "eventId" });
        }
      },
    });
  }
  return dbPromise;
}

// ------------------------------------------------------------- operations ---

export async function enqueueSale(op: Omit<QueuedSaleOp, "type" | "status" | "retryCount" | "lastError" | "createdAt" | "updatedAt"> & Partial<QueuedSaleOp>) {
  const db = await getDB();
  const now = Date.now();
  const record: QueuedSaleOp = {
    type: "sale",
    status: "pending",
    retryCount: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    userId: op.userId ?? null,
    eventId: op.eventId ?? null,
    payload: op.payload,
    id: op.id,
  };
  await db.put("operations", record);
  return record;
}

export async function getAllOps(): Promise<QueuedSaleOp[]> {
  const db = await getDB();
  return db.getAll("operations");
}

export async function getPendingOps(): Promise<QueuedSaleOp[]> {
  const db = await getDB();
  const all = await db.getAll("operations");
  return all.filter((o) => o.status === "pending" || o.status === "error");
}

export async function countUnsynced(): Promise<number> {
  const all = await getAllOps();
  return all.filter((o) => o.status !== "synced").length;
}

export async function updateOp(id: string, patch: Partial<QueuedSaleOp>) {
  const db = await getDB();
  const existing = await db.get("operations", id);
  if (!existing) return;
  await db.put("operations", { ...existing, ...patch, updatedAt: Date.now() });
}

export async function removeOp(id: string) {
  const db = await getDB();
  await db.delete("operations", id);
}

// ------------------------------------------------------------- event cache --

export async function cacheEvent(entry: EventCacheEntry) {
  const db = await getDB();
  await db.put("eventCache", entry);
}

export async function getCachedEvent(eventId: string): Promise<EventCacheEntry | undefined> {
  const db = await getDB();
  return db.get("eventCache", eventId);
}
