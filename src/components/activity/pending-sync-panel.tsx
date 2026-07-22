"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAllOps, removeOp, type QueuedSaleOp } from "@/lib/offline/db";
import { useSync } from "@/components/pwa/sync-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PendingSyncPanel() {
  const { sync, refreshPending, pendingCount } = useSync();
  const [ops, setOps] = useState<QueuedSaleOp[]>([]);

  async function load() {
    try {
      const all = await getAllOps();
      setOps(all.filter((o) => o.status !== "synced"));
    } catch {
      setOps([]);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount]);

  if (ops.length === 0) return null;

  return (
    <Card className="mb-5 border-amber-500/40">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-amber-300">Queued sales ({ops.length})</CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await sync();
            await load();
          }}
        >
          <RefreshCw className="h-4 w-4" /> Sync now
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ops.map((op) => (
            <li key={op.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
              {op.status === "error" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <Clock className="h-4 w-4 shrink-0 text-amber-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {op.payload.lines.reduce((s, l) => s + l.quantity, 0)} item(s) ·{" "}
                  {new Date(op.createdAt).toLocaleTimeString()}
                </p>
                {op.lastError && <p className="truncate text-xs text-destructive">{op.lastError}</p>}
              </div>
              <Badge variant={op.status === "error" ? "destructive" : "warning"}>{op.status}</Badge>
              {op.status === "error" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Discard failed sale"
                  onClick={async () => {
                    await removeOp(op.id);
                    await refreshPending();
                    await load();
                    toast.message("Removed failed sale from the queue");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
