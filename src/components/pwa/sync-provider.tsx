"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { countUnsynced } from "@/lib/offline/db";
import { syncPendingSales } from "@/lib/offline/sync";

interface SyncContextValue {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  /** Refresh the pending counter from IndexedDB (call after enqueueing). */
  refreshPending: () => Promise<void>;
  /** Attempt to sync now. */
  sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  online: true,
  syncing: false,
  pendingCount: 0,
  refreshPending: async () => {},
  sync: async () => {},
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    try {
      setPendingCount(await countUnsynced());
    } catch {
      /* IndexedDB unavailable (e.g. private mode) — ignore. */
    }
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const outcome = await syncPendingSales();
      await refreshPending();
      if (outcome.synced > 0) {
        toast.success(`${outcome.synced} queued sale${outcome.synced > 1 ? "s" : ""} synced`);
      }
      if (outcome.failed > 0) {
        toast.error(`${outcome.failed} queued sale${outcome.failed > 1 ? "s" : ""} need attention`);
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshPending]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refreshPending();

    const handleOnline = () => {
      setOnline(true);
      void sync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Attempt an initial sync and poll periodically while the app is open.
    void sync();
    const interval = setInterval(() => void sync(), 30_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [sync, refreshPending]);

  return (
    <SyncContext.Provider value={{ online, syncing, pendingCount, refreshPending, sync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
