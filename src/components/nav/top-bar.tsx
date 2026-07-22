"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { SyncIndicator } from "@/components/pwa/sync-indicator";
import { Button } from "@/components/ui/button";

export function TopBar({
  activeEventId,
  activeEventName,
}: {
  activeEventId: string | null;
  activeEventName: string | null;
}) {
  return (
    <header className="safe-top sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="min-w-0 flex-1">
        {activeEventId && (
          <Button asChild variant="secondary" size="sm" className="max-w-full">
            <Link href={`/events/${activeEventId}/mode`} className="truncate">
              <Store className="h-4 w-4 shrink-0" />
              <span className="truncate">{activeEventName ?? "Active event"}</span>
            </Link>
          </Button>
        )}
      </div>
      <SyncIndicator />
    </header>
  );
}
