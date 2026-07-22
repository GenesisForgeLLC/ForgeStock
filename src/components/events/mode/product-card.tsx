"use client";

import Image from "next/image";
import { Package, Star, Zap, SlidersHorizontal, Loader2 } from "lucide-react";
import { formatCents } from "@/lib/money";
import { marginFraction } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type { EventModeProduct, EventModeSettings } from "./types";

export function ProductCard({
  product,
  settings,
  busy,
  onQuickSell,
  onCustom,
}: {
  product: EventModeProduct;
  settings: EventModeSettings;
  busy: boolean;
  onQuickSell: () => void;
  onCustom: () => void;
}) {
  const soldOut = product.quantity_remaining <= 0;
  const low = !soldOut && product.quantity_remaining <= 3;
  const margin = Math.round(marginFraction(product.price_cents, product.unit_cost_cents) * 100);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-3 transition-opacity",
        soldOut ? "border-border/60 opacity-60" : "border-border",
      )}
    >
      <div className="flex gap-3">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {product.image_url ? (
            <Image src={product.image_url} alt="" fill sizes="64px" className="object-cover" unoptimized />
          ) : (
            <Package className="h-6 w-6 text-muted-foreground" />
          )}
          {product.is_favorite && (
            <span className="absolute left-1 top-1 rounded-full bg-black/50 p-0.5">
              <Star className="h-3 w-3 fill-primary text-primary" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-tight">{product.name}</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-primary">
            {formatCents(product.price_cents, settings.currency)}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            cost {formatCents(product.unit_cost_cents, settings.currency)} · {margin}% margin
          </p>
        </div>
        <div className="shrink-0 text-right">
          {soldOut ? (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
              Sold out
            </span>
          ) : (
            <span
              className={cn(
                "text-xl font-bold tabular-nums",
                low ? "text-amber-400" : "text-success",
              )}
            >
              {product.quantity_remaining}
            </span>
          )}
          <p className="text-[10px] text-muted-foreground">left</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={soldOut || busy}
          onClick={onQuickSell}
          className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-colors active:bg-primary/80 disabled:opacity-40"
          aria-label={`Quick sell one ${product.name}`}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
          Sell 1
        </button>
        <button
          type="button"
          disabled={soldOut}
          onClick={onCustom}
          className="flex h-12 w-14 items-center justify-center rounded-lg border border-border bg-secondary text-secondary-foreground transition-colors active:bg-accent disabled:opacity-40"
          aria-label={`Custom sale for ${product.name}`}
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
