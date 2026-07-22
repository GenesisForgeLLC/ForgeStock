"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, MoreVertical, Printer, Gift, AlertTriangle, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdjustmentDialog } from "./adjustment-dialog";
import { MoneyText } from "@/components/money-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMarginPct } from "@/lib/calc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface InventoryRow {
  id: string;
  name: string;
  sku: string | null;
  category_name: string | null;
  image_path: string | null;
  on_hand: number;
  default_price_cents: number;
  unit_cost_cents: number;
  inventory_value_cents: number;
  retail_value_cents: number;
  is_low_stock: boolean;
}

export function InventoryItem({ row, imageUrl }: { row: InventoryRow; imageUrl: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState("gifted");

  const soldOut = row.on_hand <= 0;

  function openAdjust(type: string) {
    setInitialType(type);
    setOpen(true);
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <Link
          href={`/products/${row.id}`}
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
        >
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill sizes="56px" className="object-cover" unoptimized />
          ) : (
            <Package className="h-5 w-5 text-muted-foreground" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/products/${row.id}`} className="truncate font-medium hover:underline">
            {row.name}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {row.sku && <span className="tabular-nums">{row.sku}</span>}
            <span>·</span>
            <span>
              cost <MoneyText cents={row.unit_cost_cents} />
            </span>
            <span>·</span>
            <span>{formatMarginPct(row.default_price_cents, row.unit_cost_cents)} margin</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {soldOut ? (
            <Badge variant="destructive">Sold out</Badge>
          ) : row.is_low_stock ? (
            <Badge variant="warning">{row.on_hand} left</Badge>
          ) : (
            <span className="text-lg font-semibold tabular-nums text-success">{row.on_hand}</span>
          )}
          <span className="text-xs text-muted-foreground">
            <MoneyText cents={row.default_price_cents} />
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push(`/prints/new?product=${row.id}`)}>
              <Printer className="h-4 w-4" /> Record print batch
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAdjust("gifted")}>
              <Gift className="h-4 w-4" /> Gift item
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAdjust("damaged")}>
              <AlertTriangle className="h-4 w-4" /> Mark damaged
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAdjust("returned")}>
              <RotateCcw className="h-4 w-4" /> Return item
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openAdjust("manual_increase")}>
              <SlidersHorizontal className="h-4 w-4" /> Manual correction
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AdjustmentDialog
        productId={row.id}
        productName={row.name}
        onHand={row.on_hand}
        open={open}
        onOpenChange={setOpen}
        initialType={initialType}
      />
    </>
  );
}
