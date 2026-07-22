"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDateTime, useMoney } from "@/components/app-settings";
import { voidSaleRemote } from "@/lib/offline/event-sales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export interface SaleRow {
  id: string;
  status: "completed" | "voided";
  total_cents: number;
  payment_method: string;
  sold_at: string;
  events: { name: string } | null;
}

export function SalesList({ sales }: { sales: SaleRow[] }) {
  const router = useRouter();
  const { dateTime } = useDateTime();
  const money = useMoney();
  const [target, setTarget] = useState<SaleRow | null>(null);
  const [busy, setBusy] = useState(false);

  if (sales.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No sales yet.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {sales.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.events?.name ?? "Manual sale"}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {s.payment_method} · {dateTime(s.sold_at)}
              </p>
            </div>
            {s.status === "voided" ? (
              <Badge variant="destructive">Voided</Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setTarget(s)}
              >
                <Undo2 className="h-4 w-4" /> Void
              </Button>
            )}
            <span
              className={`w-20 shrink-0 text-right text-sm font-semibold tabular-nums ${s.status === "voided" ? "text-muted-foreground line-through" : ""}`}
            >
              {money(s.total_cents)}
            </span>
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this sale?</DialogTitle>
            <DialogDescription>
              The sale is preserved for your records but marked voided, and the units are returned to
              inventory through reversing transactions. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!target) return;
                setBusy(true);
                try {
                  await voidSaleRemote(target.id, "Voided from activity");
                  toast.success("Sale voided and inventory restored");
                  setTarget(null);
                  router.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not void");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Void sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
