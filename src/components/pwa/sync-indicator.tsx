"use client";

import { Cloud, CloudOff, RefreshCw, Loader2 } from "lucide-react";
import { useSync } from "./sync-provider";
import { cn } from "@/lib/utils";

/** Compact online / offline / syncing badge with the unsynced-op count. */
export function SyncIndicator({ className }: { className?: string }) {
  const { online, syncing, pendingCount } = useSync();

  let Icon = Cloud;
  let label = "Online";
  let tone = "text-success";
  if (!online) {
    Icon = CloudOff;
    label = "Offline";
    tone = "text-amber-400";
  } else if (syncing) {
    Icon = Loader2;
    label = "Syncing";
    tone = "text-primary";
  } else if (pendingCount > 0) {
    Icon = RefreshCw;
    label = "Pending";
    tone = "text-amber-400";
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium",
        tone,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
      <span>{label}</span>
      {pendingCount > 0 && (
        <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] tabular-nums text-amber-300">
          {pendingCount}
        </span>
      )}
    </div>
  );
}
