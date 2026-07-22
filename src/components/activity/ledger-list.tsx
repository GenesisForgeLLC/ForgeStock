"use client";

import {
  Printer,
  ShoppingBag,
  Gift,
  AlertTriangle,
  RotateCcw,
  Plus,
  Minus,
  Undo2,
} from "lucide-react";
import { useDateTime } from "@/components/app-settings";
import type { LedgerTxnType } from "@/lib/supabase/database.types";

export interface LedgerEntry {
  id: string;
  transaction_type: LedgerTxnType;
  quantity_delta: number;
  created_at: string;
  note: string | null;
  products: { name: string; sku: string | null } | null;
}

const meta: Record<LedgerTxnType, { icon: typeof Printer; label: string }> = {
  printed: { icon: Printer, label: "Printed" },
  sold: { icon: ShoppingBag, label: "Sold" },
  gifted: { icon: Gift, label: "Gifted" },
  damaged: { icon: AlertTriangle, label: "Damaged" },
  returned: { icon: RotateCcw, label: "Returned" },
  manual_increase: { icon: Plus, label: "Manual increase" },
  manual_decrease: { icon: Minus, label: "Manual decrease" },
  sale_reversal: { icon: Undo2, label: "Sale reversed" },
  adjustment_reversal: { icon: Undo2, label: "Adjustment reversed" },
};

export function LedgerList({ entries }: { entries: LedgerEntry[] }) {
  const { dateTime } = useDateTime();
  if (entries.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No inventory activity yet.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {entries.map((e) => {
        const m = meta[e.transaction_type];
        const Icon = m.icon;
        const positive = e.quantity_delta > 0;
        return (
          <li key={e.id} className="flex items-center gap-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.products?.name ?? "Unknown product"}</p>
              <p className="text-xs text-muted-foreground">
                {m.label} · {dateTime(e.created_at)}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${positive ? "text-success" : "text-foreground"}`}
            >
              {positive ? "+" : ""}
              {e.quantity_delta}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
